/**
 * generate-receipt.ts
 * Formal black-and-white official receipt (A5 portrait).
 * Classic OR layout with double border, underline fields, boxed total.
 * Fixes: peso symbol rendered as plain text, PAID stamp position anchored correctly.
 */

export interface ReceiptPayload {
  id: string
  reference_number?: string | null
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  profileName?: string
  profileEmail?: string
  product_type: string
  product_ref?: string | null
  method: string
  amount: number
  status: string
  notes?: string | null
  approved_at?: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────
const resolveName  = (p: ReceiptPayload) => p.profileName  ?? p.guest_name  ?? 'Guest'
const resolveEmail = (p: ReceiptPayload) => p.profileEmail ?? p.guest_email ?? ''

function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
// Always use plain ASCII — avoids jsPDF Unicode rendering issues
function fmtPeso(n: number) {
  return 'PHP ' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}
function methodLabel(m: string): string {
  const map: Record<string, string> = {
    gcash: 'GCash', bdo_bank: 'BDO Bank Transfer',
    bpi_bank: 'BPI Bank Transfer', cash: 'Cash',
  }
  return map[m] ?? m.replace(/_/g, ' ').toUpperCase()
}
function serviceLabel(p: ReceiptPayload): string {
  if (p.product_ref) return p.product_ref
  const map: Record<string, string> = {
    package: 'Funeral Package', cremation: 'Cremation Service',
    urn: 'Urn', columbarium: 'Columbarium Slot', general: 'General Service',
  }
  return map[p.product_type] ?? p.product_type
}
function orNumber(p: ReceiptPayload): string {
  return p.id.replace(/-/g, '').slice(-8).toUpperCase()
}

// ── Main ──────────────────────────────────────────────────────
export async function generateReceipt(payment: ReceiptPayload): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  // A5 portrait: 148 x 210 mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const W  = 148
  const H  = 210
  const L  = 12
  const R  = W - 12
  const CW = R - L

  const BLACK: [number,number,number] = [0,   0,   0  ]
  const GRAY:  [number,number,number] = [80,  80,  80 ]
  const LGRAY: [number,number,number] = [150, 150, 150]
  const LLGRAY:[number,number,number] = [220, 220, 220]

  doc.setTextColor(...BLACK)
  doc.setDrawColor(...BLACK)

  const issuedDate  = payment.approved_at ? fmtLong(payment.approved_at) : fmtLong(payment.created_at)
  const clientName  = resolveName(payment)
  const clientEmail = resolveEmail(payment)
  const OR          = orNumber(payment)

  // ── Outer + inner border ─────────────────────────────────
  doc.setLineWidth(0.6)
  doc.rect(8, 8, W - 16, H - 16)
  doc.setLineWidth(0.2)
  doc.rect(9.5, 9.5, W - 19, H - 19)

  let y = 22

