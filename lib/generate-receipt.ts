/**
 * generate-receipt.ts
 * Exact replica of standard Philippine "SERVICE INVOICE" / Non-VAT Receipt.
 * Layout: A5 Landscape format with left-side settlement table and right-side invoice details.
 */

export interface ReceiptPayload {
  id: string
  reference_number?: string | null
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  guest_address?: string | null
  tin?: string | null
  profileName?: string
  profileEmail?: string
  product_type: string
  product_ref?: string | null
  method: string
  amount: number
  withholding_tax?: number
  status: string
  notes?: string | null
  approved_at?: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────
const resolveName = (p: ReceiptPayload) => p.profileName ?? p.guest_name ?? ''

/** Extracts the addon total stored in the notes field, e.g. "Add-ons total: ₱5,000.00" */
function extractAddonTotal(notes: string | null | undefined): number {
  if (!notes) return 0
  const match = notes.match(/Add-ons total:\s*₱([\d,]+(?:\.\d+)?)/i)
  if (!match) return 0
  return parseFloat(match[1].replace(/,/g, '')) || 0
}

/** Extracts addon line items stored as ADDON_ITEMS:[{n,q,p},...] in notes */
interface AddonItem { n: string; q: number; p: number }
function extractAddonItems(notes: string | null | undefined): AddonItem[] {
  if (!notes) return []
  const match = notes.match(/ADDON_ITEMS:(\[.*?\])/)
  if (!match) return []
  try { return JSON.parse(match[1]) as AddonItem[] } catch { return [] }
}

function fmtCurrencyParts(n: number) {
  const parts = Number(n || 0).toFixed(2).split('.')
  return {
    pesos: Number(parts[0]).toLocaleString('en-PH'),
    cents: parts[1],
    full: Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }
}

function serviceLabel(p: ReceiptPayload): string {
  if (p.product_ref) return p.product_ref
  const map: Record<string, string> = {
    package: 'Traditional Burial Package',
    cremation: 'Cremation Service',
    urn: 'Memorial Urn',
    columbarium: 'Columbarium Slot',
    wake_extension: 'Wake Extension',
    addon: 'Service Add-on',
    general: 'General Services',
  }
  return map[p.product_type] ?? p.product_type
}

function formatInvoiceNo(id: string): string {
  const num = id.replace(/\D/g, '')
  return (num ? num.slice(-4) : '0001').padStart(4, '0')
}

// Converts numbers into words for the "The sum of..." line
function numberToWords(num: number): string {
  if (!num || num === 0) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const scales = ['', 'Thousand', 'Million', 'Billion']

  const splitIntoGroups = (n: number) => {
    const groups: number[] = []
    let temp = Math.floor(n)
    while (temp > 0) {
      groups.push(temp % 1000)
      temp = Math.floor(temp / 1000)
    }
    return groups
  }

  const groupToWords = (g: number): string => {
    let str = ''
    if (g >= 100) {
      str += ones[Math.floor(g / 100)] + ' Hundred '
      g %= 100
    }
    if (g >= 20) {
      str += tens[Math.floor(g / 10)] + (g % 10 !== 0 ? '-' + ones[g % 10] : '') + ' '
    } else if (g > 0) {
      str += ones[g] + ' '
    }
    return str.trim()
  }

  const intPart = Math.floor(num)
  const cents = Math.round((num - intPart) * 100)
  const groups = splitIntoGroups(intPart)
  const groupWords: string[] = []

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    if (g > 0) {
      const w = groupToWords(g)
      groupWords.unshift(scales[i] ? `${w} ${scales[i]}` : w)
    }
  }

  let result = groupWords.join(' ').trim()
  if (cents > 0) {
    result += ` and ${cents}/100`
  }
  return result
}

