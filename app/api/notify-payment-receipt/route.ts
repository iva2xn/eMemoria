import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtAmount(amount: number) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}
function methodLabel(method: string) {
  const map: Record<string, string> = {
    gcash:    'GCash',
    bdo_bank: 'BDO Bank Transfer',
    bpi_bank: 'BPI Bank Transfer',
    cash:     'Cash',
  }
  return map[method] ?? method.replace(/_/g, ' ').toUpperCase()
}
function orNumber(id: string) {
  return id.replace(/-/g, '').slice(-8).toUpperCase()
}

// ── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const {
    paymentId,
    recipientEmail,
    recipientName,
    amount,
    method,
    referenceNumber,
    productLabel,
    productType,
    approvedAt,
    createdAt,
    notes,
  } = await req.json()

  if (!paymentId || !recipientEmail || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const orNo       = orNumber(paymentId)
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const paymentsUrl = `${siteUrl}/payments`
  const issuedDate = approvedAt ? fmtDateTime(approvedAt) : fmtDate(createdAt)
  const displayName = recipientName ?? 'Valued Client'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Official Receipt — eMemoria</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

        <!-- Header bar -->
        <tr><td style="background:#15803d;padding:4px 0;"></td></tr>

        <!-- Brand -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1a1a1a;letter-spacing:0.02em;">eMemoria Funeral Services</p>
            <p style="margin:0;font-size:11px;color:#6b7280;">Sariaya, Quezon &nbsp;·&nbsp; +63 918 901 9978 &nbsp;·&nbsp; support@ememoria.site</p>
          </td>
        </tr>

        <!-- PAID stamp + title -->
        <tr>
          <td style="padding:24px 32px 0;text-align:center;">
            <span style="display:inline-block;border:2px solid #15803d;border-radius:6px;padding:4px 18px;font-size:13px;font-weight:bold;color:#15803d;letter-spacing:0.12em;">PAID</span>
            <h1 style="margin:10px 0 4px;font-size:20px;color:#1a1a1a;font-weight:bold;">Official Receipt</h1>
            <p style="margin:0;font-size:12px;color:#6b7280;">O.R. No. <strong style="color:#1a1a1a;">${orNo}</strong></p>
          </td>
        </tr>

        <!-- Receipt body -->
        <tr>
          <td style="padding:24px 32px;">

            <!-- Client greeting -->
            <p style="font-size:15px;color:#1a1a1a;margin:0 0 20px;">Dear <strong>${displayName}</strong>,</p>
            <p style="font-size:14px;color:#374151;margin:0 0 24px;line-height:1.6;">
              We have received your payment and it has been <strong style="color:#15803d;">approved</strong> by our staff.
              Below is your official receipt for your records.
            </p>

            <!-- Receipt table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9fafb;">
                <td colspan="2" style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">Payment Details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;width:44%;">Service</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:bold;color:#1a1a1a;border-bottom:1px solid #f3f4f6;">${productLabel ?? productType ?? '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Payment Method</td>
                <td style="padding:10px 16px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #f3f4f6;">${methodLabel(method)}</td>
              </tr>
              ${referenceNumber ? `
              <tr>
                <td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Reference No.</td>
                <td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#1a1a1a;border-bottom:1px solid #f3f4f6;">${referenceNumber}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Date Approved</td>
                <td style="padding:10px 16px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #f3f4f6;">${issuedDate}</td>
              </tr>
              ${notes ? `
              <tr>
                <td style="padding:10px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Notes</td>
                <td style="padding:10px 16px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${notes}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 16px;font-size:12px;color:#6b7280;">O.R. No.</td>
                <td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#1a1a1a;">${orNo}</td>
              </tr>
            </table>

            <!-- Total box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #1a1a1a;border-radius:8px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Total Amount Received</p>
                  <p style="margin:0;font-size:28px;font-weight:bold;color:#15803d;">${fmtAmount(amount)}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${paymentsUrl}"
                style="display:inline-block;background:#15803d;color:#ffffff;padding:13px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">
                View My Payments →
              </a>
            </div>

            <!-- Footer note -->
            <p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;">
              If you have any questions about this receipt, contact us at
              <a href="mailto:support@ememoria.site" style="color:#15803d;">support@ememoria.site</a>
              or call <strong>+63 918 901 9978</strong> (available 24/7).
            </p>

          </td>
        </tr>

        <!-- Footer bar -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              eMemoria · Marcelo P. Gayeta Funeral Services · Sariaya, Quezon, Philippines
            </p>
            <p style="margin:4px 0 0;font-size:10px;color:#d1d5db;">
              This is a system-generated receipt. Please keep this email for your records.
            </p>
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
      from:    'eFuneraria — M.P. Gayeta Funeral Services <noreply@ememoria.site>',
      to:      recipientEmail,
      subject: `✅ Payment Receipt — O.R. No. ${orNo} — eMemoria`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[notify-payment-receipt]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 },
    )
  }
}
