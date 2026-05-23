'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview } from '@/components/ui/tarp-preview'
import type {
  Profile, Booking, Payment, Inquiry,
  ColumbariumSlot, Obituary, PaymentInfo,
  BookingStatus, PaymentStatus, SlotStatus,
} from '@/lib/supabase/types'
import {
  ShieldAlert, Mail, Users, Landmark, Clock,
  LayoutDashboard, BookOpen, CreditCard, Grid3X3,
  ScrollText, UserCircle2, Check, ChevronDown,
  ChevronUp, Search, Banknote, Package, X, Plus,
  Pencil, Save, UploadCloud, QrCode, Building2,
  BarChart3, Download, Filter, TrendingUp,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'amber' | 'red' | 'muted' | 'blue'

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    green: 'bg-primary text-primary-foreground border-primary',
    amber: 'bg-amber-500 text-white border-amber-500',
    red:   'bg-red-500 text-white border-red-500',
    muted: 'bg-muted border-border/30 text-muted-foreground',
    blue:  'bg-primary text-primary-foreground border-primary',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${cls[variant]}`}>
      {label}
    </span>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-xl font-bold text-foreground">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-2xl bg-muted/10">
      {message}
    </div>
  )
}

function Spinner() {
  return (
    <div className="py-16 flex justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

const inputCls = 'w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all'

// ─────────────────────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────────────────────
type Tab = 'overview' | 'inquiries' | 'bookings' | 'payments' | 'columbarium' | 'obituaries' | 'profiles'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',    icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'inquiries',   label: 'Inquiries',   icon: <Mail className="h-3.5 w-3.5" /> },
  { id: 'bookings',    label: 'Bookings',    icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'payments',    label: 'Payments',    icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: 'columbarium', label: 'Columbarium', icon: <Grid3X3 className="h-3.5 w-3.5" /> },
  { id: 'obituaries',  label: 'Obituaries',  icon: <ScrollText className="h-3.5 w-3.5" /> },
  { id: 'profiles',    label: 'Profiles',    icon: <UserCircle2 className="h-3.5 w-3.5" /> },
]

// ─────────────────────────────────────────────────────────────
// Payment Info Card — editable GCash + bank details
// ─────────────────────────────────────────────────────────────
function PaymentInfoCard() {
  const supabase = createClient()
  const qrInputRef = useRef<HTMLInputElement>(null)

  const [info, setInfo]       = useState<PaymentInfo | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [draft, setDraft]     = useState<Partial<PaymentInfo>>({})
  const [qrPreview, setQrPreview] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => { setInfo(data ?? null); setDraft(data ?? {}) })
  }, [supabase])

  const getQrUrl = (path: string | null | undefined) => {
    if (!path) return null
    return supabase.storage.from('payment-info').getPublicUrl(path).data.publicUrl
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `gcash-qr.${ext}`
    const { error } = await supabase.storage.from('payment-info').upload(path, file, { upsert: true })
    if (!error) {
      setDraft(d => ({ ...d, gcash_qr_path: path }))
      setQrPreview(URL.createObjectURL(file))
    }
    setQrUploading(false)
  }

  const field = (key: keyof PaymentInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => ({ ...d, [key]: e.target.value }))

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('payment_info').update(draft).eq('id', 1)
    if (!error) {
      setInfo(prev => ({ ...prev!, ...draft }))
      setEditing(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2500)
    }
    setSaving(false)
  }

  // Inside white containers — standard dark text + white inputs
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'
  const inp = 'w-full h-9 px-3 rounded-lg bg-white border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/10 outline-none transition-all'

  const displayQr = qrPreview ?? getQrUrl(editing ? draft.gcash_qr_path : info?.gcash_qr_path)

  return (
    <div className="rounded-2xl bg-primary overflow-hidden shadow-md">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Payment Receiving Details</span>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-[10px] font-semibold text-white/70">{saveMsg}</span>}
          {editing ? (
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white text-primary text-[10px] font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
            >
              <Save className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <button
              onClick={() => { setDraft(info ?? {}); setQrPreview(null); setEditing(true) }}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-white text-white text-[10px] font-bold hover:bg-white/10 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/10 px-5 pb-4 pt-1">

        {/* GCash — transparent, sits on the green bg */}
        <div className="px-1 py-1 space-y-3">
          <div className="flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5 text-white/70" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">GCash</span>
          </div>

          {editing ? (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">Account Name</label>
                <input value={draft.gcash_name ?? ''} onChange={field('gcash_name')} placeholder="e.g. Juan Dela Cruz" className="w-full h-9 px-3 rounded-lg bg-white/15 border border-white/30 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:ring-1 focus:ring-white/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">GCash Number</label>
                <input value={draft.gcash_number ?? ''} onChange={field('gcash_number')} placeholder="e.g. 0917 123 4567" className="w-full h-9 px-3 rounded-lg bg-white/15 border border-white/30 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:ring-1 focus:ring-white/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">QR Code Image</label>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  disabled={qrUploading}
                  className="w-full h-9 rounded-lg bg-white/10 border border-dashed border-white/30 text-[10px] font-semibold text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  {qrUploading ? 'Uploading…' : displayQr ? 'Replace QR Image' : 'Upload QR Image'}
                </button>
              </div>
              {displayQr && (
                <img src={displayQr} alt="GCash QR" className="w-28 h-28 rounded-xl object-contain border border-white/20 bg-white mx-auto" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {displayQr ? (
                <img src={displayQr} alt="GCash QR" className="w-24 h-24 rounded-xl object-contain border border-white/20 bg-white shrink-0" />
              ) : (
                <div className="w-24 h-24 rounded-xl border border-dashed border-white/30 bg-white/10 flex items-center justify-center shrink-0">
                  <QrCode className="h-8 w-8 text-white/30" />
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {info?.gcash_name || <span className="text-white/40 italic font-normal">No name set</span>}
                </p>
                <p className="font-mono text-sm text-white/80">
                  {info?.gcash_number || <span className="text-white/40 italic font-normal">No number set</span>}
                </p>
                <p className="text-[10px] text-white/50">Scan QR or send to number above</p>
              </div>
            </div>
          )}
        </div>

        {/* Bank Transfer — white bg card */}
        <div className="bg-white rounded-xl p-4 space-y-3 lg:ml-5">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bank Transfer</span>
          </div>

          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([1, 2, 3, 4] as const).map(n => (
                <div key={n} className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bank {n}</p>
                  <div>
                    <label className={lbl}>Bank Name</label>
                    <input value={(draft as Record<string, string>)[`bank${n}_name`] ?? ''} onChange={field(`bank${n}_name` as keyof PaymentInfo)} placeholder="e.g. BDO" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Account Holder</label>
                    <input value={(draft as Record<string, string>)[`bank${n}_account_name`] ?? ''} onChange={field(`bank${n}_account_name` as keyof PaymentInfo)} placeholder="e.g. Juan Dela Cruz" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Account Number</label>
                    <input value={(draft as Record<string, string>)[`bank${n}_account_number`] ?? ''} onChange={field(`bank${n}_account_number` as keyof PaymentInfo)} placeholder="e.g. 0012-3456-789" className={inp} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([1, 2, 3, 4] as const).map(n => {
                const name   = (info as Record<string, string> | null)?.[`bank${n}_name`]           ?? ''
                const holder = (info as Record<string, string> | null)?.[`bank${n}_account_name`]   ?? ''
                const acct   = (info as Record<string, string> | null)?.[`bank${n}_account_number`] ?? ''
                if (!name && !acct) return null
                return (
                  <div key={n} className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{name}</p>
                    <p className="font-mono font-bold text-sm text-foreground">{acct}</p>
                    {holder && <p className="text-[10px] text-muted-foreground">{holder}</p>}
                  </div>
                )
              })}
              {([1, 2, 3, 4] as const).every(n => !(info as Record<string, string> | null)?.[`bank${n}_name`]) && (
                <p className="text-[10px] text-muted-foreground italic col-span-2">No bank accounts configured yet.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sales Report Modal
// ─────────────────────────────────────────────────────────────
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

function SalesReportModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()

  // ── Filters ──────────────────────────────────────────────
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const [dateFrom,   setDateFrom]   = useState(fmt(firstOfMonth))
  const [dateTo,     setDateTo]     = useState(fmt(today))
  const [product,    setProduct]    = useState<ProductFilter>('all')
  const [method,     setMethod]     = useState<MethodFilter>('all')
  const [statusFilt, setStatusFilt] = useState<'all' | 'approved' | 'pending' | 'rejected'>('approved')

  // ── Data ─────────────────────────────────────────────────
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

  // ── Derived stats ─────────────────────────────────────────
  const totalRevenue   = rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0)
  const totalPending   = rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0)
  const approvedCount  = rows.filter(r => r.status === 'approved').length
  const pendingCount   = rows.filter(r => r.status === 'pending').length
  const rejectedCount  = rows.filter(r => r.status === 'rejected').length

  const byProduct = rows.filter(r => r.status === 'approved').reduce<Record<string, number>>((acc, r) => {
    acc[r.product_type] = (acc[r.product_type] ?? 0) + Number(r.amount)
    return acc
  }, {})

  const byMethod = rows.filter(r => r.status === 'approved').reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + Number(r.amount)
    return acc
  }, {})

  // ── CSV Export ────────────────────────────────────────────
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

  // ── PDF Export ────────────────────────────────────────────
  const exportPDF = async () => {
    // Dynamic import so jspdf is never bundled into the initial JS chunk
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // ── Brand colours (match Tailwind primary green) ──
    const PRIMARY: [number, number, number] = [34, 107, 66]   // #226B42
    const LIGHT:   [number, number, number] = [240, 247, 243] // soft green tint
    const DARK:    [number, number, number] = [30,  40,  35]  // near-black

    // ── Header band ──────────────────────────────────────────
    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, pageW, 28, 'F')

    // Logo — load from public folder as base64 via fetch
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

    // Brand name — top-left next to logo
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('M. P. GAYETA', 32, 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 230, 210)
    doc.text('Funeral Services', 32, 18)

    // "Sales Report" centred
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('Sales Report', pageW / 2, 16, { align: 'center' })

    // Generated date — top-right
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(200, 230, 210)
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW - 8, 10, { align: 'right' })

    // ── Sub-header: filter summary ────────────────────────────
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

    // ── Summary boxes ─────────────────────────────────────────
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

    // ── Transactions table ────────────────────────────────────
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
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: DARK,
        lineColor: [220, 230, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      footStyles: {
        fillColor: LIGHT,
        textColor: PRIMARY,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [250, 253, 251] },
      columnStyles: {
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'center' },
      },
      margin: { left: 8, right: 8 },
      didDrawPage: (data) => {
        // Footer on every page
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

  // ── Export dropdown state ─────────────────────────────────
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

          {/* ── Header ── */}
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
              {/* Export split button */}
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

            {/* ── Filters ── */}
            <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Date From */}
                <div>
                  <label className={lbl}>From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${inp} w-full`} />
                </div>
                {/* Date To */}
                <div>
                  <label className={lbl}>To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${inp} w-full`} />
                </div>
                {/* Status */}
                <div>
                  <label className={lbl}>Status</label>
                  <select value={statusFilt} onChange={e => setStatusFilt(e.target.value as typeof statusFilt)} className={`${inp} w-full`}>
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                {/* Product */}
                <div>
                  <label className={lbl}>Product</label>
                  <select value={product} onChange={e => setProduct(e.target.value as ProductFilter)} className={`${inp} w-full`}>
                    {PRODUCT_TYPES.map(p => (
                      <option key={p} value={p}>{p === 'all' ? 'All Products' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {/* Method */}
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
                {/* ── Summary Cards ── */}
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
                  {/* By Product */}
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
                  {/* By Method */}
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

                {/* ── Transactions Table ── */}
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

// ─────────────────────────────────────────────────────────────
// Overview Tab — live Supabase counts
// ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ pending: 0, totalBookings: 0, inquiries: 0, profiles: 0, totalRevenue: 0 })
  const [pendingPayments, setPendingPayments] = useState<(Payment & { guest_name?: string; guest_email?: string })[]>([])
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([])
  const [recentBookings, setRecentBookings] = useState<(Booking & { guest_name?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { count: pending },
      { count: totalBookings },
      { count: inquiries },
      { count: profiles },
      { data: pendingRows },
      { data: recentInq },
      { data: recentBook },
      { data: approvedPayments },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('inquiries').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('id,method,reference_number,amount,user_id,guest_name,guest_email').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('inquiries').select('id,name,email,subject,message,is_read,created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('bookings').select('id,package_name,price,status,created_at,guest_name,guest_email,user_id').order('created_at', { ascending: false }).limit(4),
      supabase.from('payments').select('amount').eq('status', 'approved'),
    ])

    const totalRevenue = (approvedPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

    setStats({ pending: pending ?? 0, totalBookings: totalBookings ?? 0, inquiries: inquiries ?? 0, profiles: profiles ?? 0, totalRevenue })
    setPendingPayments((pendingRows ?? []) as (Payment & { guest_name?: string; guest_email?: string })[])
    setRecentInquiries(recentInq ?? [])
    setRecentBookings((recentBook ?? []) as (Booking & { guest_name?: string })[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Sales Report Modal */}
      {showReport && <SalesReportModal onClose={() => setShowReport(false)} />}

      {/* Payment receiving details */}
      <PaymentInfoCard />

      {/* ── Stats container ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Container header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Overview</span>
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Sales Report
          </button>
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-border/60">
          {[
            { icon: <Clock className="h-5 w-5" />,    label: 'Pending Payments',  value: String(stats.pending),                              sub: 'awaiting review' },
            { icon: <BookOpen className="h-5 w-5" />, label: 'Total Bookings',    value: String(stats.totalBookings),                        sub: 'all time' },
            { icon: <Mail className="h-5 w-5" />,     label: 'Inquiries',         value: String(stats.inquiries),                            sub: 'submitted' },
            { icon: <Users className="h-5 w-5" />,    label: 'Registered Users',  value: String(stats.profiles),                             sub: 'accounts' },
            { icon: <Landmark className="h-5 w-5" />, label: 'Total Revenue',     value: `₱${stats.totalRevenue.toLocaleString('en-PH')}`,   sub: 'approved payments' },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
                <p className="text-xl font-serif font-bold text-foreground mt-0.5 truncate">{value}</p>
                <p className="text-[10px] text-muted-foreground/70">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pending approvals */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Pending Approvals</h3>
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                {stats.pending} awaiting
              </span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {pendingPayments.length === 0
              ? <p className="text-xs text-muted-foreground italic text-center py-6">All payments processed.</p>
              : pendingPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/10">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.method} · {p.reference_number ?? 'no ref'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-serif font-bold text-primary text-xs">₱{Number(p.amount).toLocaleString()}</span>
                    <button onClick={() => approve(p.id)} className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                      Approve
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent bookings */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Recent Bookings</h3>
          </div>
          <div className="p-4 space-y-2">
            {recentBookings.length === 0
              ? <p className="text-xs text-muted-foreground italic text-center py-6">No bookings yet.</p>
              : recentBookings.map(b => (
                <div key={b.id} className="p-3 rounded-xl border border-border bg-background">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{b.guest_name ?? '—'}</p>
                    <Badge label={b.status} variant={b.status === 'active' ? 'green' : b.status === 'pending' ? 'amber' : 'muted'} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{b.package_name}</p>
                  <p className="text-[10px] font-bold text-primary mt-0.5">₱{Number(b.price).toLocaleString()}</p>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent inquiries */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Recent Inquiries</h3>
          </div>
          <div className="p-4 space-y-2">
            {recentInquiries.length === 0
              ? <p className="text-xs text-muted-foreground italic text-center py-6">No inquiries yet.</p>
              : recentInquiries.map(inq => (
                <div key={inq.id} className="p-3 rounded-xl border border-border bg-background">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-semibold text-foreground">{inq.name}</p>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0">{new Date(inq.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{inq.email}</p>
                  <p className="text-[10px] text-primary font-medium mt-0.5">{inq.subject}</p>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Inquiries Tab
// ─────────────────────────────────────────────────────────────
function InquiriesTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('inquiries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const markRead = async (id: string) => {
    await supabase.from('inquiries').update({ is_read: true }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="Inquiries" sub={`${rows.length} total · ${rows.filter(r => !r.is_read).length} unread`} />
      {rows.length === 0 ? <EmptyState message="No inquiries submitted yet." /> : (
        <div className="space-y-2">
          {rows.map(inq => (
            <div key={inq.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => { setExpanded(expanded === inq.id ? null : inq.id); if (!inq.is_read) markRead(inq.id) }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${inq.is_read ? 'bg-border' : 'bg-primary'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{inq.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{inq.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <Badge label={inq.is_read ? 'read' : 'unread'} variant={inq.is_read ? 'muted' : 'amber'} />
                  <span className="text-[9px] font-mono text-muted-foreground hidden sm:block">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </span>
                  {expanded === inq.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </button>
              {expanded === inq.id && (
                <div className="px-5 pb-5 border-t border-border/40 pt-4 space-y-3">
                  <a href={`mailto:${inq.email}`} className="text-[10px] font-mono text-primary hover:underline">{inq.email}</a>
                  <p className="text-sm text-foreground leading-relaxed">{inq.message}</p>
                  <Button asChild size="sm" className="h-8 px-4 text-xs rounded-lg mt-1">
                    <a href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject)}`}>Reply via Email</a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Bookings Tab
