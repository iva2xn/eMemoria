'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { StatCard } from '@/components/ui/stat-card'
import type {
  Profile, Booking, Payment, Inquiry,
  ColumbariumSlot, Obituary,
  BookingStatus, PaymentStatus, SlotStatus,
} from '@/lib/supabase/types'
import {
  ShieldAlert, Mail, Users, Landmark, Clock,
  LayoutDashboard, BookOpen, CreditCard, Grid3X3,
  ScrollText, UserCircle2, Check, ChevronDown,
  ChevronUp, Search, Banknote, Package,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'amber' | 'red' | 'muted' | 'blue'

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    amber: 'bg-amber-500/10  border-amber-500/20  text-amber-600',
    red:   'bg-red-500/10    border-red-500/20    text-red-500',
    muted: 'bg-muted         border-border/30     text-muted-foreground',
    blue:  'bg-primary/10    border-primary/20    text-primary',
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
// Overview Tab — live Supabase counts
// ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ pending: 0, activeBookings: 0, inquiries: 0, profiles: 0 })
  const [pendingPayments, setPendingPayments] = useState<(Payment & { profile?: Profile })[]>([])
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { count: pending },
      { count: activeBookings },
      { count: inquiries },
      { count: profiles },
      { data: pendingRows },
      { data: recentInq },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('inquiries').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*, profile:profiles(name,email)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(4),
    ])
    setStats({ pending: pending ?? 0, activeBookings: activeBookings ?? 0, inquiries: inquiries ?? 0, profiles: profiles ?? 0 })
    setPendingPayments((pendingRows ?? []) as (Payment & { profile?: Profile })[])
    setRecentInquiries(recentInq ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="h-5 w-5 text-primary animate-pulse" />} label="Pending Payments" value={String(stats.pending)} />
        <StatCard icon={<Landmark className="h-5 w-5 text-primary" />} label="Active Bookings" value={String(stats.activeBookings)} />
        <StatCard icon={<Mail className="h-5 w-5 text-primary" />} label="Total Inquiries" value={String(stats.inquiries)} />
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Registered Users" value={String(stats.profiles)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending approvals */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Pending Approvals</h3>
            {stats.pending > 0 && <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 animate-pulse">{stats.pending} awaiting</span>}
          </div>
          {pendingPayments.length === 0
            ? <p className="text-xs text-muted-foreground italic text-center py-4">All payments processed.</p>
            : pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/10">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">{(p as Payment & { profile?: { name: string } }).profile?.name ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.method} · {p.reference_number ?? 'no ref'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-serif font-bold text-primary text-sm">₱{Number(p.amount).toLocaleString()}</span>
                  <Button size="sm" onClick={() => approve(p.id)} className="h-7 px-3 text-[10px] rounded-lg">Approve</Button>
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent inquiries */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border/50">Recent Inquiries</h3>
          {recentInquiries.length === 0
            ? <p className="text-xs text-muted-foreground italic text-center py-4">No inquiries yet.</p>
            : recentInquiries.map(inq => (
              <div key={inq.id} className="p-3 rounded-xl border border-border bg-background space-y-0.5">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs font-semibold text-foreground">{inq.name}</p>
                  <span className="text-[9px] font-mono text-muted-foreground shrink-0">{new Date(inq.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{inq.email}</p>
                <p className="text-[10px] text-primary font-medium">{inq.subject}</p>
              </div>
            ))
          }
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
function BookingsTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<(Booking & { profile?: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')

  useEffect(() => {
    supabase.from('bookings').select('*, profile:profiles(name,email)').order('created_at', { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as (Booking & { profile?: Profile })[]); setLoading(false) })
  }, [supabase])

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{(b as Booking & { profile?: { name: string } }).profile?.name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{(b as Booking & { profile?: { email: string } }).profile?.email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-foreground">{b.package_name}</td>
                  <td className="px-5 py-3.5 font-serif font-bold text-primary">₱{Number(b.price).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5"><Badge label={b.status} variant={statusVariant(b.status)} /></td>
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
type PaymentRow = Payment & { profile?: { name: string; email: string } }

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
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-muted/30 text-[10px] font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
      >
        <Package className="h-3 w-3 text-primary" />
        Products
        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
      </button>
      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-50 bottom-full mb-2 left-0 w-64 bg-card border border-border rounded-xl shadow-lg p-3 space-y-2"
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

function PaymentsTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [cashName, setCashName] = useState('')
  const [cashEmail, setCashEmail] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashNotes, setCashNotes] = useState('')
  const [cashProductType, setCashProductType] = useState('')
  const [cashProductRef, setCashProductRef] = useState('')
  const [cashError, setCashError] = useState('')
  const [cashSuccess, setCashSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*, profile:profiles(name,email)')
      .order('created_at', { ascending: false })
    setRows((data ?? []) as PaymentRow[])
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
      p.profile?.name, p.profile?.email,
      p.reference_number, p.product_type, p.product_ref,
      p.method, p.notes,
    ].some(v => v?.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  const statusVariant = (s: string): BadgeVariant =>
    s === 'approved' ? 'green' : s === 'pending' ? 'amber' : 'red'

  const handleCash = async (e: React.FormEvent) => {
    e.preventDefault()
    setCashError(''); setCashSuccess('')
    if (!cashName || !cashEmail) { setCashError('Name and email are required.'); return }
    if (!cashAmount || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) { setCashError('Enter a valid amount.'); return }
    if (!cashProductType) { setCashError('Product type is required.'); return }

    // Look up profile by email
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', cashEmail).single()
    if (!profile) { setCashError('No account found for that email.'); return }

    const { error } = await supabase.from('payments').insert({
      user_id: profile.id,
      product_type: cashProductType,
      product_ref: cashProductRef || null,
      method: 'cash',
      amount: Number(cashAmount),
      status: 'approved',
      notes: cashNotes || null,
      approved_at: new Date().toISOString(),
    })
    if (error) { setCashError(error.message); return }
    setCashSuccess('Cash payment recorded.')
    setCashName(''); setCashEmail(''); setCashAmount(''); setCashNotes(''); setCashProductType(''); setCashProductRef('')
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader title="Payments" sub={`${rows.length} total transactions`} />

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
          <div className="overflow-x-auto border border-border rounded-2xl bg-card">
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
                      <p className="font-semibold text-foreground">{p.profile?.name ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.profile?.email ?? ''}</p>
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
                          <button onClick={() => approve(p.id)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors">
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => reject(p.id)} className="inline-flex items-center h-7 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold hover:bg-red-500/20 transition-colors">
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
      </div>

      {/* Record Cash Payment */}
      <div className="bg-card border border-border rounded-2xl p-6 max-w-xl space-y-5">
        <div className="pb-3 border-b border-border/50">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" /> Record Cash Payment
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Log a physical cash payment. Looks up the client by email.</p>
        </div>
        {cashError && <AlertBanner variant="error" message={cashError} />}
        {cashSuccess && <AlertBanner variant="success" message={cashSuccess} />}
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OR Number / Notes</label>
              <input type="text" placeholder="GFS-OR-00123" value={cashNotes} onChange={e => setCashNotes(e.target.value)} className={inputCls} />
            </div>
          </div>
          <Button type="submit" className="w-full h-10 font-bold rounded-xl mt-1">Log Cash Payment</Button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Columbarium Tab
// ─────────────────────────────────────────────────────────────
function ColumbariumTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<ColumbariumSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SlotStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('columbarium_slots').select('*').order('row_number').order('col_number')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const q = search.toLowerCase()
  const filtered = rows.filter(s => {
    const matchFilter = filter === 'all' || s.status === filter
    const matchSearch = !q || [s.slot_code, s.occupant_name, s.status].some(v => v?.toLowerCase().includes(q))
    return matchFilter && matchSearch
  })

  const counts = {
    available: rows.filter(s => s.status === 'available').length,
    reserved:  rows.filter(s => s.status === 'reserved').length,
    occupied:  rows.filter(s => s.status === 'occupied').length,
  }

  const slotVariant = (s: string): BadgeVariant =>
    s === 'available' ? 'green' : s === 'reserved' ? 'amber' : 'muted'

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader
        title="Columbarium Slots"
        sub={`${rows.length} total · ${counts.available} available · ${counts.reserved} reserved · ${counts.occupied} occupied`}
      />
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Search slot code or occupant…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'available', 'reserved', 'occupied'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
              {f === 'all' ? `All (${rows.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f as SlotStatus]})`}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState message="No slots match your search." /> : (
        <div className="overflow-x-auto border border-border rounded-2xl bg-card">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Slot</th>
                <th className="px-5 py-3">Row / Col</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Occupant</th>
                <th className="px-5 py-3">Birth / Death</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-foreground">{s.slot_code}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">R{s.row_number} / C{s.col_number}</td>
                  <td className="px-5 py-3.5 font-serif font-bold text-primary">₱{Number(s.price).toLocaleString()}</td>
                  <td className="px-5 py-3.5"><Badge label={s.status} variant={slotVariant(s.status)} /></td>
                  <td className="px-5 py-3.5 text-foreground">{s.occupant_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">
                    {s.occupant_birth_date ?? '—'} / {s.occupant_death_date ?? '—'}
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
// Obituaries Tab
// ─────────────────────────────────────────────────────────────
function ObituariesTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<Obituary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('obituaries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('obituaries').update({ is_published: !current }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: !current } : x))
  }

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="Obituaries" sub={`${rows.length} records · ${rows.filter(r => r.is_published).length} published`} />
      {rows.length === 0 ? <EmptyState message="No obituary records yet." /> : (
        <div className="overflow-x-auto border border-border rounded-2xl bg-card">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Birth</th>
                <th className="px-5 py-3">Death</th>
                <th className="px-5 py-3">Age</th>
                <th className="px-5 py-3">Published</th>
                <th className="px-5 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(o => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-foreground">{o.full_name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{o.birth_date ?? '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{o.death_date ?? '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{o.age ?? '—'}</td>
                  <td className="px-5 py-3.5"><Badge label={o.is_published ? 'Published' : 'Draft'} variant={o.is_published ? 'green' : 'muted'} /></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => togglePublish(o.id, o.is_published)}
                      className={`h-7 px-3 rounded-lg text-[10px] font-bold border transition-all ${o.is_published ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}>
                      {o.is_published ? 'Unpublish' : 'Publish'}
                    </button>
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
      <main className="flex-1 bg-background">



        {/* Sticky tab bar */}
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-16 z-40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-0.5 overflow-x-auto py-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
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
