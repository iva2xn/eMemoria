import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createHmac }                from 'crypto'

// Declare the OTP store type (shared with register-otp routes)
declare global {
  var registerOtps: Map<string, { code: string; expiresAt: number }> | undefined
}

/**
 * Verify the signed token issued by register-otp/verify.
 * Token format (base64url): "email:expiresAt|hmac-sig"
 */
function verifySignedToken(email: string, token: string): boolean {
  try {
    const secret  = process.env.OTP_SIGN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret'
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const lastPipe = decoded.lastIndexOf('|')
    if (lastPipe === -1) return false
    const payload   = decoded.slice(0, lastPipe)
    const sig       = decoded.slice(lastPipe + 1)
    const expected  = createHmac('sha256', secret).update(payload).digest('hex')
    // Constant-time comparison
    if (sig.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    if (diff !== 0) return false
    // Check email and expiry embedded in payload
    const [payloadEmail, expiresAtStr] = payload.split(':')
    if (payloadEmail !== email.toLowerCase().trim()) return false
    if (Date.now() > Number(expiresAtStr)) return false
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      firstName,
      middleInit,
      lastName,
      suffix,
      phone,
      otpVerifiedToken,
    } = await req.json()

    // ── Required field checks ─────────────────────────────────
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    // ── Re-verify OTP was completed ───────────────────────────
    // Prefer the signed token (works across serverless instances).
    // Fall back to in-memory store for requests from older clients.
    const key      = email.toLowerCase().trim()
    let otpOk = false

    if (otpVerifiedToken) {
      otpOk = verifySignedToken(email, otpVerifiedToken)
    }

    if (!otpOk) {
      // In-memory fallback
      const otpStore = globalThis.registerOtps
      const entry    = otpStore?.get(key)
      if (entry && entry.code === '__verified__' && Date.now() <= entry.expiresAt) {
        otpOk = true
      }
    }

    if (!otpOk) {
      return NextResponse.json(
        { error: 'Email verification expired or not completed. Please verify your email again.' },
        { status: 403 }
      )
    }

    // ── Build full name ───────────────────────────────────────
    const fullName = [firstName.trim(), middleInit?.trim(), lastName.trim(), suffix?.trim()]
      .filter(Boolean)
      .join(' ')

    // ── Create user via GoTrue Admin REST API directly ───────────
    // We call the GoTrue endpoint manually so we can pass
    // `suppress_email: true`, which prevents GoTrue from sending
    // any confirmation/welcome email. The JS admin client does not
    // expose this flag, so we use fetch with the service-role key.
    let userData: { id: string } | null = null

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email:          email.trim(),
        password,
        email_confirm:  true,
        suppress_email: true,         // <-- stops GoTrue sending any email
        user_metadata: {
          name:           fullName,
          first_name:     firstName.trim(),
          middle_initial: middleInit?.trim() || null,
          last_name:      lastName.trim(),
          suffix:         suffix?.trim()  || null,
          phone:          phone?.trim()   || null,
        },
      }),
    })

    const createJson = await createRes.json()
    const data  = createRes.ok ? { user: createJson } : null
    const error = createRes.ok ? null : createJson

    if (error) {
      const msg  = (error.message ?? error.msg ?? JSON.stringify(error)).toLowerCase()
      const code = error.code ?? error.error_code ?? ''

      console.error('[create-user] createUser raw error:', JSON.stringify(error))

      if (
        msg.includes('already registered') || msg.includes('already been taken') ||
        msg.includes('already exists')     || msg.includes('unique') ||
        msg.includes('duplicate')          || msg.includes('user already') ||
        msg.includes('email address is already') ||
        code === 'email_exists'            || code === '23505'
      ) {
        return NextResponse.json({ error: 'email_taken' }, { status: 409 })
      }

      // Fallback: check if the user was actually created before failing
      const listRes  = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      })
      const listJson = await listRes.json()
      const existing = (listJson?.users ?? []).find(
        (u: { email?: string; id?: string }) => u.email?.toLowerCase() === email.toLowerCase().trim()
      )
      if (existing?.id) {
        console.warn('[create-user] createUser error but user exists, continuing:', msg)
        userData = { id: existing.id }
      } else {
        return NextResponse.json({ error: typeof error.message === 'string' ? error.message : 'Failed to create user.' }, { status: 400 })
      }
    } else {
      userData = { id: data!.user.id }
    }

    // ── Ensure email_confirmed_at is set ─────────────────────────
    const userId = userData.id
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { error: patchError } = await db
      .schema('auth')
      .from('users')
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq('id', userId)
      .is('email_confirmed_at', null)   // only patch if still unconfirmed

    if (patchError) {
      // Non-fatal — createUser may have already confirmed the email
      console.warn('[create-user] patch email_confirmed_at:', patchError.message)
    }

    // ── Clean up OTP entry from in-memory store ──────────────
    globalThis.registerOtps?.delete(key)

    return NextResponse.json({ ok: true, userId })
  } catch (err: unknown) {
    console.error('[create-user]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}
