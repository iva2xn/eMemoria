import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS so we can update notified_at
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { availmentId, status, recipientEmail, recipientName, packageLabel, packagePrice, productType, rejectionReason } =
    await req.json()

  if (!availmentId || !status || !recipientEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const isApproved = status === 'approved'

  // Build billing URL with full context so the billing page can pre-fill correctly
  const billingParams = new URLSearchParams({ document_submission_id: availmentId })
  if (productType)  billingParams.set('product', productType)
  if (packageLabel) billingParams.set('label', packageLabel)
  if (packagePrice) billingParams.set('price', String(packagePrice))
  const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/billing?${billingParams.toString()}`

  const subject = isApproved
    ? '✅ Your Documents Have Been Approved — eFuneraria'
    : '❌ Your Document Submission Was Not Approved — eFuneraria'

  const html = isApproved
    ? `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #15803d;">Documents Approved</h2>
          <p style="margin: 0; font-size: 14px; color: #166534;">Your documents have been verified by our staff.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${recipientName ?? 'Valued Client'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          We are pleased to inform you that your document submission for
          <strong>${packageLabel ?? 'the selected package'}</strong> has been
          <strong style="color: #16a34a;">approved</strong>.
        </p>
        <p style="font-size: 15px; line-height: 1.6;">
          You may now proceed to the payment portal to complete your reservation.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${billingUrl}"
            style="background: #15803d; color: white; padding: 14px 32px; border-radius: 8px;
                   text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
            Proceed to Payment →
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
          If you have any questions, please contact us at
          <a href="mailto:support@ememoria.site" style="color: #15803d;">support@ememoria.site</a>
          or call <strong>+63 918 901 9978</strong> (available 24/7).
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          eFuneraria · Marcelo P. Gayeta Funeral Services · Sariaya, Quezon, Philippines
        </p>
      </div>
    `
    : `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #b91c1c;">Document Submission Not Approved</h2>
          <p style="margin: 0; font-size: 14px; color: #991b1b;">Our staff was unable to verify your submitted documents.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">Dear <strong>${recipientName ?? 'Valued Client'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Unfortunately, your document submission for
          <strong>${packageLabel ?? 'the selected package'}</strong> was
          <strong style="color: #dc2626;">not approved</strong>.
        </p>
        ${rejectionReason ? `
        <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Reason</p>
          <p style="margin: 0; font-size: 14px; color: #374151;">${rejectionReason}</p>
        </div>` : ''}
        <p style="font-size: 15px; line-height: 1.6;">
          Please contact our office so we can assist you in resubmitting the correct documents.
        </p>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
          Contact us at
          <a href="mailto:support@ememoria.site" style="color: #15803d;">support@ememoria.site</a>
          or call <strong>+63 918 901 9978</strong> (available 24/7).
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          eFuneraria · Marcelo P. Gayeta Funeral Services · Sariaya, Quezon, Philippines
        </p>
      </div>
    `

  try {
    await resend.emails.send({
      from: 'eFuneraria — M.P. Gayeta Funeral Services <noreply@ememoria.site>',
      to: recipientEmail,
      subject,
      html,
    })

    // Mark as notified so we don't double-send
    await supabaseAdmin
      .from('document_submissions')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', availmentId)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[notify-document-submission]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
