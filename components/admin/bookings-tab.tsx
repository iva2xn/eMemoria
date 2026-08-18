'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, TableShell, Th, FilterPills, type BadgeVariant } from './admin-primitives'
import { X } from 'lucide-react'
import type { Booking, BookingStatus } from '@/lib/supabase/types'

type BookingRow = Booking & { guest_name?: string | null; guest_email?: string | null; profileName?: string; profileEmail?: string; paymentStatus?: string }

// ── Action labels / styles ───────────────────────────────────
const ACTION_META: Record<string, { label: string; confirmLabel: string; confirmCls: string; description: string }> = {
  active: {
    label:        'Finish',
    confirmLabel: 'Confirm Finish',
    confirmCls:   'bg-primary text-primary-foreground hover:bg-primary/90',
    description:  'Mark this booking as finished (active)?',
  },
  cancelled: {
    label:        'Cancel',
    confirmLabel: 'Confirm Cancel',
    confirmCls:   'bg-red-500 text-white hover:bg-red-600',
    description:  'Cancel this booking? The client will no longer have an active reservation.',
  },
  completed: {
    label:        'Complete',
    confirmLabel: 'Confirm Complete',
    confirmCls:   'bg-primary text-primary-foreground hover:bg-primary/90',
    description:  'Mark this booking as fully completed?',
  },
}

// ── 2-Step Booking Action Modal ───────────────────────────────
function BookingActionModal({
  booking,
  newStatus,
  onClose,
  onConfirm,
}: {
  booking: BookingRow
  newStatus: BookingStatus
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const meta = ACTION_META[newStatus]

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-bold text-sm text-foreground">{meta.label} Booking</p>
            <p className="text-[10px] text-muted-foreground">Step {step} of 2</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === 1 ? (
            <>
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Client</span>
                  <span className="font-bold text-foreground">{booking.profileName ?? booking.guest_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Package</span>
                  <span className="font-semibold text-foreground">{booking.package_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Current status</span>
                  <span className="font-semibold capitalize text-foreground">{booking.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Action</span>
                  <span className="font-bold capitalize text-foreground">{meta.label}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                  Confirm Action
                </p>
                <p className="text-sm text-foreground">{meta.description}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold disabled:opacity-50 transition-all ${meta.confirmCls}`}
                >
                  {loading ? 'Saving…' : meta.confirmLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function BookingsTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')

  // 2-step confirm state
  const [pendingAction, setPendingAction] = useState<{ booking: BookingRow; newStatus: BookingStatus } | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: bookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
      if (!bookings) { setLoading(false); return }
      const userIds = [...new Set(bookings.filter(b => b.user_id).map(b => b.user_id as string))]
      let profileMap: Record<string, { name: string; email: string }> = {}
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
      }
      const bookingIds = bookings.map(b => b.id)
      const { data: payments } = await supabase.from('payments').select('id,booking_id,user_id,guest_email,status,product_type,product_ref').eq('status', 'approved')
      const approvedByBookingId = new Set<string>()
      const approvedByEmailRef = new Set<string>()
      const approvedByUserRef = new Set<string>()
      if (payments) {
        payments.forEach(p => {
          if (p.booking_id && bookingIds.includes(p.booking_id)) { approvedByBookingId.add(p.booking_id) }
          else {
            const ref = (p.product_ref ?? '').toLowerCase()
            if (p.guest_email) approvedByEmailRef.add(`${p.guest_email.toLowerCase()}|${ref}`)
            if (p.user_id)     approvedByUserRef.add(`${p.user_id}|${ref}`)
          }
        })
      }
      setRows(bookings.map(b => {
        let isPaid = false
        if (approvedByBookingId.has(b.id)) { isPaid = true }
        else {
          const ref = (b.package_name ?? '').toLowerCase()
          if (b.guest_email) isPaid = approvedByEmailRef.has(`${b.guest_email.toLowerCase()}|${ref}`)
          else if (b.user_id) isPaid = approvedByUserRef.has(`${b.user_id}|${ref}`)
        }
        return { ...b, profileName: b.user_id ? profileMap[b.user_id]?.name : undefined, profileEmail: b.user_id ? profileMap[b.user_id]?.email : undefined, paymentStatus: isPaid ? 'paid' : 'unpaid' }
      }))
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const updateStatus = async (id: string, status: BookingStatus) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const statusVariant = (s: string): BadgeVariant => s === 'active' ? 'green' : s === 'pending' ? 'amber' : s === 'cancelled' ? 'red' : 'muted'

  const filterOptions = ([
    { value: 'all' as const,       label: `All (${rows.length})` },
    { value: 'pending' as const,   label: `Pending (${rows.filter(r => r.status === 'pending').length})` },
    { value: 'active' as const,    label: `Active (${rows.filter(r => r.status === 'active').length})` },
    { value: 'completed' as const, label: `Completed (${rows.filter(r => r.status === 'completed').length})` },
    { value: 'cancelled' as const, label: `Cancelled (${rows.filter(r => r.status === 'cancelled').length})` },
  ])

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="Bookings" sub={`${rows.length} total memorial service reservations`} />
      <FilterPills options={filterOptions} active={filter} onChange={setFilter} />

      {/* 2-step action modal */}
      {pendingAction && (
        <BookingActionModal
          booking={pendingAction.booking}
          newStatus={pendingAction.newStatus}
          onClose={() => setPendingAction(null)}
          onConfirm={async () => {
            await updateStatus(pendingAction.booking.id, pendingAction.newStatus)
            setPendingAction(null)
          }}
        />
      )}

      {filtered.length === 0 ? <EmptyState message="No bookings match this filter." /> : (
        <TableShell>
          <thead><tr>
            <Th>Client</Th><Th>Package</Th><Th>Amount</Th>
            <Th>Date</Th><Th>Status</Th><Th>Payment</Th><Th>Actions</Th>
          </tr></thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map(b => (
              <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-foreground text-sm">{b.profileName ?? b.guest_name ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">{b.profileEmail ?? b.guest_email ?? ''}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-foreground">{b.package_name}</td>
                <td className="px-5 py-3.5 font-bold text-primary text-sm">₱{Number(b.price).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3.5"><Badge label={b.status} variant={statusVariant(b.status)} /></td>
                <td className="px-5 py-3.5">
                  <Badge label={b.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'} variant={b.paymentStatus === 'paid' ? 'green' : 'red'} />
                </td>
                <td className="px-5 py-3.5">
                  {b.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setPendingAction({ booking: b, newStatus: 'active' })}
                        className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90"
                      >
                        Finish
                      </button>
                      <button
                        onClick={() => setPendingAction({ booking: b, newStatus: 'cancelled' })}
                        className="h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {b.status === 'active' && (
                    <button
                      onClick={() => setPendingAction({ booking: b, newStatus: 'completed' })}
                      className="h-7 px-2.5 rounded-lg border border-border text-muted-foreground text-[10px] font-bold hover:border-primary/40"
                    >
                      Complete
                    </button>
                  )}
                  {(b.status === 'completed' || b.status === 'cancelled') && <span className="text-[10px] text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  )
}