// ─────────────────────────────────────────────────────────────
type BookingRow = Booking & { guest_name?: string | null; guest_email?: string | null; profileName?: string; profileEmail?: string; paymentStatus?: string }

function BookingsTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')

  useEffect(() => {
    const fetchBookings = async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (!bookings) { setLoading(false); return }

      // Fetch profiles
      const userIds = [...new Set(bookings.filter(b => b.user_id).map(b => b.user_id as string))]
      let profileMap: Record<string, { name: string; email: string }> = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
      }

      // Fetch approved payments — use booking_id when available for precise matching,
      // otherwise fall back to matching by (guest_email OR user_id) + package_name
      const bookingIds = bookings.map(b => b.id)
      const { data: payments } = await supabase
        .from('payments')
        .select('id,booking_id,user_id,guest_email,status,product_type,product_ref')
        .eq('status', 'approved')

      // Build a set of booking IDs that are directly linked to an approved payment
      const approvedByBookingId = new Set<string>()
      // For payments without a booking_id, track (email, product_ref) pairs
      const approvedByEmailRef = new Set<string>()
      const approvedByUserRef  = new Set<string>()

      if (payments) {
        payments.forEach(p => {
          if (p.booking_id && bookingIds.includes(p.booking_id)) {
            approvedByBookingId.add(p.booking_id)
          } else {
            // Fallback: match on identity + product_ref so one approval
            // doesn't bleed into unrelated bookings for the same person
            const ref = (p.product_ref ?? '').toLowerCase()
            if (p.guest_email) approvedByEmailRef.add(`${p.guest_email.toLowerCase()}|${ref}`)
            if (p.user_id)     approvedByUserRef.add(`${p.user_id}|${ref}`)
          }
        })
      }

      setRows(bookings.map(b => {
        let isPaid = false
        if (approvedByBookingId.has(b.id)) {
          isPaid = true
        } else {
          // Fallback: match on identity + package_name (used as product_ref on insert)
          const ref = (b.package_name ?? '').toLowerCase()
          if (b.guest_email) {
            isPaid = approvedByEmailRef.has(`${b.guest_email.toLowerCase()}|${ref}`)
          } else if (b.user_id) {
            isPaid = approvedByUserRef.has(`${b.user_id}|${ref}`)
          }
        }
        return {
          ...b,
          profileName:  b.user_id ? profileMap[b.user_id]?.name  : undefined,
          profileEmail: b.user_id ? profileMap[b.user_id]?.email : undefined,
          paymentStatus: isPaid ? 'paid' : 'unpaid',
        }
      }))
      setLoading(false)
    }
    fetchBookings()
  }, [supabase])

  const updateStatus = async (id: string, status: BookingStatus) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const statusVariant = (s: string): BadgeVariant =>
    s === 'active' ? 'green' : s === 'pending' ? 'amber' : s === 'cancelled' ? 'red' : 'muted'

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="Bookings" sub={`${rows.length} total memorial service reservations`} />
      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'pending', 'active', 'completed', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
            {f === 'all' ? `All (${rows.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${rows.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState message="No bookings match this filter." /> : (
        <div className="overflow-x-auto border border-border rounded-2xl bg-card">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Package</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{b.profileName ?? b.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{b.profileEmail ?? b.guest_email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-foreground">{b.package_name}</td>
                  <td className="px-5 py-3.5 font-serif font-bold text-primary">₱{Number(b.price).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5"><Badge label={b.status} variant={statusVariant(b.status)} /></td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={b.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                      variant={b.paymentStatus === 'paid' ? 'green' : 'red'}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    {b.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => updateStatus(b.id, 'active')} className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                          Finished
                        </button>
                        <button onClick={() => updateStatus(b.id, 'cancelled')} className="h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}
                    {b.status === 'active' && (
                      <button onClick={() => updateStatus(b.id, 'completed')} className="h-7 px-2.5 rounded-lg bg-muted border border-border text-muted-foreground text-[10px] font-bold hover:border-primary/40 transition-colors">
                        Complete
                      </button>
                    )}
                    {(b.status === 'completed' || b.status === 'cancelled') && (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Payments Tab — search + hoverable Products popover
// ─────────────────────────────────────────────────────────────
type RawPayment = Payment & {
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
}
type PaymentRow = RawPayment & { profileName?: string; profileEmail?: string }

function ProductsPopover({ payment }: { payment: PaymentRow }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { label: 'Type',      value: payment.product_type },
    { label: 'Reference', value: payment.product_ref ?? '—' },
    { label: 'Booking',   value: payment.booking_id ? payment.booking_id.slice(0, 12).toUpperCase() + '…' : '—' },
    { label: 'Notes',     value: payment.notes ?? '—' },
    { label: 'Receipt',   value: payment.receipt_file_path ?? '—' },
  ]

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
      >
        Products
      </button>
      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-50 bottom-full mb-2 left-0 w-64 bg-card border border-border rounded-xl shadow-xl p-3 space-y-2"
        >
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2 mb-1">
            Payment Products
          </p>
          {items.map(item => (
            <div key={item.label} className="flex justify-between gap-2 text-[10px]">
              <span className="text-muted-foreground font-medium shrink-0">{item.label}</span>
              <span className="text-foreground font-mono text-right truncate max-w-[140px]" title={item.value}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Cash payment modal
function CashModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [cashName, setCashName] = useState('')
  const [cashEmail, setCashEmail] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashNotes, setCashNotes] = useState('')
  const [cashProductType, setCashProductType] = useState('')
  const [cashProductRef, setCashProductRef] = useState('')
  const [cashError, setCashError] = useState('')
  const [cashLoading, setCashLoading] = useState(false)

  const handleCash = async (e: React.FormEvent) => {
    e.preventDefault()
    setCashError('')
    if (!cashName || !cashEmail) { setCashError('Name and email are required.'); return }
    if (!cashAmount || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) { setCashError('Enter a valid amount.'); return }
    if (!cashProductType) { setCashError('Product type is required.'); return }

    setCashLoading(true)
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', cashEmail).maybeSingle()

    const { error } = await supabase.from('payments').insert({
      user_id: profile?.id ?? null,
      guest_name: profile ? null : cashName,
      guest_email: profile ? null : cashEmail,
      product_type: cashProductType,
      product_ref: cashProductRef || null,
      method: 'cash',
      amount: Number(cashAmount),
      status: 'approved',
      notes: cashNotes || null,
      approved_at: new Date().toISOString(),
    })
    setCashLoading(false)
    if (error) { setCashError(error.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Record Cash Payment</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {cashError && <AlertBanner variant="error" message={cashError} />}
          <form onSubmit={handleCash} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Name</label>
                <input type="text" placeholder="Juan Dela Cruz" value={cashName} onChange={e => setCashName(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Email</label>
                <input type="email" placeholder="juan@example.com" value={cashEmail} onChange={e => setCashEmail(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Type</label>
                <input type="text" placeholder="e.g. columbarium" value={cashProductType} onChange={e => setCashProductType(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Ref</label>
                <input type="text" placeholder="e.g. R2C05" value={cashProductRef} onChange={e => setCashProductRef(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount (₱)</label>
                <input type="number" placeholder="5000" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OR / Notes</label>
                <input type="text" placeholder="GFS-OR-00123" value={cashNotes} onChange={e => setCashNotes(e.target.value)} className={inputCls} />
              </div>
            </div>
            <Button type="submit" disabled={cashLoading} className="w-full h-10 font-bold rounded-xl mt-1">
              {cashLoading ? 'Recording…' : 'Log Cash Payment'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function PaymentsTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [showCashModal, setShowCashModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    // Fetch payments without join — avoids FK join issues
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setLoadError(error.message)
      setLoading(false)
      return
    }

    if (!payments || payments.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    // Fetch profiles for user_ids that exist
    const userIds = [...new Set(payments.filter(p => p.user_id).map(p => p.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,name,email')
        .in('id', userIds)
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
      }
    }

    const enriched: PaymentRow[] = payments.map(p => ({
      ...p,
      profileName:  p.user_id ? profileMap[p.user_id]?.name  : undefined,
      profileEmail: p.user_id ? profileMap[p.user_id]?.email : undefined,
    }))

    setRows(enriched)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, status: 'approved' as PaymentStatus } : x))
  }

  const reject = async (id: string) => {
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, status: 'rejected' as PaymentStatus } : x))
  }

  const q = search.toLowerCase()
  const filtered = rows.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchSearch = !q || [
      p.profileName, p.profileEmail,
      p.guest_name, p.guest_email, p.guest_phone,
      p.reference_number, p.product_type, p.product_ref,
      p.method, p.notes,
    ].some(v => v?.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  const statusVariant = (s: string): BadgeVariant =>
    s === 'approved' ? 'green' : s === 'pending' ? 'amber' : 'red'

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Payments"
          sub={`${rows.length} total transaction${rows.length !== 1 ? 's' : ''}`}
        />
        <button
          onClick={() => setShowCashModal(true)}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <Banknote className="h-3.5 w-3.5 text-primary" /> Record Cash Payment
        </button>
      </div>

      {loadError && <AlertBanner variant="error" message={`Failed to load payments: ${loadError}`} />}

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, reference, product…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${statusFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
              {f === 'all' ? `All (${rows.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${rows.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState message="No payments match your search." /> : (
        <div className="overflow-x-auto border border-border rounded-2xl bg-card" style={{ overflow: 'visible' }}>
          <table className="w-full text-left text-xs border-collapse" style={{ overflow: 'visible' }}>
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Products</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{p.profileName ?? p.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.profileEmail ?? p.guest_email ?? ''}</p>
                    {p.guest_phone && <p className="text-[10px] text-muted-foreground font-mono">{p.guest_phone}</p>}
                  </td>
                  <td className="px-5 py-3.5"><Badge label={p.method} variant="blue" /></td>
                  <td className="px-5 py-3.5 font-mono text-muted-foreground text-[10px]">{p.reference_number ?? '—'}</td>
                  <td className="px-5 py-3.5 font-serif font-bold text-primary">₱{Number(p.amount).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5"><Badge label={p.status} variant={statusVariant(p.status)} /></td>
                  <td className="px-5 py-3.5"><ProductsPopover payment={p} /></td>
                  <td className="px-5 py-3.5">
                    {p.status === 'pending' ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => approve(p.id)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                          <Check className="h-3 w-3" /> Approve
                        </button>
                        <button onClick={() => reject(p.id)} className="inline-flex items-center h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors">
                          Reject
                        </button>
                      </div>
                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCashModal && (
        <CashModal
          onClose={() => setShowCashModal(false)}
          onSuccess={() => { load() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Columbarium Tab — visual grid
// ─────────────────────────────────────────────────────────────
const ROW_LABELS_ADMIN: Record<number, string> = {
  1: 'Top Level', 2: 'Eye Level (Upper)', 3: 'Eye Level (Lower)',
  4: 'Upper Bottom', 5: 'Lower Bottom', 6: 'Ground Level',
}

function ColumbariumTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<ColumbariumSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ColumbariumSlot | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('columbarium_slots').select('*').order('row_number').order('col_number')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const updateSlotStatus = async (newStatus: SlotStatus) => {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase
      .from('columbarium_slots')
      .update({ status: newStatus })
      .eq('id', selected.id)
    if (!error) {
      const updated = { ...selected, status: newStatus }
      setRows(r => r.map(s => s.id === selected.id ? updated : s))
      setSelected(updated)
    }
    setSaving(false)
  }

  const counts = {
    available: rows.filter(s => s.status === 'available').length,
    reserved:  rows.filter(s => s.status === 'reserved').length,
    occupied:  rows.filter(s => s.status === 'occupied').length,
  }

  const slotColor = (s: string) =>
    s === 'available' ? 'bg-primary hover:bg-primary/80 cursor-pointer'
    : s === 'reserved'  ? 'bg-amber-500 hover:bg-amber-400 cursor-pointer'
    : 'bg-red-500 hover:bg-red-400 cursor-pointer'

  const rowGroups = Array.from({ length: 6 }, (_, i) => ({
    row: i + 1,
    slots: rows.filter(s => s.row_number === i + 1),
  }))

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader
          title="Columbarium"
          sub={`${rows.length} total · ${counts.available} available · ${counts.reserved} reserved · ${counts.occupied} occupied`}
        />
        <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary inline-block" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Reserved</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Occupied</span>
        </div>
      </div>

      {rows.length === 0 ? <EmptyState message="No slots found. Run migration 002 to seed the grid." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0" style={{ minWidth: 180 + 12 * 44 }}>
              <tbody>
                {rowGroups.map(({ row, slots }) => (
                  <tr key={row}>
                    <td
                      style={{ position: 'sticky', left: 0, zIndex: 10, width: 160, minWidth: 160, background: 'var(--color-card)' }}
                      className={`px-4 py-3 align-middle border-r border-border ${row < 6 ? 'border-b border-border' : ''}`}
                    >
                      <p className="text-[11px] font-bold text-foreground whitespace-nowrap">{ROW_LABELS_ADMIN[row]}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        ₱{slots[0] ? Number(slots[0].price).toLocaleString() : '—'}
                      </p>
                    </td>
                    {slots.map(slot => (
                      <td key={slot.id} className={`p-1 ${row < 6 ? 'border-b border-border' : ''}`}>
                        <button
                          onClick={() => setSelected(s => s?.id === slot.id ? null : slot)}
                          title={`${slot.slot_code} · ${slot.status}${slot.occupant_name ? ` · ${slot.occupant_name}` : ''}`}
                          className={`w-10 h-10 rounded text-[8px] font-bold text-white border border-black/10 transition-all ${slotColor(slot.status)} ${selected?.id === slot.id ? 'ring-2 ring-foreground ring-offset-1' : ''}`}
                        >
                          {slot.col_number}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-mono font-bold text-lg text-foreground">{selected.slot_code}</p>
                <p className="text-[11px] text-muted-foreground">{ROW_LABELS_ADMIN[selected.row_number]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="divide-y divide-border text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Level</span>
                  <span className="font-medium text-foreground">{ROW_LABELS_ADMIN[selected.row_number]}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Column</span>
                  <span className="font-mono font-medium text-foreground">{selected.col_number} of 12</span>
                </div>
                <div className="flex justify-between py-2.5 items-center">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Price</span>
                  <span className="font-serif font-bold text-base text-foreground">₱{Number(selected.price).toLocaleString()}</span>
                </div>
                {selected.occupant_name && (
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Occupant</span>
                    <span className="font-medium text-foreground">{selected.occupant_name}</span>
                  </div>
                )}
                {selected.occupant_birth_date && (
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Born</span>
                    <span className="font-medium text-foreground">{selected.occupant_birth_date}</span>
                  </div>
                )}
                {selected.occupant_death_date && (
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Died</span>
                    <span className="font-medium text-foreground">{selected.occupant_death_date}</span>
                  </div>
                )}
                {selected.reserved_at && (
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Reserved At</span>
                    <span className="font-mono text-[10px] text-foreground">{new Date(selected.reserved_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Status picker */}
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'available', label: 'Available', active: 'bg-primary text-primary-foreground border-primary', idle: 'border-primary/30 text-primary hover:bg-primary/10' },
                    { value: 'reserved',  label: 'Reserved',  active: 'bg-amber-500 text-white border-amber-500',          idle: 'border-amber-400/40 text-amber-600 hover:bg-amber-400/10' },
                    { value: 'occupied',  label: 'Occupied',  active: 'bg-red-500 text-white border-red-500',              idle: 'border-red-400/40 text-red-500 hover:bg-red-400/10' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      disabled={saving || selected.status === opt.value}
                      onClick={() => updateSlotStatus(opt.value)}
                      className={`h-9 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed
                        ${selected.status === opt.value ? opt.active : `bg-background ${opt.idle}`}`}
                    >
                      {saving && selected.status !== opt.value ? '…' : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Create Tarp Modal — admin can create an obituary/tarp directly
// ─────────────────────────────────────────────────────────────
function CreateTarpModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [firstName,     setFirstName]     = useState('')
  const [middleName,    setMiddleName]    = useState('')
  const [lastName,      setLastName]      = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [age,           setAge]           = useState('')
  const [venueAddress,  setVenueAddress]  = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [photo,         setPhoto]         = useState<File | null>(null)
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null)
  const [fileName,      setFileName]      = useState('')
  const [isPublished,   setIsPublished]   = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [done,          setDone]          = useState(false)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setFileName(f.name)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim())    { setError('First name is required.'); return }
    if (!lastName.trim())     { setError('Last name is required.'); return }
    if (!birthDate)           { setError('Date of birth is required.'); return }
    if (!deathDate)           { setError('Date of death is required.'); return }
    if (!age)                 { setError('Age is required.'); return }
    if (!venueAddress.trim()) { setError('Venue address is required.'); return }
    if (!contactNumber.trim()){ setError('Contact number is required.'); return }

    setLoading(true)

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('obituaries').upload(path, photo, { upsert: false })
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setLoading(false); return }
      imagePath = path
    }

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:      fullName.trim(),
      birth_date:     birthDate || null,
      death_date:     deathDate || null,
      age:            age ? Number(age) : null,
      image_path:     imagePath,
      venue_address:  venueAddress.trim(),
      contact_number: contactNumber.trim(),
      is_published:   isPublished,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDone(true)
  }

  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'
  const inp = 'w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Create Tarpaulin / Obituary</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {done ? (
            <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">Tarp Created</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                The obituary record has been saved{isPublished ? ' and published' : ' as a draft'}.
              </p>
              <Button onClick={() => { onSuccess(); onClose() }} className="rounded-xl px-8 mt-2">Done</Button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              {/* Live tarp preview */}
              <div className="space-y-1.5">
                <p className={lbl}>Live Tarpaulin Preview</p>
                <TarpPreview
                  firstName={firstName || 'FIRST NAME'}
                  middleName={middleName}
                  lastName={lastName || 'LAST NAME'}
                  birthDate={birthDate}
                  deathDate={deathDate}
                  age={age}
                  photoUrl={photoPreview}
                  venueAddress={venueAddress}
                  contactNumber={contactNumber}
                />
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={lbl}>First Name of Deceased <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Juan" value={firstName}
                      onChange={e => setFirstName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Middle Name (optional)</label>
                    <input type="text" placeholder="e.g. Santos" value={middleName}
                      onChange={e => setMiddleName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Last Name / Surname <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Dela Cruz" value={lastName}
                      onChange={e => setLastName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Date of Birth <span className="text-primary">*</span></label>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Date of Death <span className="text-primary">*</span></label>
                    <input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Age <span className="text-primary">*</span></label>
                    <input type="number" placeholder="e.g. 72" min="0" max="150" value={age}
                      onChange={e => setAge(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Contact Number <span className="text-primary">*</span></label>
                    <input type="tel" placeholder="e.g. 0916 797 8416" value={contactNumber}
                      onChange={e => setContactNumber(e.target.value)} className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Venue / Wake Address <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress}
                      onChange={e => setVenueAddress(e.target.value)} className={inp} />
                  </div>
                </div>

                {/* Photo upload */}
                <div>
                  <label className={lbl}>Photo of Deceased (PNG with transparent background preferred)</label>
                  <div
                    className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    <p className="text-xs font-semibold text-foreground truncate px-4">
                      {fileName || 'Click to upload photo'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG recommended · max 5 MB</p>
                  </div>
                </div>

                {/* Publish toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsPublished(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${isPublished ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-foreground font-medium">
                    {isPublished ? 'Publish immediately' : 'Save as draft'}
                  </span>
                </label>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 font-bold rounded-xl">
                    {loading ? 'Creating…' : 'Create Tarp'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Obituaries Tab — with live tarp preview
// ─────────────────────────────────────────────────────────────
function ObituariesTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<Obituary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Obituary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Editable fields for selected obituary
  const [editName,    setEditName]    = useState('')
  const [editBirth,   setEditBirth]   = useState('')
  const [editDeath,   setEditDeath]   = useState('')
  const [editAge,     setEditAge]     = useState('')
  const [editVenue,   setEditVenue]   = useState('')
  const [editContact, setEditContact] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('obituaries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const openEdit = (o: Obituary) => {
    setSelected(o)
    setEditName(o.full_name)
    setEditBirth(o.birth_date ?? '')
    setEditDeath(o.death_date ?? '')
    setEditAge(o.age ? String(o.age) : '')
    setEditVenue(o.venue_address ?? '')
    setEditContact(o.contact_number ?? '')
  }

  const saveEdit = async () => {
    if (!selected) return
    setSaving(true)
    const updates = {
      full_name:      editName,
      birth_date:     editBirth || null,
      death_date:     editDeath || null,
      age:            editAge ? Number(editAge) : null,
      venue_address:  editVenue || null,
      contact_number: editContact || null,
    }
    await supabase.from('obituaries').update(updates).eq('id', selected.id)
    setRows(r => r.map(x => x.id === selected.id ? { ...x, ...updates } : x))
    setSelected(prev => prev ? { ...prev, ...updates } : null)
    setSaving(false)
  }

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('obituaries').update({ is_published: !current }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: !current } : x))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_published: !current } : null)
  }

  const getPhotoUrl = (path: string) => {
    if (!path || path === 'obituaries/placeholder.png') return null
    const { data } = supabase.storage.from('obituaries').getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="Obituaries" sub={`${rows.length} records · ${rows.filter(r => r.is_published).length} published`} />
        <button
          onClick={() => setShowCreateModal(true)}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Create Tarp
        </button>
      </div>

      {showCreateModal && (
        <CreateTarpModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            supabase.from('obituaries').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setRows(data ?? []))
          }}
        />
      )}

      {rows.length === 0 ? <EmptyState message="No obituary records yet." /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map(o => (
            <div key={o.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${selected?.id === o.id ? 'border-primary shadow-md' : 'border-border hover:border-primary/40'}`}>
              {/* Mini tarp preview */}
              <div className="p-3 bg-muted/20 border-b border-border">
                <TarpPreview
                  fullName={o.full_name}
                  birthDate={o.birth_date ?? ''}
                  deathDate={o.death_date ?? ''}
                  age={o.age ?? ''}
                  photoUrl={getPhotoUrl(o.image_path)}
                  venueAddress={o.venue_address ?? ''}
                  contactNumber={o.contact_number ?? ''}
                />
              </div>
              {/* Info row */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{o.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{o.submitter_name ?? ''} · {o.submitter_email ?? ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge label={o.is_published ? 'Published' : 'Draft'} variant={o.is_published ? 'green' : 'muted'} />
                  <button onClick={() => openEdit(o)}
                    className="h-7 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => togglePublish(o.id, o.is_published)}
                    className={`h-7 px-3 rounded-lg text-[10px] font-bold border transition-all ${o.is_published ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500' : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'}`}>
                    {o.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit panel — live preview updates as you type */}
      {selected && (
        <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Edit Obituary — Live Preview</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Left: editable fields */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Birth Date</label>
                  <input type="date" value={editBirth} onChange={e => setEditBirth(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Death Date</label>
                  <input type="date" value={editDeath} onChange={e => setEditDeath(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Age</label>
                  <input type="number" value={editAge} onChange={e => setEditAge(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venue / Address</label>
                <input value={editVenue} onChange={e => setEditVenue(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Number</label>
                <input value={editContact} onChange={e => setEditContact(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={saveEdit} disabled={saving} className="flex-1 h-10 font-bold rounded-xl">
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <button
                  onClick={() => togglePublish(selected.id, selected.is_published)}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-all ${selected.is_published ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500' : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'}`}
                >
                  {selected.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
            {/* Right: live tarp preview */}
            <div className="px-6 py-5 bg-muted/10 flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Tarp Preview</p>
              <TarpPreview
                fullName={editName || 'FULL NAME'}
                birthDate={editBirth}
                deathDate={editDeath}
                age={editAge}
                photoUrl={getPhotoUrl(selected.image_path)}
                venueAddress={editVenue}
                contactNumber={editContact}
              />
              <p className="text-[10px] text-muted-foreground">Updates as you type. Save to persist changes.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Profiles Tab
// ─────────────────────────────────────────────────────────────
function ProfilesTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const q = search.toLowerCase()
  const filtered = rows.filter(p => !q || [p.name, p.email, p.role].some(v => v?.toLowerCase().includes(q)))

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="User Profiles" sub={`${rows.length} registered accounts`} />
      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all" />
      </div>
      {filtered.length === 0 ? <EmptyState message="No profiles match your search." /> : (
        <div className="overflow-x-auto border border-border rounded-2xl bg-card">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-foreground">{u.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono">{u.email}</td>
                  <td className="px-5 py-3.5"><Badge label={u.role} variant={u.role === 'admin' ? 'blue' : 'muted'} /></td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) {
        console.error('Admin page profile fetch error:', error)
      }
      setProfile(data ?? null)
    })
  }, [supabase, router])

  useEffect(() => {
    if (profile !== undefined && profile?.role !== 'admin') router.push('/')
  }, [profile, router])

  // Loading state
  if (profile === undefined) {
    return (
      <>
        <HeroHeader />
        <main className="flex-1 flex items-center justify-center py-32 bg-background">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      </>
    )
  }

  // Not admin
  if (!profile || profile.role !== 'admin') {
    return (
      <>
        <HeroHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-32 px-6 text-center space-y-5 bg-background">
          <div className="h-14 w-14 bg-destructive/5 rounded-full flex items-center justify-center border border-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Only authorized staff and administrators are permitted here.
          </p>
          <Button asChild className="rounded-xl px-6">
            <Link href="/auth/login">Sign In →</Link>
          </Button>
        </main>
      </>
    )
  }

  const tabContent: Record<Tab, React.ReactNode> = {
    overview:    <OverviewTab />,
    inquiries:   <InquiriesTab />,
    bookings:    <BookingsTab />,
    payments:    <PaymentsTab />,
    columbarium: <ColumbariumTab />,
    obituaries:  <ObituariesTab />,
    profiles:    <ProfilesTab />,
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background min-h-screen">



        {/* Sticky tab bar */}
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-16 z-40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex justify-center gap-0.5 overflow-x-auto py-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {tabContent[activeTab]}
        </div>

      </main>
    </>
  )
}
