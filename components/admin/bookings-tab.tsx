'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, type BadgeVariant } from './admin-primitives'
import type { Booking, BookingStatus } from '@/lib/supabase/types'

type BookingRow = Booking & {
  guest_name?: string | null
  guest_email?: string | null
  profileName?: string
  profileEmail?: string
  paymentStatus?: string
}

export function BookingsTab() {
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

      const userIds = [...new Set(bookings.filter(b => b.user_id).map(b => b.user_id as string))]
      let profileMap: Record<string, { name: string; email: string }> = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
      }

      const bookingIds = bookings.map(b => b.id)
      const { data: payments } = await supabase
        .from('payments')
        .select('id,booking_id,user_id,guest_email,status,product_type,product_ref')
        .eq('status', 'approved')

      const approvedByBookingId = new Set<string>()
      const approvedByEmailRef  = new Set<string>()
      const approvedByUserRef   = new Set<string>()

      if (payments) {
        payments.forEach(p => {
          if (p.booking_id && bookingIds.includes(p.booking_id)) {
            approvedByBookingId.add(p.booking_id)
          } else {
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
          const ref = (b.package_name ?? '').toLowerCase()
          if (b.guest_email) {
            isPaid = approvedByEmailRef.has(`${b.guest_email.toLowerCase()}|${ref}`)
          } else if (b.user_id) {
            isPaid = approvedByUserRef.has(`${b.user_id}|${ref}`)
          }
        }
        return {
          ...b,
          profileName:   b.user_id ? profileMap[b.user_id]?.name  : undefined,
          profileEmail:  b.user_id ? profileMap[b.user_id]?.email : undefined,
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
