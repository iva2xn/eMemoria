'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { Badge, SectionHeader, EmptyState, Spinner, inputCls, type BadgeVariant } from './admin-primitives'
import { Search, Check, Banknote, ChevronDown } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { Payment, PaymentStatus, UserRole } from '@/lib/supabase/types'

type RawPayment = Payment & {
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
}
type PaymentRow = RawPayment & { profileName?: string; profileEmail?: string }

// ── Products popover ─────────────────────────────────────────
function ProductsPopover({ payment }: { payment: PaymentRow }) {
  const [open, setOpen] = useState(false)
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openPopover = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const POPOVER_H = 180
      const spaceBelow = window.innerHeight - r.bottom
      const spaceAbove = r.top
      const showBelow  = spaceBelow >= POPOVER_H || spaceBelow >= spaceAbove
      setStyle(
        showBelow
          ? { position: 'fixed', top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 272) }
          : { position: 'fixed', bottom: window.innerHeight - r.top + 6, left: Math.min(r.left, window.innerWidth - 272) }
      )
    }
    setOpen(o => !o)
  }

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
        ref={btnRef}
        onMouseEnter={openPopover}
        onMouseLeave={() => setOpen(false)}
        onClick={openPopover}
        className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
      >
        Products
      </button>
      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          style={style}
          className="z-[200] w-64 bg-card border border-border rounded-xl shadow-xl p-3 space-y-2"
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

// ── Cash modal ───────────────────────────────────────────────
function CashModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [cashName, setCashName]               = useState('')
  const [cashEmail, setCashEmail]             = useState('')
  const [cashAmount, setCashAmount]           = useState('')
  const [cashNotes, setCashNotes]             = useState('')
  const [cashProductType, setCashProductType] = useState('')
  const [cashProductRef, setCashProductRef]   = useState('')
  const [cashError, setCashError]             = useState('')
  const [cashLoading, setCashLoading]         = useState(false)

  const handleCash = async (e: React.FormEvent) => {
    e.preventDefault()
    setCashError('')
    if (!cashName || !cashEmail) { setCashError('Name and email are required.'); return }
    if (!cashAmount || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) { setCashError('Enter a valid amount.'); return }
    if (!cashProductType) { setCashError('Product type is required.'); return }

    setCashLoading(true)
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', cashEmail).maybeSingle()

    const { error } = await supabase.from('payments').insert({
      user_id:      profile?.id ?? null,
      guest_name:   profile ? null : cashName,
      guest_email:  profile ? null : cashEmail,
      product_type: cashProductType,
      product_ref:  cashProductRef || null,
      method:       'cash',
      amount:       Number(cashAmount),
      status:       'approved',
      notes:        cashNotes || null,
      approved_at:  new Date().toISOString(),
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

// ── Payments Tab ─────────────────────────────────────────────
export function PaymentsTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()
  const [rows, setRows]               = useState<PaymentRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState('')
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [showCashModal, setShowCashModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { setLoadError(error.message); setLoading(false); return }
    if (!payments || payments.length === 0) { setRows([]); setLoading(false); return }

    const userIds = [...new Set(payments.filter(p => p.user_id).map(p => p.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
    }

    setRows(payments.map(p => ({
      ...p,
      profileName:  p.user_id ? profileMap[p.user_id]?.name  : undefined,
      profileEmail: p.user_id ? profileMap[p.user_id]?.email : undefined,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    const payment = rows.find(r => r.id === id)
    const { data: { user } } = await supabase.auth.getUser()
    const actorProfile = user ? rows.find(r => r.id === user.id) : null
    const actorName = actorProfile?.profileName ?? 'Staff'

    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)

    if (payment?.product_type === 'columbarium' && payment?.product_ref) {
      await supabase
        .from('columbarium_slots')
        .update({ status: 'reserved', reserved_by_user_id: payment.user_id ?? null, reserved_at: new Date().toISOString() })
        .eq('slot_code', payment.product_ref)
        .eq('status', 'available')
    }

    const clientName = payment?.profileName ?? payment?.guest_name ?? 'a client'
    await logActivity({
      category:     'log',
      event_type:   'payment_approved',
      entity_table: 'payments',
      entity_id:    id,
      actor_id:     user?.id,
      actor_name:   actorName,
      message:      `${actorName} approved a payment of ₱${Number(payment?.amount ?? 0).toLocaleString()} from ${clientName}`,
      metadata:     { amount: payment?.amount, client: clientName },
    })

    setRows(r => r.map(x => x.id === id ? { ...x, status: 'approved' as PaymentStatus } : x))
  }

  const reject = async (id: string) => {
    const payment = rows.find(r => r.id === id)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'

    await supabase.from('payments').update({ status: 'rejected' }).eq('id', id)

    const clientName = payment?.profileName ?? payment?.guest_name ?? 'a client'
    await logActivity({
      category:     'log',
      event_type:   'payment_rejected',
      entity_table: 'payments',
      entity_id:    id,
      actor_id:     user?.id,
      actor_name:   actorName,
      message:      `${actorName} rejected a payment from ${clientName}`,
      metadata:     { amount: payment?.amount, client: clientName },
    })

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
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{p.profileName ?? p.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{p.profileEmail ?? p.guest_email ?? ''}</p>
                    {p.guest_phone && <p className="text-[10px] text-muted-foreground font-mono">{p.guest_phone}</p>}
                  </div>
                  <Badge label={p.status} variant={statusVariant(p.status)} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Amount</p>
                    <p className="font-serif font-bold text-primary">₱{Number(p.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Method</p>
                    <Badge label={p.method} variant="blue" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Reference</p>
                    <p className="font-mono text-foreground">{p.reference_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Date</p>
                    <p className="font-mono text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <ProductsPopover payment={p} />
                  {p.status === 'pending' && currentRole === 'admin' ? (
                    <div className="flex gap-1.5">
                      <button onClick={() => approve(p.id)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={() => reject(p.id)} className="inline-flex items-center h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors">
                        Reject
                      </button>
                    </div>
                  ) : <span className="text-[10px] text-muted-foreground">—</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto border border-border rounded-2xl bg-card">
            <table className="w-full text-left text-xs border-collapse">
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
                      {p.status === 'pending' && currentRole === 'admin' ? (
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
        </>
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
