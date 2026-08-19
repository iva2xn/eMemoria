'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import {
  Badge, SectionHeader, EmptyState, Spinner,
  SearchInput, inputCls, type BadgeVariant,
} from './admin-primitives'
import { logActivity } from '@/lib/activity-log'
import {
  Download, Filter, ChevronDown, ChevronUp,
  FileText, FileSpreadsheet, X, AlertTriangle,
  RotateCcw, Eye, ArrowUpDown, ArrowUp, ArrowDown,
  Receipt, Ban,
} from 'lucide-react'
import type { Payment, PaymentStatus, UserRole } from '@/lib/supabase/types'

// ── Types ────────────────────────────────────────────────────
type TxRow = Payment & {
  profileName?: string
  profileEmail?: string
  void_reason: string | null
  void_comment: string | null
  voided_by: string | null
  voided_at: string | null
}

type SortField = 'created_at' | 'amount' | 'status' | 'method' | 'product_type'
type SortDir   = 'asc' | 'desc'

type ExportFormat  = 'pdf' | 'xlsx' | 'docx'
type ExportScope   = 'filtered' | 'selected' | 'all'
type ActiveSubTab  = 'register' | 'voided'

const PRODUCT_TYPES  = ['all','columbarium','package','urn','cremation','general'] as const
const PAYMENT_METHODS = ['all','gcash','bdo_bank','bpi_bank','cash'] as const
const VOID_REASONS   = [
  'Duplicate entry',
  'Client cancellation',
  'Data entry error',
  'Refund issued',
  'Test/demo record',
  'Other',
] as const

const PRIMARY: [number, number, number] = [34, 107, 66]
const LIGHT:   [number, number, number] = [240, 247, 243]
const DARK:    [number, number, number] = [30,  40,  35]

// ── Helpers ──────────────────────────────────────────────────
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const today = new Date()
const firstOfYear = new Date(today.getFullYear(), 0, 1)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
}
function fmtAmt(n: number) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
function clientName(r: TxRow) {
  return r.profileName ?? r.guest_name ?? '—'
}
function clientEmail(r: TxRow) {
  return r.profileEmail ?? r.guest_email ?? ''
}

// ── Badge variant helper ─────────────────────────────────────
function statusVariant(s: string): BadgeVariant {
  if (s === 'approved') return 'green'
  if (s === 'pending')  return 'amber'
  if (s === 'voided')   return 'muted'
  return 'red'
}

// ── Sort icon ────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: string; active: string; dir: SortDir }) {
  if (active !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-0.5" />
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-primary ml-0.5" />
    : <ArrowDown className="h-3 w-3 text-primary ml-0.5" />
}

// ── Th with sort ─────────────────────────────────────────────
function ThSort({ label, field, active, dir, onSort, right }: {
  label: string; field: SortField; active: SortField; dir: SortDir
  onSort: (f: SortField) => void; right?: boolean
}) {
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border cursor-pointer select-none hover:text-foreground transition-colors ${right ? 'text-right' : ''}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortIcon field={field} active={active} dir={dir} />
      </span>
    </th>
  )
}


