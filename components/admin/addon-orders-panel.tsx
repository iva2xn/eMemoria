'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import {
  Package, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  X, AlertTriangle, ShoppingCart, User,
} from 'lucide-react'
import { Badge, Spinner, EmptyState, type BadgeVariant } from './admin-primitives'
import { AlertBanner } from '@/components/ui/alert-banner'
import type { AddonOrder, AddonOrderItem, FuneralAddon, AddonOrderStatus } from '@/lib/supabase/types'

// ── Types ────────────────────────────────────────────────────
interface AddonOrderRow extends AddonOrder {
  profile_name?: string
  profile_email?: string
  items: (AddonOrderItem & { addon: FuneralAddon })[]
}

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
}
function fmtPeso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

function statusBadge(s: AddonOrderStatus): BadgeVariant {
  if (s === 'approved' || s === 'paid') return 'green'
  if (s === 'pending') return 'amber'
  if (s === 'rejected' || s === 'cancelled') return 'red'
  return 'muted'
}
function statusLabel(s: AddonOrderStatus) {
  const m: Record<AddonOrderStatus, string> = {
    pending:   'Pending',
    approved:  'Approved',
    rejected:  'Rejected',
    paid:      'Paid',
    cancelled: 'Cancelled',
  }
  return m[s] ?? s
}

// ── Reject modal ─────────────────────────────────────────────
function RejectModal({ orderId, onClose, onConfirm }: { orderId: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm text-foreground">Reject Add-on Order</p>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rejection Reason</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain to the client why the order was rejected…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">Cancel</button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()) }}
            disabled={!reason.trim()}
            className="flex-1 h-10 rounded-xl bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-all disabled:opacity-50"
          >
            Reject Order
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Order detail row ─────────────────────────────────────────
function OrderRow({
  order,
  onApprove,
  onReject,
  processing,
}: {
  order: AddonOrderRow
  onApprove: (id: string) => void
  onReject: (id: string) => void
  processing: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const isProcessing = processing === order.id

  return (
    <div className={`border border-border rounded-xl overflow-hidden ${expanded ? 'bg-muted/10' : 'bg-card'}`}>
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/10 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Client avatar */}
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">
            {(order.profile_name ?? 'C').charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{order.profile_name ?? 'Unknown Client'}</p>
          <p className="text-[10px] text-muted-foreground">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {fmtDate(order.created_at)}
          </p>
        </div>

        {/* Amount + status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <p className="text-sm font-bold text-foreground">{fmtPeso(order.total_amount)}</p>
          <Badge variant={statusBadge(order.status)} label={statusLabel(order.status)} />
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/60 px-4 py-3 space-y-3">

          {/* Client info */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{order.profile_email ?? '—'}</span>
          </div>

          {/* Items table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Qty</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Unit Price</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-border/40 ${i % 2 !== 0 ? 'bg-muted/[0.03]' : ''}`}>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{item.addon?.name ?? 'Unknown Item'}</td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtPeso(item.unit_price)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-foreground">{fmtPeso(item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t border-border">
                  <td colSpan={3} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-primary">{fmtPeso(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Rejection reason */}
          {order.status === 'rejected' && order.rejection_reason && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Rejection Reason</p>
                <p className="text-xs text-foreground mt-0.5">{order.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {order.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onApprove(order.id)}
                disabled={isProcessing}
                className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve Order
              </button>
              <button
                onClick={() => onReject(order.id)}
                disabled={isProcessing}
                className="flex-1 h-9 rounded-xl border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main exported component ───────────────────────────────────
export function AddonOrdersPanel() {
  const supabase    = createClient()
  const [orders,    setOrders]    = useState<AddonOrderRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectId,  setRejectId]  = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('addon_orders')
      .select(`
        *,
        addon_order_items (
          *,
          addon:funeral_addons(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }

    // Fetch profiles for user IDs
    const userIds = [...new Set((data ?? []).map((o: AddonOrder) => o.user_id))]
    let profileMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, { name: p.name, email: p.email }]))
    }

    const enriched: AddonOrderRow[] = (data ?? []).map((o: AddonOrder & { addon_order_items: (AddonOrderItem & { addon: FuneralAddon })[] }) => ({
      ...o,
      profile_name: profileMap[o.user_id]?.name,
      profile_email: profileMap[o.user_id]?.email,
      items: o.addon_order_items ?? [],
    }))

    setOrders(enriched)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('addon-orders-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'addon_orders' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, load])

  const handleApprove = async (orderId: string) => {
    setProcessing(orderId)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('addon_orders')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', orderId)
    if (err) setError(err.message)
    setProcessing(null)
    load()
  }

  const handleReject = async (orderId: string, reason: string) => {
    setProcessing(orderId)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('addon_orders')
      .update({ status: 'rejected', rejection_reason: reason, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', orderId)
    if (err) setError(err.message)
    setRejectId(null)
    setProcessing(null)
    load()
  }

  const filtered = orders.filter(o => statusFilter === 'all' ? true : o.status === statusFilter)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="space-y-4">
      {error && <AlertBanner variant="error" message={error} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Add-on Orders</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 border border-border rounded-xl">
          {(['pending', 'approved', 'paid', 'rejected', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all capitalize ${
                statusFilter === s
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={statusFilter === 'pending' ? 'No pending add-on orders to review.' : `No ${statusFilter} orders found.`} />
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              onApprove={handleApprove}
              onReject={id => setRejectId(id)}
              processing={processing}
            />
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <RejectModal
          orderId={rejectId}
          onClose={() => setRejectId(null)}
          onConfirm={reason => handleReject(rejectId, reason)}
        />
      )}
    </div>
  )
}
