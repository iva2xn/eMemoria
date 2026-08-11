'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { Badge, SectionHeader, EmptyState, Spinner, TableShell, Th, FilterPills, SearchInput, inputCls, type BadgeVariant } from './admin-primitives'
import { PaymentInfoCard } from './payment-info-card'
import { Check, Banknote, ChevronDown, X } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { Payment, PaymentStatus, UserRole } from '@/lib/supabase/types'

type RawPayment = Payment & { guest_name?: string | null; guest_email?: string | null; guest_phone?: string | null }
type PaymentRow = RawPayment & { profileName?: string; profileEmail?: string }

function ProductsPopover({ payment }: { payment: PaymentRow }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const openPopover = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const below = window.innerHeight - r.bottom >= 180
      setStyle(below
        ? { position: 'fixed', top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 272) }
        : { position: 'fixed', bottom: window.innerHeight - r.top + 6, left: Math.min(r.left, window.innerWidth - 272) })
    }
    setOpen(o => !o)
  }

  const items = [
    { label: 'Type', value: payment.product_type },
    { label: 'Ref', value: payment.product_ref ?? '—' },
    { label: 'Notes', value: payment.notes ?? '—' },
    { label: 'Receipt', value: payment.receipt_file_path ?? '—' },
  ]

  return (
    <div ref={ref} className="relative inline-block">
      <button ref={btnRef} onMouseEnter={openPopover} onMouseLeave={() => setOpen(false)} onClick={openPopover}
        className="text-[11px] font-semibold text-primary hover:underline underline-offset-2">
        Details
      </button>
      {open && (
        <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
          style={style} className="z-[200] w-60 bg-card border border-border rounded-xl shadow-xl p-3 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">Payment Info</p>
          {items.map(item => (
            <div key={item.label} className="flex justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground shrink-0">{item.label}</span>
              <span className="text-foreground font-mono text-right truncate max-w-[140px]">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CashModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(''); const [notes, setNotes] = useState('')
  const [productType, setProductType] = useState(''); const [productRef, setProductRef] = useState('')
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!name || !email) { setError('Name and email are required.'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount.'); return }
    if (!productType) { setError('Product type is required.'); return }
    setLoading(true)
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
    const { error: err } = await supabase.from('payments').insert({
      user_id: profile?.id ?? null, guest_name: profile ? null : name,
      guest_email: profile ? null : email, product_type: productType,
      product_ref: productRef || null, method: 'cash',
      amount: Number(amount), status: 'approved', notes: notes || null,
      approved_at: new Date().toISOString(),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSuccess(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Record Cash Payment</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}
          <form onSubmit={handle} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Name</label>
                <input type="text" placeholder="Juan Dela Cruz" value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Email</label>
                <input type="email" placeholder="juan@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Type</label>
                <input type="text" placeholder="e.g. columbarium" value={productType} onChange={e => setProductType(e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Ref</label>
                <input type="text" placeholder="e.g. R2C05" value={productRef} onChange={e => setProductRef(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount (₱)</label>
                <input type="number" placeholder="5000" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OR / Notes</label>
                <input type="text" placeholder="GFS-OR-00123" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} /></div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-10 font-bold rounded-xl mt-1">
              {loading ? 'Recording…' : 'Log Cash Payment'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function PaymentsTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [showCashModal, setShowCashModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setLoadError('')
    const { data: payments, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    if (error) { setLoadError(error.message); setLoading(false); return }
    if (!payments?.length) { setRows([]); setLoading(false); return }
    const userIds = [...new Set(payments.filter(p => p.user_id).map(p => p.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
    }
    setRows(payments.map(p => ({ ...p, profileName: p.user_id ? profileMap[p.user_id]?.name : undefined, profileEmail: p.user_id ? profileMap[p.user_id]?.email : undefined })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    const payment = rows.find(r => r.id === id)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    if (payment?.product_type === 'columbarium' && payment?.product_ref) {
      await supabase.from('columbarium_slots').update({ status: 'reserved', reserved_by_user_id: payment.user_id ?? null, reserved_at: new Date().toISOString() }).eq('slot_code', payment.product_ref).eq('status', 'available')
    }
    const clientName = payment?.profileName ?? payment?.guest_name ?? 'a client'
    await logActivity({ category: 'log', event_type: 'payment_approved', entity_table: 'payments', entity_id: id, actor_id: user?.id, actor_name: actorName, message: `${actorName} approved ₱${Number(payment?.amount ?? 0).toLocaleString()} from ${clientName}`, metadata: { amount: payment?.amount, client: clientName } })
    setRows(r => r.map(x => x.id === id ? { ...x, status: 'approved' as PaymentStatus } : x))
  }

  const reject = async (id: string) => {
    const payment = rows.find(r => r.id === id)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', id)
    const clientName = payment?.profileName ?? payment?.guest_name ?? 'a client'
    await logActivity({ category: 'log', event_type: 'payment_rejected', entity_table: 'payments', entity_id: id, actor_id: user?.id, actor_name: actorName, message: `${actorName} rejected payment from ${clientName}`, metadata: { amount: payment?.amount, client: clientName } })
    setRows(r => r.map(x => x.id === id ? { ...x, status: 'rejected' as PaymentStatus } : x))
  }

  const statusVariant = (s: string): BadgeVariant => s === 'approved' ? 'green' : s === 'pending' ? 'amber' : 'red'
  const q = search.toLowerCase()
  const filtered = rows.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchSearch = !q || [p.profileName, p.profileEmail, p.guest_name, p.guest_email, p.reference_number, p.product_type].some(v => v?.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  if (loading) return <Spinner />

  const filterOptions = [
    { value: 'all' as const,      label: `All (${rows.length})` },
    { value: 'pending' as const,  label: `Pending (${rows.filter(r => r.status === 'pending').length})` },
    { value: 'approved' as const, label: `Approved (${rows.filter(r => r.status === 'approved').length})` },
    { value: 'rejected' as const, label: `Rejected (${rows.filter(r => r.status === 'rejected').length})` },
  ]

  return (
    <div className="space-y-5">
      <PaymentInfoCard canEdit={currentRole === 'admin'} />
      <SectionHeader title="Payments" sub={`${rows.length} total transactions`}
        action={
          <button onClick={() => setShowCashModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border bg-card text-[11px] font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all">
            <Banknote className="h-3.5 w-3.5 text-primary" /> Record Cash
          </button>
        }
      />
      {loadError && <AlertBanner variant="error" message={`Failed to load: ${loadError}`} />}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, reference…" /></div>
        <FilterPills options={filterOptions} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {filtered.length === 0 ? <EmptyState message="No payments match your search." /> : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{p.profileName ?? p.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.profileEmail ?? p.guest_email ?? ''}</p>
                  </div>
                  <Badge label={p.status} variant={statusVariant(p.status)} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><p className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5">Amount</p>
                    <p className="font-bold text-primary">₱{Number(p.amount).toLocaleString()}</p></div>
                  <div><p className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5">Method</p>
                    <Badge label={p.method} variant="blue" /></div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <ProductsPopover payment={p} />
                  {p.status === 'pending' && currentRole === 'admin' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => approve(p.id)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90">
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={() => reject(p.id)} className="h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <TableShell>
            <thead><tr>
              <Th>Client</Th><Th>Method</Th><Th>Reference</Th>
              <Th>Amount</Th><Th>Date</Th><Th>Status</Th>
              <Th>Details</Th>{currentRole === 'admin' && <Th>Actions</Th>}
            </tr></thead>
            <tbody className="divide-y divide-border/50 hidden md:table-row-group">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{p.profileName ?? p.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground">{p.profileEmail ?? p.guest_email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3.5"><Badge label={p.method} variant="blue" /></td>
                  <td className="px-5 py-3.5 text-[10px] text-muted-foreground font-mono">{p.reference_number ?? '—'}</td>
                  <td className="px-5 py-3.5 font-bold text-primary">₱{Number(p.amount).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5"><Badge label={p.status} variant={statusVariant(p.status)} /></td>
                  <td className="px-5 py-3.5"><ProductsPopover payment={p} /></td>
                  {currentRole === 'admin' && (
                    <td className="px-5 py-3.5">
                      {p.status === 'pending' ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => approve(p.id)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90">
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => reject(p.id)} className="h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600">
                            Reject
                          </button>
                        </div>
                      ) : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
      {showCashModal && <CashModal onClose={() => setShowCashModal(false)} onSuccess={load} />}
    </div>
  )
}
