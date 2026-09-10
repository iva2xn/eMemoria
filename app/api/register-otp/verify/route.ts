import { NextRequest, NextResponse } from 'next/server'

declare global { var registerOtps: Map<string, { code: string; expiresAt: number }> | undefined }
const otpStore = globalThis.registerOtps ?? (globalThis.registerOtps = new Map())

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

  // Mark as verified — keep entry so register page can confirm it was verified
  otpStore.set(key, { ...entry, code: '__verified__', expiresAt: Date.now() + 15 * 60 * 1000 })
  return NextResponse.json({ ok: true })
}
