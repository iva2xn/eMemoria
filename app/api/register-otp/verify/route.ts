import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'

declare global { var registerOtps: Map<string, { code: string; expiresAt: number }> | undefined }
const otpStore = globalThis.registerOtps ?? (globalThis.registerOtps = new Map())

/** 15-minute signed token so create-user can verify without shared in-memory state */
function signVerifiedToken(email: string): string {
  const secret    = process.env.OTP_SIGN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret'
  const expiresAt = Date.now() + 15 * 60 * 1000
  const payload   = `${email.toLowerCase().trim()}:${expiresAt}`
  const sig       = createHmac('sha256', secret).update(payload).digest('hex')
  // base64url-encode "payload|sig" so it's safe in JSON
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
  }

  const key   = email.toLowerCase().trim()
  const entry = otpStore.get(key)

  if (!entry) {
    return NextResponse.json({ error: 'No OTP found. Please request a new code.' }, { status: 400 })
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key)
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
  }
  if (code.trim() !== entry.code) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  // Mark as verified in the in-memory store (works in single-process dev)
  otpStore.set(key, { ...entry, code: '__verified__', expiresAt: Date.now() + 15 * 60 * 1000 })

  // Also issue a signed token that works across serverless instances
  const verifiedToken = signVerifiedToken(email)
  return NextResponse.json({ ok: true, verifiedToken })
}
