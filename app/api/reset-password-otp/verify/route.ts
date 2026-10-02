import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

declare global { var resetPasswordOtps: Map<string, { code: string; expiresAt: number }> | undefined }
const otpStore = globalThis.resetPasswordOtps ?? (globalThis.resetPasswordOtps = new Map())

/** 15-minute signed token so the password-update step can verify without shared memory */
function signVerifiedToken(email: string): string {
  const secret    = process.env.OTP_SIGN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret'
  const expiresAt = Date.now() + 15 * 60 * 1000
  const payload   = `reset:${email.toLowerCase().trim()}:${expiresAt}`
  const sig       = createHmac('sha256', secret).update(payload).digest('hex')
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
    return NextResponse.json({ error: 'No reset code found. Please request a new one.' }, { status: 400 })
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key)
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
  }
  if (code.trim() !== entry.code) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  otpStore.delete(key)

  const verifiedToken = signVerifiedToken(email)
  return NextResponse.json({ ok: true, verifiedToken })
}