// ── Main Function ─────────────────────────────────────────────
export async function generateReceipt(payment: ReceiptPayload): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  // A5 Landscape: 210mm x 148mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })

  const clientName = resolveName(payment)
  const clientAddress = payment.guest_address ?? ''
  const clientTIN = payment.tin ?? ''
  const invNumber = formatInvoiceNo(payment.id)
  const grossAmount = payment.amount || 0
  const wtax = payment.withholding_tax || 0
  const netAmount = grossAmount - wtax
  // Extract addon items from notes — prefer itemised JSON, fall back to just the total
  const addonItems  = extractAddonItems(payment.notes)
  const addonAmount = addonItems.length > 0
    ? addonItems.reduce((s, i) => s + i.p * i.q, 0)
    : extractAddonTotal(payment.notes)
  const baseAmount  = addonAmount > 0 ? grossAmount - addonAmount : grossAmount

  const isCash = payment.method.toLowerCase().includes('cash')
  const isCheck = payment.method.toLowerCase().includes('check') || payment.method.toLowerCase().includes('bank')

  // Outer Border Box
  doc.setDrawColor(30, 30, 30)
  doc.setLineWidth(0.4)
  doc.rect(7, 7, 196, 134)

  // =========================================================================
  // LEFT COLUMN: SETTLEMENT TABLE
  // =========================================================================
  const tblX = 13
  const tblY = 12
  const tblW = 62
  const colParticularsW = 34
  const colAmountW = 28
  const centsSplitW = 7 // sub-column for centavos

  doc.setLineWidth(0.25)
  doc.rect(tblX, tblY, tblW, 122)

  // Header 1: "IN SETTLEMENT OF THE FOLLOWING:"
  doc.rect(tblX, tblY, tblW, 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(30, 30, 30)
  doc.text('IN SETTLEMENT OF THE FOLLOWING:', tblX + tblW / 2, tblY + 4, { align: 'center' })

  // Header 2: "PARTICULARS" & "Amount"
  const h2Y = tblY + 5.5
  doc.rect(tblX, h2Y, tblW, 5.5)
  doc.line(tblX + colParticularsW, h2Y, tblX + colParticularsW, tblY + 88) // Vertical division line

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('PARTICULARS', tblX + colParticularsW / 2, h2Y + 4, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('Amount', tblX + colParticularsW + colAmountW / 2, h2Y + 4, { align: 'center' })

  // Centavo division line down the amount column
  const centsLineX = tblX + tblW - centsSplitW
  doc.line(centsLineX, h2Y + 5.5, centsLineX, tblY + 88)

  // Empty Grid Rows (Particulars area)
  const rowH = 4.8
  let currentY = h2Y + 5.5
  const numGridRows = 12

  // Build the line items we want to show in the settlement table
  // Row 0: primary service (base amount)
  // Rows 1+: each addon item (if present) or a single add-ons subtotal row
  const settlementLines: { label: string; amount: number }[] = [
    { label: serviceLabel(payment).slice(0, 22), amount: addonAmount > 0 ? baseAmount : grossAmount },
    ...(addonItems.length > 0
      ? addonItems.map(i => ({ label: `  + ${i.n} x${i.q}`.slice(0, 22), amount: i.p * i.q }))
      : addonAmount > 0
        ? [{ label: '  + Add-ons', amount: addonAmount }]
        : [])
  ]

  for (let i = 0; i < numGridRows; i++) {
    doc.line(tblX, currentY + rowH, tblX + tblW, currentY + rowH)

    const line = settlementLines[i]
    if (line) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text(line.label, tblX + 1.5, currentY + 3.4)

      const parts = fmtCurrencyParts(line.amount)
      doc.text(parts.pesos, centsLineX - 1.5, currentY + 3.4, { align: 'right' })
      doc.text(parts.cents, tblX + tblW - 1.5, currentY + 3.4, { align: 'right' })
    }
    currentY += rowH
  }

  // Calculation Rows: Gross Sales, Less WTax, Net Amount
  const summaryLabels = [
    { label: 'GROSS SALES', amt: grossAmount },
    { label: 'LESS: WITHHOLDING TAX', amt: wtax },
    { label: 'NET AMOUNT', amt: netAmount },
  ]

  summaryLabels.forEach((item) => {
    doc.line(tblX, currentY + rowH, tblX + tblW, currentY + rowH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.text(item.label, tblX + 1.5, currentY + 3.3)

    if (item.amt > 0 || item.label === 'GROSS SALES') {
      const parts = fmtCurrencyParts(item.amt)
      doc.setFont('helvetica', 'normal')
      doc.text(parts.pesos, centsLineX - 1.5, currentY + 3.3, { align: 'right' })
      doc.text(parts.cents, tblX + tblW - 1.5, currentY + 3.3, { align: 'right' })
    }
    currentY += rowH
  })

  // Header: "FORM OF PAYMENT"
  doc.line(tblX, currentY + 4.5, tblX + tblW, currentY + 4.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('FORM OF PAYMENT', tblX + tblW / 2, currentY + 3.5, { align: 'center' })
  currentY += 4.5

  // Row: [ ] CASH   [ ] CHECK  |  P
  const checkRowH = 5
  doc.line(tblX, currentY + checkRowH, tblX + tblW, currentY + checkRowH)
  doc.line(tblX + 34, currentY, tblX + 34, currentY + checkRowH)

  // Checkbox: CASH
  doc.rect(tblX + 4, currentY + 1.2, 2.6, 2.6)
  if (isCash) {
    doc.setFont('helvetica', 'bold')
    doc.text('✓', tblX + 4.5, currentY + 3.2)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('CASH', tblX + 8, currentY + 3.3)

  // Checkbox: CHECK
  doc.rect(tblX + 18, currentY + 1.2, 2.6, 2.6)
  if (isCheck) {
    doc.setFont('helvetica', 'bold')
    doc.text('✓', tblX + 18.5, currentY + 3.2)
  }
  doc.setFont('helvetica', 'normal')
  doc.text('CHECK', tblX + 22, currentY + 3.3)

  // P amount box in form of payment
  doc.text('P', tblX + 36, currentY + 3.5)
  if (grossAmount > 0) {
    doc.setFontSize(6)
    doc.text(fmtCurrencyParts(grossAmount).full, tblX + tblW - 2, currentY + 3.5, { align: 'right' })
  }
  currentY += checkRowH

  // Bank, Check No., Check Date rows
  const metaRows = [
    { label: 'Bank', val: isCheck && payment.method.includes('bdo') ? 'BDO' : (isCheck && payment.method.includes('bpi') ? 'BPI' : '') },
    { label: 'Check No.', val: isCheck ? (payment.reference_number ?? '') : '' },
    { label: 'Check Date', val: '' },
  ]

  metaRows.forEach((r) => {
    const h = 4.8
    doc.line(tblX, currentY + h, tblX + tblW, currentY + h)
    doc.line(tblX + 19, currentY, tblX + 19, currentY + h)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(r.label, tblX + 1.5, currentY + 3.4)
    if (r.val) {
      doc.text(r.val, tblX + 21, currentY + 3.4)
    }
    currentY += h
  })

  // =========================================================================
  // RIGHT COLUMN: INVOICE DETAILS
  // =========================================================================
  const rightX = 84
  const lineEndX = 196

  // Header Details (Issuer Name, Address, TIN)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('M.P. GAYETA FUNERAL SERVICES', 140, 16, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Maharlika Highway, Sitio Sta. Clara, Brgy. Sampaloc 2, Sariaya, Quezon', 140, 21, { align: 'center' })
  doc.text('Tel: +63 918 901 9978  |  mgayetafuneralhome@gmail.com', 140, 25.5, { align: 'center' })
  doc.text('NON-VAT TIN: [TIN HERE]', 140, 30, { align: 'center' })

  // Red Invoice Number: No. 0001
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(220, 20, 20)
  doc.text('No.', 166, 36)
  doc.setFontSize(15)
  doc.text(invNumber, 181, 36)

  // Title: SERVICE INVOICE
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SERVICE INVOICE', rightX, 50)

  // Form Fields & Horizontal Underlines
  let formY = 61
  const lineGap = 7.5

  // 1. RECEIVED from
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('RECEIVED from', rightX, formY)
  doc.line(rightX + 19, formY + 0.5, lineEndX, formY + 0.5)
  if (clientName) {
    doc.setFont('helvetica', 'bold')
    doc.text(clientName, rightX + 22, formY - 0.5)
  }

  // 2. Address at
  formY += lineGap
  doc.setFont('helvetica', 'normal')
  doc.text('Address at', rightX, formY)
  doc.line(rightX + 13, formY + 0.5, lineEndX, formY + 0.5)
  if (clientAddress) {
    doc.text(clientAddress, rightX + 16, formY - 0.5)
  }

  // 3. Line with TIN
  formY += lineGap
  const tinSplitX = rightX + 62
  doc.line(rightX, formY + 0.5, tinSplitX, formY + 0.5)
  doc.text('with TIN', tinSplitX + 2, formY)
  doc.line(tinSplitX + 12, formY + 0.5, lineEndX, formY + 0.5)
  if (clientTIN) {
    doc.text(clientTIN, tinSplitX + 15, formY - 0.5)
  }

  // 4. The sum of
  formY += lineGap
  doc.text('The sum of', rightX, formY)
  doc.line(rightX + 14, formY + 0.5, lineEndX, formY + 0.5)
  const words = numberToWords(grossAmount)
  doc.text(words, rightX + 16, formY - 0.5)

  // 5. Pesos (P)
  formY += lineGap
  const pWordX = lineEndX - 45
  doc.line(rightX, formY + 0.5, pWordX, formY + 0.5)
  doc.text('Pesos (P', pWordX + 2, formY)
  doc.line(pWordX + 13, formY + 0.5, lineEndX - 2, formY + 0.5)
  doc.text(')', lineEndX - 1.5, formY)
  doc.setFont('helvetica', 'bold')
  doc.text(fmtCurrencyParts(grossAmount).full, pWordX + 15, formY - 0.5)

  // 6. In full / partial payment for
  formY += lineGap
  doc.setFont('helvetica', 'normal')
  doc.text('In full / partial payment for', rightX, formY)
  doc.line(rightX + 30, formY + 0.5, lineEndX, formY + 0.5)
  doc.text(serviceLabel(payment), rightX + 32, formY - 0.5)

  // Signature Block at Bottom Right
  const sigY = 106
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('By:', rightX + 68, sigY)
  doc.line(rightX + 75, sigY + 0.5, lineEndX - 1, sigY + 0.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('Authorized Signature', (rightX + 75 + lineEndX) / 2, sigY + 4, { align: 'center' })

  // Save the PDF
  const safeName = (clientName || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
  doc.save(`Service_Invoice_${invNumber}_${safeName}.pdf`)
}