// ═══════════════════════════════════════════════════════════
// VOID MODAL
// ═══════════════════════════════════════════════════════════
function VoidModal({ row, onClose, onVoided }: {
  row: TxRow
  onClose: () => void
  onVoided: (id: string) => void
}) {
  const supabase = createClient()
  const [reason,  setReason]  = useState<string>('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const isOther    = reason === 'Other'
  const canSubmit  = reason && (!isOther || comment.trim().length > 0)

  const handleVoid = async () => {
    if (!canSubmit) { setError('Please select a reason before proceeding.'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof }    = user
      ? await supabase.from('profiles').select('name').eq('id', user.id).single()
      : { data: null }
    const actorName = prof?.name ?? 'Staff'

    const { error: err } = await supabase
      .from('payments')
      .update({
        status:       'voided',
        void_reason:  reason,
        void_comment: isOther ? comment.trim() : (comment.trim() || null),
        voided_by:    user?.id ?? null,
        voided_at:    new Date().toISOString(),
      })
      .eq('id', row.id)

    if (err) { setError(err.message); setLoading(false); return }

    await logActivity({
      category: 'log', event_type: 'payment_voided',
      entity_table: 'payments', entity_id: row.id,
      actor_id: user?.id, actor_name: actorName,
      message: `${actorName} voided payment from ${clientName(row)} — Reason: ${reason}${comment ? ` (${comment})` : ''}`,
      metadata: { amount: row.amount, reason, comment },
    })

    setLoading(false)
    onVoided(row.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Ban className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Void Transaction</h3>
              <p className="text-[10px] text-muted-foreground">This action is auditable and reversible.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Transaction summary */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Client</span><span className="font-semibold">{clientName(row)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">{fmtAmt(row.amount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Method</span><span className="capitalize">{row.method.replace('_', ' ')}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Date</span><span>{fmtDate(row.created_at)}</span></div>
          </div>

          {error && <AlertBanner variant="error" message={error} />}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Void Reason <span className="text-red-500">*</span>
            </label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
              <option value="">— Select a reason —</option>
              {VOID_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {isOther && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Custom Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Describe why this transaction is being voided…"
                className={`${inputCls} h-auto resize-none py-2.5`}
              />
            </div>
          )}

          {!isOther && reason && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Additional Comment (optional)</label>
              <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Any extra notes…" className={`${inputCls} h-auto resize-none py-2.5`} />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
              Cancel
            </button>
            <button
              onClick={handleVoid}
              disabled={!canSubmit || loading}
              className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Voiding…' : 'Void Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// RECOVER MODAL
// ═══════════════════════════════════════════════════════════
function RecoverModal({ row, onClose, onRecovered }: {
  row: TxRow
  onClose: () => void
  onRecovered: (id: string) => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handle = async () => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof }    = user
      ? await supabase.from('profiles').select('name').eq('id', user.id).single()
      : { data: null }
    const actorName = prof?.name ?? 'Staff'

    const { error: err } = await supabase
      .from('payments')
      .update({ status: 'pending', void_reason: null, void_comment: null, voided_by: null, voided_at: null })
      .eq('id', row.id)

    if (err) { setError(err.message); setLoading(false); return }

    await logActivity({
      category: 'log', event_type: 'payment_recovered',
      entity_table: 'payments', entity_id: row.id,
      actor_id: user?.id, actor_name: actorName,
      message: `${actorName} recovered voided payment from ${clientName(row)}`,
      metadata: { amount: row.amount },
    })

    setLoading(false)
    onRecovered(row.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <RotateCcw className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Recover Transaction</h3>
              <p className="text-[10px] text-muted-foreground">Status will revert to Pending.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              This will restore the transaction for <strong>{clientName(row)}</strong> ({fmtAmt(row.amount)}) and mark it as <strong>Pending</strong> for review. Are you sure?
            </p>
          </div>
          {error && <AlertBanner variant="error" message={error} />}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
            <button onClick={handle} disabled={loading} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all">
              {loading ? 'Recovering…' : 'Recover'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// EXPORT PREVIEW MODAL  — filters + format/scope + preview
// ═══════════════════════════════════════════════════════════
function ExportPreviewModal({ allRows, onClose, initialDateFrom, initialDateTo }: {
  allRows: TxRow[]
  onClose: () => void
  initialDateFrom: string
  initialDateTo: string
}) {
  const todayStr     = fmt(today)
  const firstOfYearStr = fmt(firstOfYear)

  const [dateFrom,    setDateFrom]    = useState(initialDateFrom)
  const [dateTo,      setDateTo]      = useState(initialDateTo)
  const [statusFilt,  setStatusFilt]  = useState<'all'|'approved'|'pending'|'rejected'|'voided'>('all')
  const [productFilt, setProductFilt] = useState<typeof PRODUCT_TYPES[number]>('all')
  const [methodFilt,  setMethodFilt]  = useState<typeof PAYMENT_METHODS[number]>('all')
  const [format,      setFormat]      = useState<ExportFormat>('pdf')
  const [scope,       setScope]       = useState<ExportScope>('filtered')
  const [exporting,   setExporting]   = useState(false)

  const inp = 'h-8 px-2.5 rounded-lg bg-background border border-border/70 text-xs focus:border-primary/60 outline-none transition-all'

  // Compute preview rows based on current filter state
  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      const d = r.created_at.slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
      if (statusFilt  !== 'all' && r.status       !== statusFilt)  return false
      if (productFilt !== 'all' && r.product_type !== productFilt) return false
      if (methodFilt  !== 'all' && r.method       !== methodFilt)  return false
      return true
    })
  }, [allRows, dateFrom, dateTo, statusFilt, productFilt, methodFilt])

  const exportRows = scope === 'all' ? allRows : filteredRows

  const approvedRows = exportRows.filter(r => r.status === 'approved')
  const totalRevenue = approvedRows.reduce((s, r) => s + Number(r.amount), 0)
  const voidedRows   = exportRows.filter(r => r.status === 'voided')
  const pendingRows  = exportRows.filter(r => r.status === 'pending')

  const doExport = async () => {
    setExporting(true)
    try {
      if (format === 'pdf')  await exportPDF(exportRows, dateFrom, dateTo)
      if (format === 'xlsx') await exportXLSX(exportRows, dateFrom, dateTo)
      if (format === 'docx') await exportDOCX(exportRows, dateFrom, dateTo)
    } finally {
      setExporting(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Export Transaction Register</h3>
                <p className="text-[10px] text-muted-foreground">Configure filters, format, and scope before downloading</p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* ── Filters ── */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Filters</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
                <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className={inp} />
                <select value={statusFilt} onChange={e => setStatusFilt(e.target.value as typeof statusFilt)} className={inp}>
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="voided">Voided</option>
                </select>
                <select value={productFilt} onChange={e => setProductFilt(e.target.value as typeof productFilt)} className={inp}>
                  {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p === 'all' ? 'All Products' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <select value={methodFilt} onChange={e => setMethodFilt(e.target.value as typeof methodFilt)} className={inp}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'all' ? 'All Methods' : m.replace('_', ' ').toUpperCase()}</option>)}
                </select>
              </div>
              {/* Date presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Today',      from: todayStr,       to: todayStr },
                  { label: 'This Month', from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayStr },
                  { label: 'Last Month', from: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) },
                  { label: 'This Year',  from: firstOfYearStr, to: todayStr },
                  { label: 'All Time',   from: '2020-01-01',   to: todayStr },
                ].map(p => (
                  <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      dateFrom === p.from && dateTo === p.to
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}>{p.label}</button>
                ))}
              </div>
            </div>

            {/* ── Format + Scope ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Format</p>
                <div className="flex gap-1.5">
                  {([
                    { v: 'pdf'  as ExportFormat, icon: FileText,        label: 'PDF' },
                    { v: 'xlsx' as ExportFormat, icon: FileSpreadsheet, label: 'Excel' },
                    { v: 'docx' as ExportFormat, icon: FileText,        label: 'Word' },
                  ] as { v: ExportFormat; icon: React.ElementType; label: string }[]).map(({ v, icon: Icon, label }) => (
                    <button key={v} onClick={() => setFormat(v)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                        format === v ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}>
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Scope</p>
                <div className="flex gap-1.5">
                  {([
                    { v: 'filtered' as ExportScope, label: `Filtered (${filteredRows.length})` },
                    { v: 'all'      as ExportScope, label: `All (${allRows.length})` },
                  ] as { v: ExportScope; label: string }[]).map(({ v, label }) => (
                    <button key={v} onClick={() => setScope(v)}
                      className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                        scope === v ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Summary stats ── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-2.5 px-4 bg-muted/30 rounded-xl border border-border/60">
              {[
                { label: 'Records',  value: String(exportRows.length),        color: 'text-foreground' },
                { label: 'Revenue',  value: fmtAmt(totalRevenue),             color: 'text-primary' },
                { label: 'Pending',  value: String(pendingRows.length),       color: 'text-amber-500' },
                { label: 'Voided',   value: String(voidedRows.length),        color: 'text-muted-foreground' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-2">
                  {i > 0 && <div className="w-px h-3.5 bg-border/60" />}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Preview table ── */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview · first {Math.min(6, exportRows.length)} of {exportRows.length} records</span>
                <span className="text-[10px] text-muted-foreground">Voided rows included</span>
              </div>
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-muted/40 border-b border-border">
                      {['#','Date','Client','Product','Method','Amount','Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/30 last:border-r-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exportRows.slice(0, 6).map((r, i) => (
                      <tr key={r.id} className={`border-b border-border/40 ${r.status === 'voided' ? 'opacity-50' : i % 2 !== 0 ? 'bg-muted/[0.03]' : ''}`}>
                        <td className="px-3 py-2 text-[10px] text-muted-foreground font-mono border-r border-border/20">{i + 1}</td>
                        <td className="px-3 py-2 text-[10px] text-muted-foreground whitespace-nowrap border-r border-border/20">{fmtDate(r.created_at)}</td>
                        <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap border-r border-border/20">{clientName(r)}</td>
                        <td className="px-3 py-2 capitalize text-[10px] border-r border-border/20">{r.product_type}</td>
                        <td className="px-3 py-2 text-[10px] border-r border-border/20"><Badge label={r.method.replace('_', ' ')} variant="blue" plain /></td>
                        <td className="px-3 py-2 font-bold text-primary whitespace-nowrap border-r border-border/20">{fmtAmt(r.amount)}</td>
                        <td className="px-3 py-2"><Badge label={r.status} variant={statusVariant(r.status)} plain /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Action buttons ── */}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
              <button onClick={doExport} disabled={exporting || exportRows.length === 0}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                {exporting
                  ? <><div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> Exporting…</>
                  : <><Download className="h-3.5 w-3.5" /> Download {format.toUpperCase()}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════
async function exportPDF(rows: TxRow[], dateFrom: string, dateTo: string) {
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Header bar
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
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text('M. P. GAYETA', 32, 12)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.setTextColor(200, 230, 210)
  doc.text('Funeral Services', 32, 18)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Transaction Register', pageW / 2, 16, { align: 'center' })

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  doc.setTextColor(200, 230, 210)
  doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW - 8, 10, { align: 'right' })

  // Filter bar
  doc.setFillColor(...LIGHT)
  doc.rect(0, 28, pageW, 10, 'F')
  doc.setFontSize(7.5); doc.setTextColor(...DARK)
  doc.text(`Period: ${dateFrom} → ${dateTo}   |   Records: ${rows.length}`, pageW / 2, 35, { align: 'center' })

  // Summary boxes
  const approved = rows.filter(r => r.status === 'approved')
  const voided   = rows.filter(r => r.status === 'voided')
  const totalRev = approved.reduce((s, r) => s + Number(r.amount), 0)
  const boxY = 42
  const boxes = [
    { label: 'Total Revenue', value: `PHP ${totalRev.toLocaleString('en-PH')}` },
    { label: 'Approved',      value: String(approved.length) },
    { label: 'Pending',       value: String(rows.filter(r => r.status === 'pending').length) },
    { label: 'Voided',        value: String(voided.length) },
    { label: 'Total Records', value: String(rows.length) },
  ]
  const boxW = (pageW - 16) / boxes.length
  boxes.forEach((b, i) => {
    const x = 8 + i * boxW
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.4)
    doc.roundedRect(x, boxY, boxW - 2, 14, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...PRIMARY)
    doc.text(b.value, x + (boxW - 2) / 2, boxY + 6, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 120, 110)
    doc.text(b.label.toUpperCase(), x + (boxW - 2) / 2, boxY + 11, { align: 'center' })
  })

  autoTable(doc, {
    startY: boxY + 18,
    head: [['#', 'Date', 'Client', 'Email', 'Product', 'Method', 'Ref #', 'Amount (PHP)', 'Status', 'Void Reason']],
    body: rows.map((r, i) => [
      i + 1,
      fmtDate(r.created_at),
      clientName(r),
      clientEmail(r) || '—',
      r.product_type,
      r.method.replace('_', ' ').toUpperCase(),
      r.reference_number ?? '—',
      Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 }),
      r.status.toUpperCase(),
      r.void_reason ? `${r.void_reason}${r.void_comment ? ': ' + r.void_comment : ''}` : '—',
    ]),
    foot: [['', '', '', '', '', '', '', `PHP ${totalRev.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'TOTAL APPROVED', '']],
    showFoot: 'lastPage',
    styles: { fontSize: 7, cellPadding: 2, textColor: DARK, lineColor: [220, 230, 225], lineWidth: 0.2 },
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: LIGHT, textColor: PRIMARY, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250, 253, 251] },
    columnStyles: { 7: { halign: 'right', fontStyle: 'bold' }, 8: { halign: 'center' }, 9: { fontSize: 6.5 } },
    didDrawPage: (data: { pageNumber: number }) => {
      const pg = doc.getNumberOfPages()
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 160, 155)
      doc.text(`M. P. Gayeta Funeral Services  ·  Transaction Register  ·  Page ${data.pageNumber} of ${pg}`, pageW / 2, pageH - 5, { align: 'center' })
      doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.3)
      doc.line(8, pageH - 8, pageW - 8, pageH - 8)
    },
    margin: { left: 8, right: 8 },
  })

  doc.save(`transaction-register-${dateFrom}-to-${dateTo}.pdf`)
}


async function exportXLSX(rows: TxRow[], dateFrom: string, dateTo: string) {
  const XLSX = await import('xlsx')

  const approved   = rows.filter(r => r.status === 'approved')
  const totalRev   = approved.reduce((s, r) => s + Number(r.amount), 0)

  // ── Sheet 1: Transactions ────────────────────────────────
  const txHeaders = ['#', 'Date', 'Client', 'Email', 'Phone', 'Product Type', 'Product Ref',
    'Method', 'Reference #', 'Amount (PHP)', 'Status', 'Approved At', 'Void Reason', 'Void Comment', 'Voided At', 'Notes']

  const txData = rows.map((r, i) => [
    i + 1,
    fmtDate(r.created_at),
    clientName(r),
    clientEmail(r) || '',
    r.guest_phone ?? '',
    r.product_type,
    r.product_ref ?? '',
    r.method.replace('_', ' ').toUpperCase(),
    r.reference_number ?? '',
    Number(r.amount),
    r.status.toUpperCase(),
    r.approved_at ? fmtDate(r.approved_at) : '',
    r.void_reason ?? '',
    r.void_comment ?? '',
    r.voided_at ? fmtDate(r.voided_at) : '',
    r.notes ?? '',
  ])

  const txSheet = XLSX.utils.aoa_to_sheet([
    ['M. P. GAYETA FUNERAL SERVICES — TRANSACTION REGISTER'],
    [`Period: ${dateFrom} to ${dateTo}    |    Generated: ${new Date().toLocaleString('en-PH')}`],
    [],
    txHeaders,
    ...txData,
    [],
    ['', '', '', '', '', '', '', '', 'TOTAL APPROVED', totalRev, '', '', '', '', '', ''],
  ])

  // Column widths
  txSheet['!cols'] = [4,12,22,26,14,14,12,12,16,14,10,12,20,28,12,24].map(w => ({ wch: w }))

  // ── Sheet 2: Summary ─────────────────────────────────────
  const byProduct = approved.reduce<Record<string, number>>((a, r) => {
    a[r.product_type] = (a[r.product_type] ?? 0) + Number(r.amount); return a
  }, {})
  const byMethod = approved.reduce<Record<string, number>>((a, r) => {
    a[r.method] = (a[r.method] ?? 0) + Number(r.amount); return a
  }, {})

  const summaryData = [
    ['SUMMARY'],
    [],
    ['Period', `${dateFrom} to ${dateTo}`],
    ['Generated', new Date().toLocaleString('en-PH')],
    [],
    ['TOTALS'],
    ['Total Records', rows.length],
    ['Approved', approved.length],
    ['Pending', rows.filter(r => r.status === 'pending').length],
    ['Rejected', rows.filter(r => r.status === 'rejected').length],
    ['Voided', rows.filter(r => r.status === 'voided').length],
    ['Total Revenue (Approved)', totalRev],
    [],
    ['BY PRODUCT TYPE'],
    ...Object.entries(byProduct).map(([k, v]) => [k, v]),
    [],
    ['BY PAYMENT METHOD'],
    ...Object.entries(byMethod).map(([k, v]) => [k.replace('_', ' ').toUpperCase(), v]),
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }]

  // ── Sheet 3: Voided ──────────────────────────────────────
  const voidHeaders = ['#', 'Date', 'Client', 'Amount', 'Product', 'Method', 'Void Reason', 'Void Comment', 'Voided At']
  const voidData = rows.filter(r => r.status === 'voided').map((r, i) => [
    i + 1, fmtDate(r.created_at), clientName(r), Number(r.amount),
    r.product_type, r.method.replace('_', ' ').toUpperCase(),
    r.void_reason ?? '', r.void_comment ?? '',
    r.voided_at ? fmtDate(r.voided_at) : '',
  ])
  const voidSheet = XLSX.utils.aoa_to_sheet([voidHeaders, ...voidData])
  voidSheet['!cols'] = [4, 12, 22, 14, 14, 12, 20, 28, 12].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, txSheet,      'Transactions')
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
  XLSX.utils.book_append_sheet(wb, voidSheet,    'Voided')

  XLSX.writeFile(wb, `transaction-register-${dateFrom}-to-${dateTo}.xlsx`)
}


async function exportDOCX(rows: TxRow[], dateFrom: string, dateTo: string) {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
    ShadingType,
  } = await import('docx')

  const approved = rows.filter(r => r.status === 'approved')
  const totalRev = approved.reduce((s, r) => s + Number(r.amount), 0)

  const PRIMARY_HEX = '226B42'
  const LIGHT_HEX   = 'F0F7F3'
  const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const CELL_BORDERS = { top: BORDER_NONE, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2EAE6' }, left: BORDER_NONE, right: BORDER_NONE }

  const headerCell = (text: string) => new TableCell({
    shading: { type: ShadingType.SOLID, color: PRIMARY_HEX },
    borders: CELL_BORDERS,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF', font: 'Calibri' })],
    })],
  })

  const dataCell = (text: string, bold = false, color?: string) => new TableCell({
    borders: CELL_BORDERS,
    children: [new Paragraph({
      children: [new TextRun({ text, bold, size: 16, color: color ?? '1E2823', font: 'Calibri' })],
    })],
  })

  const txRows = rows.map((r, i) => new TableRow({
    children: [
      dataCell(String(i + 1)),
      dataCell(fmtDate(r.created_at)),
      dataCell(clientName(r), true),
      dataCell(r.product_type),
      dataCell(r.method.replace('_', ' ').toUpperCase()),
      dataCell(r.reference_number ?? '—'),
      dataCell(`PHP ${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, true, PRIMARY_HEX),
      dataCell(r.status.toUpperCase(), false, r.status === 'voided' ? '999999' : undefined),
      dataCell(r.void_reason ? `${r.void_reason}${r.void_comment ? ': ' + r.void_comment : ''}` : '—'),
    ],
  }))

  const doc = new Document({
    sections: [{
      children: [
        // Title block
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'M. P. GAYETA FUNERAL SERVICES', bold: true, size: 32, color: PRIMARY_HEX, font: 'Calibri' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'TRANSACTION REGISTER', size: 24, color: '666666', font: 'Calibri' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Period: ${dateFrom} to ${dateTo}  |  Generated: ${new Date().toLocaleString('en-PH')}`, size: 18, color: '888888', font: 'Calibri' })],
          spacing: { after: 240 },
        }),

        // Summary row
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              headerCell('Total Records'),  headerCell('Approved'),
              headerCell('Voided'),         headerCell('Total Revenue'),
            ]}),
            new TableRow({ children: [
              dataCell(String(rows.length), true),
              dataCell(String(approved.length), true),
              dataCell(String(rows.filter(r => r.status === 'voided').length), true),
              dataCell(`PHP ${totalRev.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, true, PRIMARY_HEX),
            ]}),
          ],
        }),

        new Paragraph({ children: [new TextRun('')], spacing: { after: 240 } }),

        // Main table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['#','Date','Client','Product','Method','Ref #','Amount','Status','Void Info'].map(h => headerCell(h)),
            }),
            ...txRows,
          ],
        }),

        new Paragraph({ children: [new TextRun('')], spacing: { after: 240 } }),

        // Footer
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'M. P. Gayeta Funeral Services  ·  Confidential', size: 16, color: '999999', italics: true, font: 'Calibri' })],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBlob(doc)
  const url = URL.createObjectURL(buffer)
  const a = document.createElement('a')
  a.href = url
  a.download = `transaction-register-${dateFrom}-to-${dateTo}.docx`
  a.click()
  URL.revokeObjectURL(url)
}


