import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

declare global { var emailChangeOtps: Map<string, { code: string; newEmail: string; expiresAt: number }> | undefined }
const otpStore = globalThis.emailChangeOtps ?? (globalThis.emailChangeOtps = new Map())

export async function POST(req: NextRequest) {
  const { userId, code } = await req.json()
  if (!userId || !code) {
    return NextResponse.json({ error: 'Missing userId or code' }, { status: 400 })
  }

  const entry = otpStore.get(userId)
  if (!entry) {
    return NextResponse.json({ error: 'No pending email change for this account.' }, { status: 400 })
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(userId)
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
  }
  if (code.trim() !== entry.code) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  // ── Code matches — apply the email change via service role ────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    email: entry.newEmail,
    email_confirm: true,
  })
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  // Sync profiles table
  await supabase.from('profiles').update({ email: entry.newEmail }).eq('id', userId)

  otpStore.delete(userId)
  return NextResponse.json({ ok: true, newEmail: entry.newEmail })
}
