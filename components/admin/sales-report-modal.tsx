'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Badge, type BadgeVariant } from './admin-primitives'
import { BarChart3, Download, ChevronDown, X, Ban } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll'

const PRODUCT_TYPES = ['all', 'columbarium', 'package', 'urn', 'cremation', 'general'] as const
type ProductFilter = typeof PRODUCT_TYPES[number]
const PAYMENT_METHODS = ['all', 'gcash', 'bdo_bank', 'cash'] as const
type MethodFilter = typeof PAYMENT_METHODS[number]

const VOID_REASONS = [
  'Duplicate entry', 'Client cancellation', 'Data entry error',
  'Refund issued', 'Test/demo record', 'Other',
] as const

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
  void_reason: string | null
  void_comment: string | null
}

// ── Void modal for sales report ──────────────────────────────
function SalesReportVoidModal({ row, onClose, onVoided, inputCls }: {
  row: ReportPayment
  onClose: () => void
  onVoided: (row: ReportPayment, reason: string, comment: string) => Promise<void>
  inputCls: string
}) {
  const [reason,  setReason]  = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const isOther   = reason === 'Other'
  const canSubmit = reason && (!isOther || comment.trim().length > 0)

  const handle = async () => {
    if (!canSubmit) { setError('Please select a reason.'); return }
    setLoading(true); setError('')
    try {
      await onVoided(row, reason, isOther ? comment.trim() : comment.trim())
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to void')
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Ban className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Void Transaction</h3>
              <p className="text-[10px] text-muted-foreground">Auditable and reversible from Transaction Register.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Client</span><span className="font-semibold">{row.guest_name ?? '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">₱{Number(row.amount).toLocaleString('en-PH')}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Method</span><span className="capitalize">{row.method.replace('_', ' ')}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Date</span><span>{new Date(row.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })}</span></div>
          </div>
          {error && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Void Reason <span className="text-red-500">*</span></label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
              <option value="">— Select a reason —</option>
              {VOID_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {isOther && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Reason <span className="text-red-500">*</span></label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe why…" className={`${inputCls} h-auto resize-none py-2.5`} />
            </div>
          )}
          {!isOther && reason && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comment (optional)</label>
              <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Any extra notes…" className={`${inputCls} h-auto resize-none py-2.5`} />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
            <button onClick={handle} disabled={!canSubmit || loading} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {loading ? 'Voiding…' : 'Void Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
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
      .select('id,created_at,approved_at,guest_name,guest_email,product_type,product_ref,method,reference_number,amount,status,notes,void_reason,void_comment')
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
  const [voidRow, setVoidRow] = useState<ReportPayment | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const handleVoid = async (row: ReportPayment, reason: string, comment: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'
    await supabase.from('payments').update({
      status: 'voided',
      void_reason:  reason,
      void_comment: comment || null,
      voided_by:    user?.id ?? null,
      voided_at:    new Date().toISOString(),
    }).eq('id', row.id)
    await logActivity({
      category: 'log', event_type: 'payment_voided',
      entity_table: 'payments', entity_id: row.id,
      actor_id: user?.id, actor_name: actorName,
      message: `${actorName} voided payment from ${row.guest_name ?? 'client'} — ${reason}${comment ? `: ${comment}` : ''}`,
      metadata: { amount: row.amount, reason, comment },
    })
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'voided', void_reason: reason, void_comment: comment || null } : r))
  }
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const inp = 'h-9 px-3 rounded-lg bg-background border border-border/70 text-xs focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all'
  const statusVariant = (s: string): BadgeVariant =>
    s === 'approved' ? 'green' : s === 'pending' ? 'amber' : s === 'voided' ? 'muted' : 'red'

  useLockBodyScroll()
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Sales Report</h2>
              <span className="text-[10px] text-muted-foreground hidden sm:block">· live data</span>
            </div>
            <div className="flex items-center gap-2">
              <div ref={exportRef} className="relative">
                <div className="flex items-stretch rounded-xl overflow-hidden border border-primary">
                  <button onClick={exportCSV} disabled={rows.length === 0}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                  <button onClick={() => setShowExportMenu(v => !v)} disabled={rows.length === 0}
                    className="h-8 px-2 bg-primary/90 text-primary-foreground hover:bg-primary/80 transition-colors border-l border-primary-foreground/20 disabled:opacity-40"
                    aria-label="Export options">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10">
                    <button onClick={() => { exportCSV(); setShowExportMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors">
                      <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export as CSV
                    </button>
                    <div className="border-t border-border/50" />
                    <button onClick={() => { exportPDF(); setShowExportMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors">
                      <Download className="h-3.5 w-3.5 text-primary" /> Export as PDF
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Filters — flat, no nested card ── */}
          <div className="px-6 pt-4 pb-3 border-b border-border/60 space-y-3 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
              <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className={inp} />
              <select value={statusFilt} onChange={e => setStatusFilt(e.target.value as typeof statusFilt)} className={inp}>
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <select value={product} onChange={e => setProduct(e.target.value as ProductFilter)} className={inp}>
                {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p === 'all' ? 'All Products' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <select value={method} onChange={e => setMethod(e.target.value as MethodFilter)} className={inp}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'all' ? 'All Methods' : m.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
            {/* Date presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Today',      from: fmt(today), to: fmt(today) },
                { label: 'This Week',  from: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())), to: fmt(today) },
                { label: 'This Month', from: fmt(firstOfMonth), to: fmt(today) },
                { label: 'Last Month', from: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) },
                { label: 'This Year',  from: fmt(new Date(today.getFullYear(), 0, 1)), to: fmt(today) },
              ].map(p => (
                <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    dateFrom === p.from && dateTo === p.to
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {/* Void modal */}
            {voidRow && (
              <SalesReportVoidModal
                row={voidRow}
                onClose={() => setVoidRow(null)}
                onVoided={handleVoid}
                inputCls={inp}
              />
            )}
            {error && <AlertBanner variant="error" message={error} />}

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                {/* ── Summary strip — no individual cards ── */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2 border-b border-border/60">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Revenue</p>
                    <p className="text-base font-bold text-primary">₱{totalRevenue.toLocaleString('en-PH')}</p>
                    <p className="text-[9px] text-muted-foreground">{approvedCount} approved</p>
                  </div>
                  <div className="w-px h-8 bg-border/60" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pending</p>
                    <p className="text-base font-bold text-amber-500">₱{totalPending.toLocaleString('en-PH')}</p>
                    <p className="text-[9px] text-muted-foreground">{pendingCount} awaiting</p>
                  </div>
                  <div className="w-px h-8 bg-border/60" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Transactions</p>
                    <p className="text-base font-bold text-foreground">{rows.length}</p>
                    <p className="text-[9px] text-muted-foreground">{rejectedCount} rejected</p>
                  </div>
                  {Object.keys(byProduct).length > 0 && (
                    <>
                      <div className="w-px h-8 bg-border/60 hidden sm:block" />
                      <div className="hidden sm:block">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">By Product</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {Object.entries(byProduct).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-muted-foreground capitalize">
                              {k} <span className="font-bold text-foreground">₱{Number(v).toLocaleString('en-PH')}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {Object.keys(byMethod).length > 0 && (
                    <>
                      <div className="w-px h-8 bg-border/60 hidden sm:block" />
                      <div className="hidden sm:block">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">By Method</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {Object.entries(byMethod).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-muted-foreground uppercase">
                              {k.replace('_', ' ')} <span className="font-bold text-foreground">₱{Number(v).toLocaleString('en-PH')}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Table ── */}
                {rows.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted-foreground italic">No transactions found for the selected filters.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          {['Date','Client','Product','Method','Reference','Amount','Status',''].map((h, i) => (
                            <th key={i} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/30 last:border-r-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.id} className={`border-b border-border/40 transition-colors hover:bg-muted/10 ${r.status === 'voided' ? 'opacity-50' : ''} ${i % 2 !== 0 ? 'bg-muted/[0.03]' : ''}`}>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap border-r border-border/20">
                              {new Date(r.created_at).toLocaleDateString('en-PH')}
                            </td>
                            <td className="px-4 py-2.5 border-r border-border/20">
                              <p className="font-semibold text-foreground leading-tight">{r.guest_name ?? '—'}</p>
                              {r.guest_email && <p className="text-[9px] text-muted-foreground font-mono">{r.guest_email}</p>}
                            </td>
                            <td className="px-4 py-2.5 border-r border-border/20">
                              <p className="capitalize text-foreground leading-tight">{r.product_type}</p>
                              {r.product_ref && <p className="text-[9px] text-muted-foreground font-mono">{r.product_ref}</p>}
                            </td>
                            <td className="px-4 py-2.5 border-r border-border/20"><Badge label={r.method.replace('_', ' ')} variant="blue" plain /></td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground border-r border-border/20">{r.reference_number ?? '—'}</td>
                            <td className="px-4 py-2.5 font-bold text-primary whitespace-nowrap border-r border-border/20">₱{Number(r.amount).toLocaleString('en-PH')}</td>
                            <td className="px-4 py-2.5 border-r border-border/20">
                              <div className="flex flex-col gap-0.5">
                                <Badge label={r.status} variant={statusVariant(r.status)} plain />
                                {r.status === 'voided' && r.void_reason && (
                                  <span className="text-[9px] text-muted-foreground italic truncate max-w-[100px]" title={r.void_reason}>{r.void_reason}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              {r.status !== 'voided' && (
                                <button onClick={() => setVoidRow(r)}
                                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-red-200 text-red-600 text-[10px] font-semibold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-colors">
                                  <Ban className="h-2.5 w-2.5" /> Void
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary/20 bg-primary/[0.04]">
                          <td colSpan={5} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary/70">Total Approved</td>
                          <td className="px-4 py-2.5 font-bold text-primary whitespace-nowrap">₱{totalRevenue.toLocaleString('en-PH')}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
      </div>
    </div>,
    document.body
  )
}
