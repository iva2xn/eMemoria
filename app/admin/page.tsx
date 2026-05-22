'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { StatCard } from '@/components/ui/stat-card'
import { TarpPreview } from '@/components/ui/tarp-preview'
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
// Overview Tab — live Supabase counts
// ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const supabase = createClient()
  const [stats, setStats] = useState({ pending: 0, totalBookings: 0, inquiries: 0, profiles: 0, totalRevenue: 0 })
  const [pendingPayments, setPendingPayments] = useState<(Payment & { guest_name?: string; guest_email?: string })[]>([])
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([])
  const [recentBookings, setRecentBookings] = useState<(Booking & { guest_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

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
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={<Clock className="h-5 w-5 text-primary animate-pulse" />} label="Pending Payments" value={String(stats.pending)} />
        <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label="Total Bookings" value={String(stats.totalBookings)} />
        <StatCard icon={<Mail className="h-5 w-5 text-primary" />} label="Inquiries" value={String(stats.inquiries)} />
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Registered Users" value={String(stats.profiles)} />
        <StatCard icon={<Landmark className="h-5 w-5 text-primary" />} label="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString()}`} />
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

      // Fetch payments to determine paid status per booking
      // Match by guest_email for guests, or by user_id+product_type for logged-in users
      const { data: payments } = await supabase
        .from('payments')
        .select('user_id,guest_email,status,product_type')
        .eq('status', 'approved')
        .in('product_type', ['package', 'columbarium', 'cremation', 'urn', 'general'])

      // Build a set of keys that have approved payments
      // Key = guest_email for guests, user_id for logged-in (but only non-admin payments)
      const approvedEmails = new Set<string>()
      const approvedUserIds = new Set<string>()
      if (payments) {
        payments.forEach(p => {
          if (p.guest_email) approvedEmails.add(p.guest_email.toLowerCase())
          if (p.user_id) approvedUserIds.add(p.user_id)
        })
      }

      setRows(bookings.map(b => {
        let isPaid = false
        if (b.guest_email) {
          isPaid = approvedEmails.has(b.guest_email.toLowerCase())
        } else if (b.user_id) {
          // Only mark paid if there's an approved payment from this user
          // that is NOT the admin's own cash recording
          isPaid = approvedUserIds.has(b.user_id)
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

  useEffect(() => {
    supabase.from('columbarium_slots').select('*').order('row_number').order('col_number')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const counts = {
    available: rows.filter(s => s.status === 'available').length,
    reserved:  rows.filter(s => s.status === 'reserved').length,
    occupied:  rows.filter(s => s.status === 'occupied').length,
  }

  const slotColor = (s: string) =>
    s === 'available' ? 'bg-primary hover:bg-primary/80 cursor-pointer'
    : s === 'reserved'  ? 'bg-amber-500 hover:bg-amber-400 cursor-pointer'
    : 'bg-red-500 cursor-default'

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
                          disabled={slot.status === 'occupied'}
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
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 max-w-sm">
          <div className="flex items-center justify-between">
            <p className="font-mono font-bold text-foreground text-base">{selected.slot_code}</p>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-muted-foreground">Level</p><p className="font-semibold">{ROW_LABELS_ADMIN[selected.row_number]}</p></div>
            <div><p className="text-muted-foreground">Price</p><p className="font-bold text-primary">₱{Number(selected.price).toLocaleString()}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground mb-1">Status</p><Badge label={selected.status} variant={selected.status === 'available' ? 'green' : selected.status === 'reserved' ? 'amber' : 'red'} /></div>
            {selected.occupant_name && <div className="col-span-2"><p className="text-muted-foreground">Occupant</p><p className="font-semibold">{selected.occupant_name}</p></div>}
            {selected.occupant_birth_date && <div><p className="text-muted-foreground">Born</p><p>{selected.occupant_birth_date}</p></div>}
            {selected.occupant_death_date && <div><p className="text-muted-foreground">Died</p><p>{selected.occupant_death_date}</p></div>}
            {selected.reserved_at && <div className="col-span-2"><p className="text-muted-foreground">Reserved At</p><p className="font-mono text-[10px]">{new Date(selected.reserved_at).toLocaleString()}</p></div>}
          </div>
        </div>
      )}
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
      <SectionHeader title="Obituaries" sub={`${rows.length} records · ${rows.filter(r => r.is_published).length} published`} />

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
