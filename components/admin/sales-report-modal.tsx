'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Badge, type BadgeVariant } from './admin-primitives'
import { BarChart3, Download, Filter, ChevronDown, X } from 'lucide-react'

const PRODUCT_TYPES = ['all', 'columbarium', 'package', 'urn', 'cremation', 'general'] as const
type ProductFilter = typeof PRODUCT_TYPES[number]
const PAYMENT_METHODS = ['all', 'gcash', 'bdo_bank', 'bpi_bank', 'cash'] as const
type MethodFilter = typeof PAYMENT_METHODS[number]

interface ReportPayment {
  id: string
  created_at: string
  approved_at: string | null
  guest_name: string | null
  guest_email: string | null
  product_type: string
  product_ref: string | null
  method: string
  reference_number: string | null
  amount: number
  status: string
  notes: string | null
}

export function SalesReportModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [dateFrom,   setDateFrom]   = useState(fmt(firstOfMonth))
  const [dateTo,     setDateTo]     = useState(fmt(today))
  const [product,    setProduct]    = useState<ProductFilter>('all')
  const [method,     setMethod]     = useState<MethodFilter>('all')
  const [statusFilt, setStatusFilt] = useState<'all' | 'approved' | 'pending' | 'rejected'>('approved')

  const [rows,    setRows]    = useState<ReportPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')

    let q = supabase
      .from('payments')
      .select('id,created_at,approved_at,guest_name,guest_email,product_type,product_ref,method,reference_number,amount,status,notes')
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })

    if (statusFilt !== 'all') q = q.eq('status', statusFilt)
    if (product    !== 'all') q = q.eq('product_type', product)
    if (method     !== 'all') q = q.eq('method', method)

    const { data, error: err } = await q
    if (err) { setError(err.message); setLoading(false); return }
    setRows((data ?? []) as ReportPayment[])
    setLoading(false)
  }, [supabase, dateFrom, dateTo, statusFilt, product, method])

  useEffect(() => { fetchReport() }, [fetchReport])

  const totalRevenue  = rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0)
  const totalPending  = rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0)
  const approvedCount = rows.filter(r => r.status === 'approved').length
  const pendingCount  = rows.filter(r => r.status === 'pending').length
  const rejectedCount = rows.filter(r => r.status === 'rejected').length

  const byProduct = rows.filter(r => r.status === 'approved').reduce<Record<string, number>>((acc, r) => {
    acc[r.product_type] = (acc[r.product_type] ?? 0) + Number(r.amount)
    return acc
  }, {})

  const byMethod = rows.filter(r => r.status === 'approved').reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + Number(r.amount)
    return acc
  }, {})

  const exportCSV = () => {
    const headers = ['Date','Client','Email','Product Type','Product Ref','Method','Reference #','Amount','Status','Notes']
    const csvRows = rows.map(r => [
      new Date(r.created_at).toLocaleDateString('en-PH'),
      r.guest_name ?? '—',
      r.guest_email ?? '—',
      r.product_type,
      r.product_ref ?? '—',
      r.method,
      r.reference_number ?? '—',
      Number(r.amount).toFixed(2),
      r.status,
      (r.notes ?? '').replace(/,/g, ';'),
    ])
    const csv = [headers, ...csvRows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    const { default: jsPDF }     = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    const PRIMARY: [number, number, number] = [34, 107, 66]
    const LIGHT:   [number, number, number] = [240, 247, 243]
    const DARK:    [number, number, number] = [30,  40,  35]

    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, pageW, 28, 'F')

    try {
      const res  = await fetch('/logo.png')
      const blob = await res.blob()
      const b64  = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      doc.addImage(b64, 'PNG', 8, 4, 20, 20)
    } catch { /* logo optional */ }

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('M. P. GAYETA', 32, 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 230, 210)
    doc.text('Funeral Services', 32, 18)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('Sales Report', pageW / 2, 16, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(200, 230, 210)
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW - 8, 10, { align: 'right' })

    doc.setFillColor(...LIGHT)
    doc.rect(0, 28, pageW, 12, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    const filterLine = [
      `Period: ${dateFrom} → ${dateTo}`,
      `Status: ${statusFilt}`,
      `Product: ${product}`,
      `Method: ${method}`,
    ].join('   |   ')
    doc.text(filterLine, pageW / 2, 35, { align: 'center' })

    const boxY = 44
    const boxes = [
      { label: 'Total Revenue',  value: `PHP ${totalRevenue.toLocaleString('en-PH')}` },
      { label: 'Approved',       value: String(approvedCount) },
      { label: 'Pending Amount', value: `PHP ${totalPending.toLocaleString('en-PH')}` },
      { label: 'Pending',        value: String(pendingCount) },
      { label: 'Transactions',   value: String(rows.length) },
    ]
    const boxW = (pageW - 16) / boxes.length
    boxes.forEach((b, i) => {
      const x = 8 + i * boxW
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(...PRIMARY)
      doc.setLineWidth(0.4)
      doc.roundedRect(x, boxY, boxW - 2, 14, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...PRIMARY)
      doc.text(b.value, x + (boxW - 2) / 2, boxY + 6, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(100, 120, 110)
      doc.text(b.label.toUpperCase(), x + (boxW - 2) / 2, boxY + 11, { align: 'center' })
    })

    autoTable(doc, {
      startY: boxY + 18,
      head: [['Date', 'Client', 'Email', 'Product', 'Ref', 'Method', 'Ref #', 'Amount (PHP)', 'Status']],
      body: rows.map(r => [
        new Date(r.created_at).toLocaleDateString('en-PH'),
        r.guest_name ?? '—',
        r.guest_email ?? '—',
        r.product_type,
        r.product_ref ?? '—',
        r.method.replace('_', ' ').toUpperCase(),
        r.reference_number ?? '—',
        Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        r.status.toUpperCase(),
      ]),
      foot: [['', '', '', '', '', '', 'TOTAL (APPROVED)', `PHP ${totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, '']],
      showFoot: 'lastPage',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [220, 230, 225], lineWidth: 0.2 },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: LIGHT, textColor: PRIMARY, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 253, 251] },
      columnStyles: { 7: { halign: 'right', fontStyle: 'bold' }, 8: { halign: 'center' } },
      margin: { left: 8, right: 8 },
      didDrawPage: (data) => {
        const pg = doc.getNumberOfPages()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(150, 160, 155)
        doc.text(
          `M. P. Gayeta Funeral Services  ·  Confidential  ·  Page ${data.pageNumber} of ${pg}`,
          pageW / 2, pageH - 5, { align: 'center' }
        )
        doc.setDrawColor(...PRIMARY)
        doc.setLineWidth(0.3)
        doc.line(8, pageH - 8, pageW - 8, pageH - 8)
      },
    })

    doc.save(`sales-report-${dateFrom}-to-${dateTo}.pdf`)
  }

  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'
  const inp = 'h-9 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all'

  const statusVariant = (s: string): BadgeVariant =>
    s === 'approved' ? 'green' : s === 'pending' ? 'amber' : 'red'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Sales Report</h2>
                <p className="text-[10px] text-muted-foreground">Live data from payments table</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div ref={exportRef} className="relative">
                <div className="flex items-stretch rounded-xl overflow-hidden border border-primary">
                  <button
                    onClick={exportCSV}
                    disabled={rows.length === 0}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                  <button
                    onClick={() => setShowExportMenu(v => !v)}
                    disabled={rows.length === 0}
                    className="h-8 px-2 bg-primary/90 text-primary-foreground hover:bg-primary/80 transition-colors border-l border-primary-foreground/20 disabled:opacity-40"
                    aria-label="Export options"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10">
                    <button
                      onClick={() => { exportCSV(); setShowExportMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <span className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      Export as CSV
                    </button>
                    <div className="border-t border-border/50" />
                    <button
                      onClick={() => { exportPDF(); setShowExportMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <span className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Download className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Filters */}
            <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className={lbl}>From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${inp} w-full`} />
                </div>
                <div>
                  <label className={lbl}>To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${inp} w-full`} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <select value={statusFilt} onChange={e => setStatusFilt(e.target.value as typeof statusFilt)} className={`${inp} w-full`}>
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Product</label>
                  <select value={product} onChange={e => setProduct(e.target.value as ProductFilter)} className={`${inp} w-full`}>
                    {PRODUCT_TYPES.map(p => (
                      <option key={p} value={p}>{p === 'all' ? 'All Products' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Method</label>
                  <select value={method} onChange={e => setMethod(e.target.value as MethodFilter)} className={`${inp} w-full`}>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m === 'all' ? 'All Methods' : m.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Quick date presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Today',      from: fmt(today),                                    to: fmt(today) },
                  { label: 'This Week',  from: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())), to: fmt(today) },
                  { label: 'This Month', from: fmt(firstOfMonth),                             to: fmt(today) },
                  { label: 'Last Month', from: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) },
                  { label: 'This Year',  from: fmt(new Date(today.getFullYear(), 0, 1)),      to: fmt(today) },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setDateFrom(preset.from); setDateTo(preset.to) }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      dateFrom === preset.from && dateTo === preset.to
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <AlertBanner variant="error" message={error} />}

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                    <p className="font-serif text-xl font-bold text-primary">₱{totalRevenue.toLocaleString('en-PH')}</p>
                    <p className="text-[10px] text-muted-foreground">{approvedCount} approved</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending</p>
                    <p className="font-serif text-xl font-bold text-amber-500">₱{totalPending.toLocaleString('en-PH')}</p>
                    <p className="text-[10px] text-muted-foreground">{pendingCount} awaiting</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transactions</p>
                    <p className="font-serif text-xl font-bold text-foreground">{rows.length}</p>
                    <p className="text-[10px] text-muted-foreground">{rejectedCount} rejected</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-1.5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">By Product</p>
                    {Object.keys(byProduct).length === 0
                      ? <p className="text-[10px] text-muted-foreground italic">No data</p>
                      : Object.entries(byProduct).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center gap-1">
                          <span className="text-[10px] text-muted-foreground capitalize truncate">{k}</span>
                          <span className="text-[10px] font-bold text-foreground shrink-0">₱{Number(v).toLocaleString('en-PH')}</span>
                        </div>
                      ))
                    }
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-1.5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">By Method</p>
                    {Object.keys(byMethod).length === 0
                      ? <p className="text-[10px] text-muted-foreground italic">No data</p>
                      : Object.entries(byMethod).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase">{k.replace('_', ' ')}</span>
                          <span className="text-[10px] font-bold text-foreground shrink-0">₱{Number(v).toLocaleString('en-PH')}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Transactions Table */}
                {rows.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-2xl bg-muted/10">
                    No transactions found for the selected filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-2xl bg-card">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Client</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map(r => (
                          <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(r.created_at).toLocaleDateString('en-PH')}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-foreground">{r.guest_name ?? '—'}</p>
                              {r.guest_email && <p className="text-[10px] text-muted-foreground font-mono">{r.guest_email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="capitalize text-foreground">{r.product_type}</p>
                              {r.product_ref && <p className="text-[10px] text-muted-foreground font-mono">{r.product_ref}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge label={r.method.replace('_', ' ')} variant="blue" />
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{r.reference_number ?? '—'}</td>
                            <td className="px-4 py-3 font-serif font-bold text-primary whitespace-nowrap">
                              ₱{Number(r.amount).toLocaleString('en-PH')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge label={r.status} variant={statusVariant(r.status)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/20">
                          <td colSpan={5} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Total (approved)
                          </td>
                          <td className="px-4 py-3 font-serif font-bold text-primary text-sm whitespace-nowrap">
                            ₱{totalRevenue.toLocaleString('en-PH')}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
