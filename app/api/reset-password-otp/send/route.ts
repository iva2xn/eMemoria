import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

interface OtpEntry { code: string; expiresAt: number }
declare global { var resetPasswordOtps: Map<string, OtpEntry> | undefined }
const otpStore: Map<string, OtpEntry> =
  globalThis.resetPasswordOtps ?? (globalThis.resetPasswordOtps = new Map())

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6-digit
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const key = email.toLowerCase().trim()

  // Verify the email exists in our system
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: profile } = await db
    .from('profiles')
    .select('name')
    .eq('email', key)
    .maybeSingle()

  // Always respond OK even if email not found — don't leak account existence
  if (!profile) {
    return NextResponse.json({ ok: true })
  }

  const code = generateOtp()
  otpStore.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS })

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
              We received a request to reset your eMemoria account password.
              Use the code below to continue. It expires in <strong>10 minutes</strong>.
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <div style="display:inline-block;background:#f0f7f3;border:2px solid #15803d;border-radius:12px;padding:20px 40px;">
                <p style="margin:0 0 4px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;">Reset Code</p>
                <p style="margin:0;font-size:36px;font-weight:bold;font-family:monospace;letter-spacing:0.25em;color:#15803d;">${code}</p>
              </div>
            </div>
            <p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;text-align:center;">
              If you did not request a password reset, you can safely ignore this email.
              Your password will not change.
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
      to:      key,
      subject: `${code} is your eMemoria password reset code`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[reset-password-otp/send]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