  // ── Logo ────────────────────────────────────────────────
  try {
    const res  = await fetch('/logo.png')
    const blob = await res.blob()
    const b64  = await new Promise<string>(resolve => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.readAsDataURL(blob)
    })
    doc.addImage(b64, 'PNG', L, y - 7, 16, 16)
  } catch { /* skip */ }

  // ── Company header ───────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BLACK)
  doc.text('eMemoria FUNERAL SERVICES', W / 2, y, { align: 'center' })
  y += 5.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Sariaya, Quezon  |  +63 918 901 9978  |  support@ememoria.site', W / 2, y, { align: 'center' })
  y += 4

  // Heavy + thin double rule
  doc.setTextColor(...BLACK)
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.8)
  doc.line(L, y + 2, R, y + 2)
  doc.setLineWidth(0.2)
  doc.line(L, y + 4, R, y + 4)

  // ── Title ────────────────────────────────────────────────
  y += 11
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('OFFICIAL RECEIPT', W / 2, y, { align: 'center' })
  y += 2

  // ── OR No. + Date ────────────────────────────────────────
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('O.R. No.:', L, y)
  doc.text('Date:', R - 28, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLACK)
  doc.text(OR, L + 18, y)
  doc.text(issuedDate, R, y, { align: 'right' })

  y += 3
  doc.setLineWidth(0.25)
  doc.setDrawColor(...LLGRAY)
  doc.line(L, y, R, y)
  doc.setDrawColor(...BLACK)

  // ── Received from ───────────────────────────────────────
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Received from:', L, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)
  doc.text(clientName, L + 30, y)
  y += 5.5

  doc.setLineWidth(0.3)
  doc.setDrawColor(...GRAY)
  doc.line(L + 30, y - 0.5, R, y - 0.5)
  doc.setDrawColor(...BLACK)

  if (clientEmail || payment.guest_phone) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    const contact = [clientEmail, payment.guest_phone].filter(Boolean).join('  |  ')
    doc.text(contact, L + 30, y + 3.5)
    y += 8
  } else {
    y += 3
  }

  // ── The sum of ──────────────────────────────────────────
  y += 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('The sum of:', L, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)
  doc.text(fmtPeso(payment.amount), L + 30, y)

  doc.setLineWidth(0.3)
  doc.setDrawColor(...GRAY)
  doc.line(L + 30, y + 0.5, R, y + 0.5)
  doc.setDrawColor(...BLACK)
  y += 8

  // ── As payment for ──────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('As payment for:', L, y)

  const svcText  = serviceLabel(payment)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)
  const svcLines = doc.splitTextToSize(svcText, CW - 30) as string[]
  svcLines.forEach((line, i) => doc.text(line, L + 30, y + i * 5.5))

  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.3)
  svcLines.forEach((_, i) => doc.line(L + 30, y + i * 5.5 + 0.8, R, y + i * 5.5 + 0.8))
  doc.setDrawColor(...BLACK)

  y += svcLines.length * 5.5 + 3

  // notes field is intentionally omitted — internal staff annotation only

  // ── Payment details ──────────────────────────────────────
  y += 5
  doc.setLineWidth(0.25)
  doc.setDrawColor(...LLGRAY)
  doc.line(L, y, R, y)
  doc.setDrawColor(...BLACK)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Payment Method:', L, y)
  doc.text('Reference No.:', W / 2 + 2, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLACK)
  doc.text(methodLabel(payment.method), L + 30, y)
  doc.text(payment.reference_number ?? '—', W / 2 + 26, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Status:', L, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLACK)
  doc.text(payment.status.toUpperCase(), L + 30, y)

  // ── Total box ────────────────────────────────────────────
  // Fixed position: always starts at a consistent Y, not floating
  const BOX_Y = H - 68
  const BOX_H = 18
  const DIV_X = L + CW * 0.52

  doc.setLineWidth(0.5)
  doc.rect(L, BOX_Y, CW, BOX_H)
  doc.setLineWidth(0.2)
  doc.line(DIV_X, BOX_Y, DIV_X, BOX_Y + BOX_H)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...BLACK)
  doc.text('TOTAL AMOUNT RECEIVED', L + (DIV_X - L) / 2, BOX_Y + 7.5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.text('(Philippine Peso)', L + (DIV_X - L) / 2, BOX_Y + 13, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BLACK)
  doc.text(fmtPeso(payment.amount), DIV_X + (R - DIV_X) / 2, BOX_Y + 11, { align: 'center' })

  // ── PAID stamp — fixed position, top-right of the box ───
  if (payment.status === 'approved') {
    const sx = R - 28
    const sy = BOX_Y - 18   // sits just above the total box, never overlaps
    const sw = 26
    const sh = 14

    doc.setLineWidth(1.2)
    doc.rect(sx, sy, sw, sh)
    doc.setLineWidth(0.4)
    doc.rect(sx + 1, sy + 1, sw - 2, sh - 2)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BLACK)
    doc.text('PAID', sx + sw / 2, sy + 7, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...GRAY)
    doc.text(issuedDate, sx + sw / 2, sy + 12, { align: 'center' })
    doc.setTextColor(...BLACK)
    doc.setLineWidth(0.3)
  }

  // ── Signature block ──────────────────────────────────────
  const SIG_Y    = BOX_Y + BOX_H + 8
  const sigColW  = (CW - 10) / 2
  const sig1X    = L
  const sig2X    = L + sigColW + 10
  const nameY    = SIG_Y + 14

  doc.setLineWidth(0.4)
  doc.setDrawColor(...BLACK)
  doc.line(sig1X, nameY, sig1X + sigColW, nameY)
  doc.line(sig2X, nameY, sig2X + sigColW, nameY)

  // Pre-fill client name in light gray above their line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...LGRAY)
  doc.text(clientName, sig1X + sigColW / 2, nameY - 3, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.text('Client / Authorized Representative', sig1X + sigColW / 2, nameY + 4.5, { align: 'center' })
  doc.text('Prepared / Received by', sig2X + sigColW / 2, nameY + 4.5, { align: 'center' })

  // ── Footer double rule ───────────────────────────────────
  doc.setLineWidth(0.8)
  doc.setDrawColor(...BLACK)
  doc.line(L, H - 22, R, H - 22)
  doc.setLineWidth(0.2)
  doc.line(L, H - 20, R, H - 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text(
    'This is an official computer-generated receipt. Please keep this for your records.',
    W / 2, H - 15.5, { align: 'center' },
  )
  doc.text(
    `Generated: ${fmtTimestamp(new Date().toISOString())}   |   OR No. ${OR}`,
    W / 2, H - 11, { align: 'center' },
  )

  // ── Save ─────────────────────────────────────────────────
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)
  doc.save(`OR_${OR}_${safeName}.pdf`)
}