// ═══════════════════════════════════════════════════════════
// REGISTER TABLE  — invoice-register ledger style
// ═══════════════════════════════════════════════════════════
function RegisterTable({ rows, sortField, sortDir, onSort, onVoid, currentRole, selectedIds, onToggleSelect, onSelectAll }: {
  rows: TxRow[]
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
  onVoid: (row: TxRow) => void
  currentRole: UserRole
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: (checked: boolean) => void
}) {
  const allSelected  = rows.length > 0 && rows.every(r => selectedIds.has(r.id))
  const someSelected = rows.some(r => selectedIds.has(r.id))

  const approvedRows  = rows.filter(r => r.status === 'approved')
  const totalRevenue  = approvedRows.reduce((s, r) => s + Number(r.amount), 0)
  const pendingCount  = rows.filter(r => r.status === 'pending').length
  const rejectedCount = rows.filter(r => r.status === 'rejected').length

  // Shared cell border class — right vertical rule on every cell
  const tdBase = 'px-4 py-2.5 border-r border-border/40 last:border-r-0 align-middle'
  const thBase = 'px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b-2 border-border border-r border-border/30 last:border-r-0 select-none'

  if (rows.length === 0) return <EmptyState message="No transactions match the current filters." />

  return (
    <div className="space-y-0 rounded-2xl overflow-hidden border border-border shadow-sm">

      {/* ── Summary strip (invoice-register header totals) ── */}
      <div className="bg-primary/5 border-b border-primary/20 px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Records</span>
          <span className="text-sm font-bold text-foreground">{rows.length}</span>
        </div>
        <div className="w-px h-4 bg-border/60" />
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Approved</span>
          <span className="text-sm font-bold text-primary">{fmtAmt(totalRevenue)}</span>
          <span className="text-[9px] text-muted-foreground">({approvedRows.length})</span>
        </div>
        <div className="w-px h-4 bg-border/60" />
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Pending</span>
          <span className="text-sm font-bold text-amber-500">{pendingCount}</span>
        </div>
        <div className="w-px h-4 bg-border/60" />
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rejected</span>
          <span className="text-sm font-bold text-muted-foreground">{rejectedCount}</span>
        </div>
        {selectedIds.size > 0 && (
          <>
            <div className="w-px h-4 bg-border/60" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/70">Selected</span>
              <span className="text-sm font-bold text-blue-500">{selectedIds.size}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Ledger table ── */}
      <div className="overflow-x-auto bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr>
              {/* Checkbox col — no divider */}
              <th className="px-3 py-3 bg-muted/40 border-b-2 border-border w-9">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={e => onSelectAll(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                />
              </th>
              {/* # col — right-aligned, narrow */}
              <th className={`${thBase} text-right w-10 text-muted-foreground/60`}>#</th>
              <th className={thBase} onClick={() => onSort('created_at')} style={{ cursor: 'pointer' }}>
                <span className="inline-flex items-center gap-0.5">Date <SortIcon field="created_at" active={sortField} dir={sortDir} /></span>
              </th>
              <th className={thBase}>Client</th>
              <th className={thBase} onClick={() => onSort('product_type')} style={{ cursor: 'pointer' }}>
                <span className="inline-flex items-center gap-0.5">Product <SortIcon field="product_type" active={sortField} dir={sortDir} /></span>
              </th>
              <th className={thBase} onClick={() => onSort('method')} style={{ cursor: 'pointer' }}>
                <span className="inline-flex items-center gap-0.5">Method <SortIcon field="method" active={sortField} dir={sortDir} /></span>
              </th>
              <th className={thBase}>Reference</th>
              <th className={`${thBase} text-right`} onClick={() => onSort('amount')} style={{ cursor: 'pointer' }}>
                <span className="inline-flex items-center justify-end gap-0.5">Amount <SortIcon field="amount" active={sortField} dir={sortDir} /></span>
              </th>
              <th className={thBase} onClick={() => onSort('status')} style={{ cursor: 'pointer' }}>
                <span className="inline-flex items-center gap-0.5">Status <SortIcon field="status" active={sortField} dir={sortDir} /></span>
              </th>
              {currentRole === 'admin' && <th className={thBase}>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => {
              const isEven     = i % 2 === 0
              const isSelected = selectedIds.has(r.id)
              const isVoided   = r.status === 'voided'

              const rowBg = isSelected
                ? 'bg-primary/5'
                : isVoided
                  ? 'bg-muted/5 opacity-50'
                  : isEven
                    ? 'bg-card'
                    : 'bg-muted/[0.04]'

              return (
                <tr key={r.id} className={`border-b border-border/50 transition-colors hover:bg-primary/[0.03] ${rowBg}`}>
                  {/* Checkbox */}
                  <td className="px-3 py-2.5 border-r border-border/30">
                    <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(r.id)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                  </td>
                  {/* # — right-aligned, mono, muted */}
                  <td className={`${tdBase} text-right font-mono text-[10px] text-muted-foreground/50 w-10`}>{i + 1}</td>
                  {/* Date */}
                  <td className={`${tdBase} text-[10px] text-muted-foreground whitespace-nowrap`}>{fmtDate(r.created_at)}</td>
                  {/* Client */}
                  <td className={tdBase}>
                    <p className="font-semibold text-foreground leading-tight">{clientName(r)}</p>
                    {clientEmail(r) && <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{clientEmail(r)}</p>}
                  </td>
                  {/* Product */}
                  <td className={tdBase}>
                    <p className="capitalize text-foreground leading-tight">{r.product_type}</p>
                    {r.product_ref && <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{r.product_ref}</p>}
                  </td>
                  {/* Method */}
                  <td className={tdBase}>
                    <Badge label={r.method.replace('_', ' ')} variant="blue" plain />
                  </td>
                  {/* Reference */}
                  <td className={`${tdBase} text-[10px] text-muted-foreground font-mono`}>{r.reference_number ?? '—'}</td>
                  {/* Amount — right-aligned */}
                  <td className={`${tdBase} font-bold text-primary text-right whitespace-nowrap`}>{fmtAmt(r.amount)}</td>
                  {/* Status */}
                  <td className={tdBase}>
                    <div className="flex flex-col gap-1">
                      <Badge label={r.status} variant={statusVariant(r.status)} plain />
                      {isVoided && r.void_reason && (
                        <span className="text-[9px] text-muted-foreground italic truncate max-w-[110px]" title={r.void_reason}>{r.void_reason}</span>
                      )}
                    </div>
                  </td>
                  {/* Actions */}
                  {currentRole === 'admin' && (
                    <td className={tdBase}>
                      {!isVoided ? (
                        <button onClick={() => onVoid(r)}
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-red-200 text-red-600 bg-red-50 text-[10px] font-semibold hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors">
                          <Ban className="h-2.5 w-2.5" /> Void
                        </button>
                      ) : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>

          {/* ── Totals footer — prominent ledger style ── */}
          <tfoot>
            <tr className="border-t-2 border-primary/30 bg-primary/[0.06]">
              <td colSpan={2} className="px-4 py-3 border-r border-border/40" />
              <td colSpan={currentRole === 'admin' ? 5 : 4} className="px-4 py-3 border-r border-border/40">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Total Approved Revenue
                </span>
              </td>
              <td className="px-4 py-3 text-right border-r border-border/40">
                <p className="text-sm font-black text-primary whitespace-nowrap">{fmtAmt(totalRevenue)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{approvedRows.length} transactions</p>
              </td>
              <td colSpan={currentRole === 'admin' ? 2 : 1} className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// VOIDED SUB-TAB
// ═══════════════════════════════════════════════════════════
function VoidedTab({ rows, onRecover, currentRole }: {
  rows: TxRow[]
  onRecover: (row: TxRow) => void
  currentRole: UserRole
}) {
  const [recoverRow, setRecoverRow] = useState<TxRow | null>(null)

  if (rows.length === 0) return (
    <div className="py-16 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
      <p className="text-sm text-muted-foreground">No voided transactions.</p>
    </div>
  )

  return (
    <>
      {recoverRow && (
        <RecoverModal
          row={recoverRow}
          onClose={() => setRecoverRow(null)}
          onRecovered={id => { onRecover(rows.find(r => r.id === id)!); setRecoverRow(null) }}
        />
      )}

      <div className="overflow-x-auto border border-border rounded-2xl bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {['#','Date','Client','Product','Amount','Void Reason','Comment','Voided At', currentRole === 'admin' ? 'Recover' : ''].filter(Boolean).map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">{i + 1}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{clientName(r)}</p>
                  {clientEmail(r) && <p className="text-[9px] text-muted-foreground font-mono">{clientEmail(r)}</p>}
                </td>
                <td className="px-4 py-3 capitalize">{r.product_type}</td>
                <td className="px-4 py-3 font-bold text-muted-foreground whitespace-nowrap">{fmtAmt(r.amount)}</td>
                <td className="px-4 py-3 text-[10px]">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-semibold">
                    {r.void_reason ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground max-w-[160px] truncate" title={r.void_comment ?? ''}>
                  {r.void_comment || '—'}
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                  {r.voided_at ? fmtDate(r.voided_at) : '—'}
                </td>
                {currentRole === 'admin' && (
                  <td className="px-4 py-3">
                    <button onClick={() => setRecoverRow(r)}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-primary/20 text-primary bg-primary/5 text-[10px] font-semibold hover:bg-primary/10 hover:border-primary/40 transition-colors">
                      <RotateCcw className="h-3 w-3" /> Recover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function TransactionRegisterTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()

  // ── Data ─────────────────────────────────────────────────
  const [allRows,  setAllRows]  = useState<TxRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // ── Sub-tab ───────────────────────────────────────────────
  const [subTab, setSubTab] = useState<ActiveSubTab>('register')

  // ── Search ────────────────────────────────────────────────
  const [search, setSearch] = useState('')

  // ── Sort ──────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')

  // ── Selection ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Modals ────────────────────────────────────────────────
  const [voidRow,       setVoidRow]       = useState<TxRow | null>(null)
  const [exportPreview, setExportPreview] = useState<boolean>(false)

  // ── Load ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('')

    const { data: payments, error: err } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }
    if (!payments?.length) { setAllRows([]); setLoading(false); return }

    const userIds = [...new Set(payments.filter(p => p.user_id).map(p => p.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
    }

    setAllRows(payments.map(p => ({
      ...(p as Payment & {
        void_reason: string | null; void_comment: string | null
        voided_by: string | null;   voided_at: string | null
      }),
      profileName:  p.user_id ? profileMap[p.user_id]?.name  : undefined,
      profileEmail: p.user_id ? profileMap[p.user_id]?.email : undefined,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── Sort handler ──────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  // ── Filtered + sorted rows (active only, no voided) ───────
  const activeRows = useMemo(() => {
    const q = search.toLowerCase()
    return allRows
      .filter(r => r.status !== 'voided')
      .filter(r => {
        if (q && ![clientName(r), clientEmail(r), r.reference_number, r.product_type, r.notes].some(v => v?.toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => {
        let av: string | number = a[sortField] as string | number ?? ''
        let bv: string | number = b[sortField] as string | number ?? ''
        if (sortField === 'amount') { av = Number(a.amount); bv = Number(b.amount) }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [allRows, search, sortField, sortDir])

  const voidedRows = useMemo(() =>
    allRows.filter(r => r.status === 'voided').sort((a, b) =>
      (b.voided_at ?? b.created_at).localeCompare(a.voided_at ?? a.created_at)
    ), [allRows])

  // ── Selection helpers ─────────────────────────────────────
  const toggleSelect = (id: string) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const selectAll    = (checked: boolean) => setSelectedIds(checked ? new Set(activeRows.map(r => r.id)) : new Set())

  // ── Void / Recover callbacks ──────────────────────────────
  const onVoided = (id: string) => {
    setAllRows(prev => prev.map(r => r.id === id ? { ...r, status: 'voided' as PaymentStatus } : r))
  }
  const onRecovered = (row: TxRow) => {
    setAllRows(prev => prev.map(r => r.id === row.id
      ? { ...r, status: 'pending' as PaymentStatus, void_reason: null, void_comment: null, voided_by: null, voided_at: null }
      : r
    ))
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {/* Modals */}
      {voidRow && <VoidModal row={voidRow} onClose={() => setVoidRow(null)} onVoided={onVoided} />}
      {exportPreview && (
        <ExportPreviewModal
          allRows={allRows}
          initialDateFrom={fmt(firstOfYear)}
          initialDateTo={fmt(today)}
          onClose={() => setExportPreview(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Transaction Register
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{allRows.length} total records · {voidedRows.length} voided</p>
        </div>
        <button
          onClick={() => setExportPreview(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {/* Search bar */}
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, reference, product…" />

      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 bg-muted/40 border border-border/60 rounded-xl p-1 w-fit">
        <button onClick={() => setSubTab('register')}
          className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${subTab === 'register' ? 'bg-card shadow-sm text-foreground border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
          Register ({activeRows.length})
        </button>
        <button onClick={() => setSubTab('voided')}
          className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${subTab === 'voided' ? 'bg-card shadow-sm text-foreground border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
          <Ban className="h-3 w-3" />
          Voided / Deleted
          {voidedRows.length > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500/10 text-red-500 text-[8px] font-black">{voidedRows.length}</span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {subTab === 'register' ? (
        <RegisterTable
          rows={activeRows}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          onVoid={setVoidRow}
          currentRole={currentRole}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
        />
      ) : (
        <VoidedTab rows={voidedRows} onRecover={onRecovered} currentRole={currentRole} />
      )}
    </div>
  )
}
