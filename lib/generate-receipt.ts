/**
 * generate-receipt.ts
 * Formal official receipt — A5 portrait.
 * Clean two-column layout with company header, OR details,
 * item breakdown, total box, and signature block.
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
    package: 'Traditional Burial Package', cremation: 'Cremation Service',
    urn: 'Memorial Urn', columbarium: 'Columbarium Slot',
    wake_extension: 'Wake Extension', addon: 'Service Add-on',
    general: 'General Service',
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
  const W   = 148
  const H   = 210
  const ML  = 10   // margin left
  const MR  = W - 10  // margin right
  const CW  = MR - ML

  // ── Colour palette ───────────────────────────────────────
  const BLACK:   [number,number,number] = [20,  20,  20 ]
  const DARKGN:  [number,number,number] = [22,  78,  50 ]   // deep forest green
  const MIDGN:   [number,number,number] = [34,  107, 66 ]   // primary brand green
  const LGRAY:   [number,number,number] = [100, 100, 100]
  const MGRAY:   [number,number,number] = [160, 160, 160]
  const BGRAY:   [number,number,number] = [245, 245, 245]
  const WHITE:   [number,number,number] = [255, 255, 255]
  const BGGN:    [number,number,number] = [240, 248, 244]   // very light green

  doc.setTextColor(...BLACK)
  doc.setDrawColor(...BLACK)

  const issuedDate  = payment.approved_at ? fmtLong(payment.approved_at) : fmtLong(payment.created_at)
  const clientName  = resolveName(payment)
  const clientEmail = resolveEmail(payment)
  const OR          = orNumber(payment)

  // ── Outer border ─────────────────────────────────────────
  doc.setLineWidth(0.5)
  doc.setDrawColor(...MIDGN)
  doc.rect(6, 6, W - 12, H - 12)
  doc.setDrawColor(...DARKGN)
  doc.setLineWidth(0.2)
  doc.rect(7.5, 7.5, W - 15, H - 15)

  // ── Header bar (green background) ────────────────────────
  doc.setFillColor(...MIDGN)
  doc.roundedRect(6, 6, W - 12, 36, 3, 3, 'F')
  // Square off the bottom corners
  doc.rect(6, 30, W - 12, 12, 'F')

  // Logo
  try {
    const res  = await fetch('/logo.png')
    const blob = await res.blob()
    const b64  = await new Promise<string>(resolve => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.readAsDataURL(blob)
    })
    doc.addImage(b64, 'PNG', ML + 2, 10, 18, 18)
  } catch { /* skip */ }

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.text('eMEMORIA', ML + 24, 21)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(210, 235, 220)
  doc.text('FUNERAL SERVICES', ML + 24, 27)

  // "OFFICIAL RECEIPT" label on the right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text('OFFICIAL RECEIPT', MR, 21, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(210, 235, 220)
  doc.text('Sariaya, Quezon  •  support@ememoria.site', MR, 27, { align: 'right' })

  let y = 46

  // ── OR No. & Date row ────────────────────────────────────
  doc.setFillColor(...BGGN)
  doc.rect(ML, y - 2, CW, 10, 'F')
  doc.setDrawColor(...MIDGN)
  doc.setLineWidth(0.3)
  doc.line(ML, y + 8, MR, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...LGRAY)
  doc.text('OR No.', ML + 2, y + 3)
  doc.text('Date Issued', W / 2 + 2, y + 3)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARKGN)
  doc.text(OR, ML + 16, y + 3)
  doc.text(issuedDate, W / 2 + 20, y + 3)

  // Vertical divider
  doc.setDrawColor(...MIDGN)
  doc.setLineWidth(0.2)
  doc.line(W / 2, y - 2, W / 2, y + 8)

  y += 14

  // ── CLIENT SECTION ───────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...MIDGN)
  doc.text('RECEIVED FROM', ML + 1, y)

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BLACK)
  doc.text(clientName, ML + 1, y)

  // Underline
  doc.setDrawColor(...MGRAY)
  doc.setLineWidth(0.3)
  doc.line(ML, y + 1.5, MR, y + 1.5)

  if (clientEmail) {
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...LGRAY)
    doc.text(clientEmail, ML + 1, y)
  }
  if (payment.guest_phone) {
    const xPhone = clientEmail ? ML + 70 : ML + 1
    const yPhone = clientEmail ? y : y + 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...LGRAY)
    doc.text(payment.guest_phone, xPhone, y)
  }

  y += 10

  // ── PAYMENT DETAILS SECTION ──────────────────────────────
  // Light green label bar
  doc.setFillColor(...BGGN)
  doc.setDrawColor(...MIDGN)
  doc.setLineWidth(0.2)
  doc.rect(ML, y - 2, CW, 7, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...MIDGN)
  doc.text('PAYMENT DETAILS', ML + 2, y + 3)

  y += 10

  // Two-column detail rows
  const detailRows = [
    { label: 'Payment Method', value: methodLabel(payment.method) },
    { label: 'Reference No.',  value: payment.reference_number ?? '—' },
    { label: 'Service',        value: serviceLabel(payment) },
    { label: 'Status',         value: payment.status.toUpperCase() },
  ]

  detailRows.forEach((row, i) => {
    const isEven = i % 2 === 0
    if (isEven) {
      doc.setFillColor(...BGRAY)
      doc.rect(ML, y - 3, CW, 7.5, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...LGRAY)
    doc.text(row.label, ML + 2, y + 1)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BLACK)
    // If value is too long, clip it
    const maxW = CW - 42
    const lines = doc.splitTextToSize(row.value, maxW) as string[]
    doc.text(lines[0], ML + 38, y + 1)

    y += 8
  })

  y += 4

  // ── TOTAL BOX ────────────────────────────────────────────
  const BOX_H  = 22
  const BOX_Y  = H - 58

  // Green left accent bar
  doc.setFillColor(...MIDGN)
  doc.rect(ML, BOX_Y, 3, BOX_H, 'F')

  // Box outline
  doc.setFillColor(...BGGN)
  doc.setDrawColor(...MIDGN)
  doc.setLineWidth(0.4)
  doc.rect(ML, BOX_Y, CW, BOX_H, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...LGRAY)
  doc.text('TOTAL AMOUNT', ML + 6, BOX_Y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...MGRAY)
  doc.text('Philippine Peso', ML + 6, BOX_Y + 14)

  // Amount — large and right-aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...DARKGN)
  doc.text(fmtPeso(payment.amount), MR - 2, BOX_Y + 15, { align: 'right' })

  // ── PAID stamp ───────────────────────────────────────────
  if (payment.status === 'approved') {
    const sx = MR - 30
    const sy = BOX_Y - 18
    const sw = 28
    const sh = 14

    // Stamp background
    doc.setFillColor(240, 255, 245)
    doc.roundedRect(sx, sy, sw, sh, 2, 2, 'F')

    doc.setDrawColor(...MIDGN)
    doc.setLineWidth(1.0)
    doc.roundedRect(sx, sy, sw, sh, 2, 2, 'S')
    doc.setLineWidth(0.4)
    doc.roundedRect(sx + 1.2, sy + 1.2, sw - 2.4, sh - 2.4, 1.5, 1.5, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...MIDGN)
    doc.text('PAID', sx + sw / 2, sy + 7.5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...LGRAY)
    doc.text(issuedDate, sx + sw / 2, sy + 12, { align: 'center' })
  }

  // ── SIGNATURE BLOCK ──────────────────────────────────────
  const SIG_Y   = BOX_Y + BOX_H + 8
  const SIG_COL = (CW - 8) / 2
  const S1X     = ML
  const S2X     = ML + SIG_COL + 8
  const LINE_Y  = SIG_Y + 14

  doc.setDrawColor(...MGRAY)
  doc.setLineWidth(0.4)
  doc.line(S1X,       LINE_Y, S1X + SIG_COL,       LINE_Y)
  doc.line(S2X,       LINE_Y, S2X + SIG_COL,       LINE_Y)

  // Pre-fill client name above their line in light gray
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MGRAY)
  doc.text(clientName, S1X + SIG_COL / 2, LINE_Y - 3, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...LGRAY)
  doc.text('Client / Authorized Representative', S1X + SIG_COL / 2, LINE_Y + 5, { align: 'center' })
  doc.text('Cashier / Prepared by', S2X + SIG_COL / 2, LINE_Y + 5, { align: 'center' })

  // ── FOOTER ───────────────────────────────────────────────
  const FT_Y = H - 16
  // Thin divider
  doc.setDrawColor(...MIDGN)
  doc.setLineWidth(0.5)
  doc.line(ML, FT_Y - 5, MR, FT_Y - 5)
  doc.setLineWidth(0.15)
  doc.line(ML, FT_Y - 3.5, MR, FT_Y - 3.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...MGRAY)
  doc.text(
    'This is an official computer-generated receipt. Keep this for your records.',
    W / 2, FT_Y, { align: 'center' },
  )
  doc.text(
    `Generated: ${fmtTimestamp(new Date().toISOString())}   •   OR No. ${OR}`,
    W / 2, FT_Y + 4.5, { align: 'center' },
  )

  // ── Save ─────────────────────────────────────────────────
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)
  doc.save(`OR_${OR}_${safeName}.pdf`)
}
