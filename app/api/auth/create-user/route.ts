import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createHmac }                from 'crypto'

// Declare the OTP store type (shared with register-otp routes)
declare global {
  var registerOtps: Map<string, { code: string; expiresAt: number }> | undefined
}

// Server-side admin client — uses service role key, never exposed to browser
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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

    // ── Create user with admin client (bypasses email confirmation) ──
    // We use generateLink('signup') to get a one-time token, then immediately
    // create the user via the link exchange. This avoids GoTrue sending any
    // confirmation email entirely since we handle email verification via OTP.
    // Actually the simplest path: createUser with email_confirm:true and
    // suppress the mailer by inserting directly via the DB admin client.
    const admin = createAdminClient()

    // Insert directly into auth.users via the service-role client to bypass
    // GoTrue's email-sending logic completely.
    // We still use admin.auth.admin.createUser but immediately patch the
    // mailer issue by catching the specific error and retrying without email.
    let userData: { id: string } | null = null

    const { data, error } = await admin.auth.admin.createUser({
      email:         email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        name:           fullName,
        first_name:     firstName.trim(),
        middle_initial: middleInit?.trim() || null,
        last_name:      lastName.trim(),
        suffix:         suffix?.trim()  || null,
        phone:          phone?.trim()   || null,
      },
    })

    if (error) {
      const msg  = error.message?.toLowerCase() ?? ''
      const code = (error as { code?: string }).code ?? ''

      console.error('[create-user] createUser raw error:', JSON.stringify({ message: error.message, code, status: (error as {status?: number}).status }))

      if (
        msg.includes('already registered') || msg.includes('already been taken') ||
        msg.includes('already exists')     || msg.includes('unique') ||
        msg.includes('duplicate')          || msg.includes('user already') ||
        msg.includes('email address is already') ||
        code === 'email_exists'            || code === '23505'
      ) {
        return NextResponse.json({ error: 'email_taken' }, { status: 409 })
      }

      // For any error (including mailer errors), check if the user was actually
      // created before failing — GoTrue creates the DB row before sending email.
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
      if (existing?.id) {
        // User exists — mailer failed but account was created, proceed normally
        console.warn('[create-user] createUser error but user exists, continuing:', error.message)
        userData = { id: existing.id }
      } else {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    } else {
      userData = { id: data.user.id }
    }

    // ── Ensure email_confirmed_at is set (no email side-effect) ──
    // createUser with email_confirm:true should already set this, but some
    // Supabase project configs override it. We patch auth.users directly via
    // the service-role DB client — this writes to the DB with zero emails sent.
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
