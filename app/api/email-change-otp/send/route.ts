import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ── In-memory OTP store ────────────────────────────────────────
// Maps  userId → { code, newEmail, expiresAt }
// Fine for single-instance deployments (serverless cold-start clears it,
// which just means the user has to re-request — harmless).
interface OtpEntry { code: string; newEmail: string; expiresAt: number }
declare global { var emailChangeOtps: Map<string, OtpEntry> | undefined }
const otpStore: Map<string, OtpEntry> =
  globalThis.emailChangeOtps ?? (globalThis.emailChangeOtps = new Map())

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6-digit
}

export async function POST(req: NextRequest) {
  const { userId, newEmail } = await req.json()
  if (!userId || !newEmail) {
    return NextResponse.json({ error: 'Missing userId or newEmail' }, { status: 400 })
  }

  // ── Verify the requester is who they say they are ─────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .single()
  if (profErr || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // ── Generate & store OTP ──────────────────────────────────────
  const code = generateOtp()
  otpStore.set(userId, { code, newEmail: newEmail.toLowerCase().trim(), expiresAt: Date.now() + OTP_TTL_MS })

  // ── Send via Resend ───────────────────────────────────────────
  const resend = new Resend(process.env.RESEND_API_KEY)
  const displayName = profile.name ?? 'Valued Client'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#15803d;padding:4px 0;"></td></tr>
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1a1a1a;">eMemoria Funeral Services</p>
            <p style="margin:0;font-size:11px;color:#6b7280;">Sariaya, Quezon &nbsp;·&nbsp; support@ememoria.site</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <p style="font-size:15px;color:#1a1a1a;margin:0 0 8px;">Dear <strong>${displayName}</strong>,</p>
            <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
              You requested to change your email address to
              <strong style="color:#1a1a1a;">${newEmail}</strong>.
              Use the code below to confirm this change.
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <div style="display:inline-block;background:#f0f7f3;border:2px solid #15803d;border-radius:12px;padding:20px 40px;">
                <p style="margin:0 0 4px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;">Verification Code</p>
                <p style="margin:0;font-size:36px;font-weight:bold;font-family:monospace;letter-spacing:0.25em;color:#15803d;">${code}</p>
              </div>
            </div>
            <p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0 0 8px;text-align:center;">
              This code expires in <strong>10 minutes</strong>.
            </p>
            <p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;text-align:center;">
              If you didn&apos;t request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              eMemoria · Marcelo P. Gayeta Funeral Services · Sariaya, Quezon, Philippines
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from:    'eFuneraria — M.P. Gayeta Funeral Services <noreply@ememoria.site>',
      to:      newEmail.trim(),
      subject: `${code} is your eMemoria email verification code`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[email-change-otp/send]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 },
    )
  }
}
