import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { to, toName, subject, body, staffName } = await req.json()

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const senderName = staffName ?? 'M. P. Gayeta Funeral Services'

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #f0f7f3; border-left: 4px solid #226b42; padding: 20px 24px; border-radius: 8px; margin-bottom: 28px;">
        <p style="margin: 0 0 2px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #226b42;">M. P. GAYETA FUNERAL SERVICES</p>
        <p style="margin: 0; font-size: 12px; color: #4a7a5c;">Sariaya, Quezon, Philippines · +63 918 901 9978</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 6px;">Dear <strong>${toName ?? 'Valued Client'}</strong>,</p>

      <div style="font-size: 15px; line-height: 1.8; white-space: pre-wrap; margin: 20px 0 28px;">${body.replace(/\n/g, '<br/>')}</div>

      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Respectfully,<br/>
        <strong style="color: #1a1a1a;">${senderName}</strong><br/>
        <span style="font-size: 12px; color: #6b7280;">M. P. Gayeta Funeral Services</span>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

      <p style="font-size: 12px; color: #9ca3af; line-height: 1.6; text-align: center;">
        This email was sent in response to your inquiry.<br/>
        For further assistance, contact us at
        <a href="mailto:support@ememoria.site" style="color: #226b42;">support@ememoria.site</a>
        or call <strong>+63 918 901 9978</strong>.
      </p>
      <p style="font-size: 11px; color: #d1d5db; text-align: center; margin-top: 12px;">
        eFuneraria · Marcelo P. Gayeta Funeral Services · Sariaya, Quezon, Philippines
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: 'eFuneraria — M.P. Gayeta Funeral Services <noreply@ememoria.site>',
      to,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[reply-inquiry]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
