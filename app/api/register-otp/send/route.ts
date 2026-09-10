import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// ── In-memory OTP store keyed by email (pre-registration) ─────
interface OtpEntry { code: string; expiresAt: number }
declare global { var registerOtps: Map<string, OtpEntry> | undefined }
const otpStore: Map<string, OtpEntry> =
  globalThis.registerOtps ?? (globalThis.registerOtps = new Map())

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const code = generateOtp()
  const key  = email.toLowerCase().trim()
  otpStore.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS })

  const resend = new Resend(process.env.RESEND_API_KEY)

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
            <p style="font-size:15px;color:#1a1a1a;margin:0 0 8px;">Hello,</p>
            <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
              Use the code below to verify your email address for your new eMemoria account.
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
              If you did not request this, you can safely ignore this email.
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
      from:    'eMemoria Funeral Services <noreply@ememoria.site>',
      to:      key,
      subject: `${code} is your eMemoria verification code`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[register-otp/send]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 },
    )
  }
}
