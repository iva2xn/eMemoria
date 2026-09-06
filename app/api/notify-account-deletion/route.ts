import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const {
    recipientEmail,
    recipientName,
    role,           // 'client' | 'staff'
    reason,
    deletedByName,
    emailBody,      // custom body chosen/edited by admin in the UI
    includeRecovery, // boolean — whether to include account recovery link
  } = await req.json()

  if (!recipientEmail || !recipientName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const recoveryUrl = `${siteUrl}/auth/login`
  const isStaff     = role === 'staff'

  // Build a simple but professional inquiry so admin can track recovery
  // in Inquiries > Account Recovery (subject must contain "account recovery")
  const inquirySubject = 'Account Recovery Request'

  const recoverySection = includeRecovery ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#15803d;">Account Recovery</p>
      <p style="margin:0 0 10px;font-size:14px;color:#1a1a1a;line-height:1.6;">
        If you believe this was a mistake or would like to recover your account, you can submit a recovery request by replying to this email or by using the button below.
      </p>
      <div style="text-align:center;margin-top:12px;">
        <a href="mailto:support@ememoria.site?subject=${encodeURIComponent(inquirySubject)}&body=Hello%2C%20I%20would%20like%20to%20recover%20my%20account.%20My%20email%20is%20${encodeURIComponent(recipientEmail)}."
          style="display:inline-block;background:#15803d;color:#fff;padding:11px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">
          Request Account Recovery
        </a>
      </div>
      <p style="margin:10px 0 0;font-size:11px;color:#6b7280;text-align:center;">
        Or email us directly at <a href="mailto:support@ememoria.site" style="color:#15803d;">support@ememoria.site</a>
      </p>
    </div>
  ` : ''

  const staffSpecificNote = isStaff ? `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>Note:</strong> Your staff credentials have been revoked. Please return any company materials or access cards to the office at your earliest convenience.
      </p>
    </div>
  ` : ''

  const subject = isStaff
    ? 'Your eMemoria Staff Account Has Been Closed'
    : 'Your eMemoria Account Has Been Deleted'

  // The admin-composed email body is used as the main message
  const mainBody = emailBody
    ? emailBody.replace(/\n/g, '<br/>')
    : (isStaff
        ? `We are writing to inform you that your staff account at eMemoria Funeral Services has been deactivated.<br/><br/>If you have any questions regarding this matter, please contact our management team.`
        : `We are writing to inform you that your account at eMemoria has been scheduled for deletion as requested.<br/><br/>Your account data will be removed from our system. If you did not request this, please contact us immediately.`)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

        <!-- Top accent bar -->
        <tr><td style="background:#dc2626;padding:4px 0;"></td></tr>

        <!-- Brand -->
        <tr>
          <td style="padding:28px 32px 16px;border-bottom:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1a1a1a;">eMemoria Funeral Services</p>
            <p style="margin:0;font-size:11px;color:#6b7280;">Sariaya, Quezon &nbsp;·&nbsp; +63 918 901 9978 &nbsp;·&nbsp; support@ememoria.site</p>
          </td>
        </tr>

        <!-- Notice header -->
        <tr>
          <td style="padding:20px 32px 0;text-align:center;">
            <div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 20px;">
              <p style="margin:0;font-size:12px;font-weight:bold;color:#dc2626;text-transform:uppercase;letter-spacing:0.1em;">
                ${isStaff ? 'Staff Account Closed' : 'Account Deletion Notice'}
              </p>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 32px 28px;">
            <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px;">
              Dear <strong>${recipientName}</strong>,
            </p>
            <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px;">
              ${mainBody}
            </p>

            ${reason ? `
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin:16px 0;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">Reason</p>
              <p style="margin:0;font-size:13px;color:#374151;">${reason}</p>
            </div>
            ` : ''}

            ${staffSpecificNote}
            ${recoverySection}

            <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:20px 0 0;">
              For inquiries, contact us at
              <a href="mailto:support@ememoria.site" style="color:#15803d;">support@ememoria.site</a>
              or call <strong>+63 918 901 9978</strong> (available 24/7).
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              eMemoria · Marcelo P. Gayeta Funeral Services · Sariaya, Quezon, Philippines
            </p>
            ${deletedByName ? `<p style="margin:4px 0 0;font-size:10px;color:#d1d5db;">Action performed by: ${deletedByName}</p>` : ''}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`

  try {
    await resend.emails.send({
      from: 'eFuneraria — M.P. Gayeta Funeral Services <noreply@ememoria.site>',
      to:   recipientEmail,
      subject,
      html,
    })

    // If recovery is included, also create an inquiry entry in DB for admin tracking
    if (includeRecovery) {
      await supabaseAdmin.from('inquiries').insert({
        name:    recipientName,
        email:   recipientEmail,
        subject: inquirySubject,
        message: `Automated recovery link sent to ${recipientEmail} upon account deletion. Admin: ${deletedByName ?? 'Unknown'}. Reason: ${reason ?? 'Not specified'}.`,
        is_read: false,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[notify-account-deletion]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
