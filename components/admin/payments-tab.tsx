'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import {
  Badge, SectionHeader, EmptyState, Spinner,
  FilterPills, SearchInput, inputCls, type BadgeVariant,
} from './admin-primitives'
import { PaymentInfoCard } from './payment-info-card'
import {
  Check, Banknote, X, Ban, Eye, Download,
  Printer, ChevronLeft, AlertTriangle, ChevronDown,
  Receipt,
} from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import { generateReceipt } from '@/lib/generate-receipt'
import type { Payment, PaymentStatus, UserRole } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────
type RawPayment = Payment & {
  void_reason?: string | null
  void_comment?: string | null
  voided_by?: string | null
  voided_at?: string | null
}
type PaymentRow = RawPayment & { profileName?: string; profileEmail?: string }

// ── Service catalog ───────────────────────────────────────────
const SERVICES = [
  // Traditional packages
  { label: 'OMB Package',           type: 'package',    price: 25000 },
  { label: 'Half Glass Package',    type: 'package',    price: 35000 },
  { label: 'JR Full Glass Package', type: 'package',    price: 47000 },
  { label: 'SR Full Glass Package', type: 'package',    price: 57000 },
  { label: 'Premium Package',       type: 'package',    price: 75000 },
  // Cremation
  { label: 'Cremation Service',     type: 'cremation',  price: 25000 },
  // Urns
  { label: 'Wooden Urn',            type: 'urn',        price: 3500  },
  { label: 'Black Metal Urn',       type: 'urn',        price: 3500  },
  { label: 'Gray Metal Urn',        type: 'urn',        price: 5500  },
  { label: 'Brown Metal Urn',       type: 'urn',        price: 15000 },
  { label: 'Blue Metal Urn',        type: 'urn',        price: 15000 },
  { label: 'White Marble Urn',      type: 'urn',        price: 5500  },
  // Columbarium
  { label: 'Columbarium Slot',      type: 'columbarium', price: 0    },
  // General
  { label: 'General Service',       type: 'general',    price: 0     },
] as const

const VOID_REASONS = [
  'Duplicate entry', 'Client cancellation', 'Data entry error',
  'Refund issued', 'Test/demo record', 'Other',
] as const

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
}
function fmtAmt(n: number) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
function clientName(p: PaymentRow) { return p.profileName ?? p.guest_name ?? '—' }
function clientEmail(p: PaymentRow) { return p.profileEmail ?? p.guest_email ?? '' }

function statusVariant(s: string): BadgeVariant {
  if (s === 'approved') return 'green'
  if (s === 'pending')  return 'amber'
  if (s === 'voided')   return 'muted'
  return 'red'
}

// ── Void Modal ─────────────────────────────────────────────────
function VoidModal({ row, onClose, onVoided }: {
  row: PaymentRow; onClose: () => void; onVoided: (id: string) => void
}) {
  const supabase = createClient()
  const [reason,  setReason]  = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const isOther   = reason === 'Other'
  const canSubmit = reason && (!isOther || comment.trim().length > 0)

  const handle = async () => {
    if (!canSubmit) { setError('Please select a reason.'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    const { error: err } = await supabase.from('payments').update({
      status: 'voided', void_reason: reason,
      void_comment: isOther ? comment.trim() : (comment.trim() || null),
      voided_by: user?.id ?? null, voided_at: new Date().toISOString(),
    }).eq('id', row.id)
    if (err) { setError(err.message); setLoading(false); return }
    await logActivity({ category: 'log', event_type: 'payment_voided', entity_table: 'payments', entity_id: row.id, actor_id: user?.id, actor_name: actorName, message: `${actorName} voided payment from ${clientName(row)} — ${reason}`, metadata: { amount: row.amount, reason } })
    setLoading(false); onVoided(row.id); onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center"><Ban className="h-4 w-4 text-destructive" /></div>
            <div><h3 className="text-sm font-bold text-foreground">Void Transaction</h3><p className="text-[10px] text-muted-foreground">Auditable and reversible.</p></div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Client</span><span className="font-semibold">{clientName(row)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">{fmtAmt(row.amount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Method</span><span className="capitalize">{row.method.replace('_', ' ')}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Date</span><span>{fmtDate(row.created_at)}</span></div>
          </div>
          {error && <AlertBanner variant="error" message={error} />}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason <span className="text-destructive">*</span></label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
              <option value="">— Select a reason —</option>
              {VOID_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {isOther && <div className="space-y-1.5"><label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Reason <span className="text-destructive">*</span></label><textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe why…" maxLength={300} className={`${inputCls} h-auto resize-none py-2.5`} /></div>}
          {!isOther && reason && <div className="space-y-1.5"><label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comment (optional)</label><textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Any extra notes…" maxLength={300} className={`${inputCls} h-auto resize-none py-2.5`} /></div>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
            <button onClick={handle} disabled={!canSubmit || loading} className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 disabled:opacity-40 transition-all">{loading ? 'Voiding…' : 'Void Transaction'}</button>
          </div>
        </div>
      </div>
    </div>, document.body
  )
}

// ── Review Approve Modal ──────────────────────────────────────
function ReviewApproveModal({ row, onClose, onApproved, onRejected }: {
  row: PaymentRow; onClose: () => void
  onApproved: (id: string) => void; onRejected: (id: string) => void
}) {
  const supabase = createClient()
  const [rejectMode,   setRejectMode]   = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const receiptRef = useRef<HTMLImageElement>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [lightbox,   setLightbox]   = useState(false)

  useEffect(() => {
    if (!row.receipt_file_path) return
    supabase.storage.from('payments').createSignedUrl(row.receipt_file_path, 3600)
      .then(({ data }) => setReceiptUrl(data?.signedUrl ?? null))
  }, [row.receipt_file_path, supabase])

  const handleApprove = async () => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', row.id)
    if (row.product_type === 'columbarium' && row.product_ref) {
      await supabase.from('columbarium_slots').update({ status: 'reserved', reserved_by_user_id: row.user_id ?? null, reserved_at: new Date().toISOString() }).eq('slot_code', row.product_ref).eq('status', 'available')
    }

    // ── Auto-create wake for traditional burial packages ──────
    if (row.product_type === 'package' && row.user_id) {
      // Idempotency: only create if no wake exists for this booking
      const existingWake = row.booking_id
        ? (await supabase.from('wakes').select('id').eq('booking_id', row.booking_id).maybeSingle()).data
        : null
      const existingByUser = !row.booking_id
        ? (await supabase.from('wakes').select('id').eq('user_id', row.user_id).maybeSingle()).data
        : null

      if (!existingWake && !existingByUser) {
        // Try to get deceased name from the user's most recent obituary
        const { data: obit } = await supabase
          .from('obituaries')
          .select('full_name')
          .eq('user_id', row.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const deceasedName = obit?.full_name ?? 'Deceased (to be filled by staff)'

        // Default schedule: pickup tomorrow 8 AM, 3-day wake
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(8, 0, 0, 0)

        const wakeStart = new Date(tomorrow)
        wakeStart.setDate(wakeStart.getDate() + 1)

        const wakeEnd = new Date(wakeStart)
        wakeEnd.setDate(wakeEnd.getDate() + 3)

        const toDateStr = (d: Date) => d.toISOString().split('T')[0]

        await supabase.from('wakes').insert({
          booking_id:      row.booking_id ?? null,
          user_id:         row.user_id,
          deceased_name:   deceasedName,
          pickup_datetime: tomorrow.toISOString(),
          wake_start_date: toDateStr(wakeStart),
          wake_end_date:   toDateStr(wakeEnd),
          notes:           `Auto-generated upon payment approval for ${row.product_ref ?? 'package'}. Please update pickup time, wake dates, and burial location as needed.`,
        })

        await logActivity({
          category:     'log',
          event_type:   'wake_auto_created',
          entity_table: 'wakes',
          entity_id:    undefined,
          actor_id:     user?.id,
          actor_name:   actorName,
          message:      `Wake schedule auto-created for ${clientName(row)} (${deceasedName}) after ${row.product_ref ?? 'package'} payment approval`,
          metadata:     { deceased: deceasedName, package: row.product_ref, client: clientName(row) },
        })
      }
    }

    await logActivity({ category: 'log', event_type: 'payment_approved', entity_table: 'payments', entity_id: row.id, actor_id: user?.id, actor_name: actorName, message: `${actorName} approved ${fmtAmt(row.amount)} from ${clientName(row)}`, metadata: { amount: row.amount } })

    // Insert in-app notification for the client
    if (row.user_id) {
      await supabase.from('client_notifications').insert({
        user_id:      row.user_id,
        event_type:   'payment_approved',
        entity_table: 'payments',
        entity_id:    row.id,
        message:      `Your payment of ${fmtAmt(row.amount)} has been approved. Thank you!`,
        metadata:     { amount: row.amount, method: row.method, product_type: row.product_type, status: 'approved' },
        action_url:   '/notifications',
      })
    }

    // Send receipt email to the client (fire-and-forget — don't block UI)
    const email = clientEmail(row)
    if (email) {
      const productRef = row.product_ref ?? null
      const labelForReceipt = productRef ?? row.product_type
      fetch('/api/notify-payment-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId:       row.id,
          recipientEmail:  email,
          recipientName:   clientName(row),
          amount:          row.amount,
          method:          row.method,
          referenceNumber: row.reference_number ?? null,
          productLabel:    labelForReceipt,
          productType:     row.product_type,
          approvedAt:      new Date().toISOString(),
          createdAt:       row.created_at,
          notes:           row.notes ?? null,
        }),
      }).catch(e => console.warn('[receipt email]', e))
    }

    setLoading(false); onApproved(row.id)
    onClose()
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Reason required.'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', row.id)
    await logActivity({ category: 'log', event_type: 'payment_rejected', entity_table: 'payments', entity_id: row.id, actor_id: user?.id, actor_name: actorName, message: `${actorName} rejected payment from ${clientName(row)}: ${rejectReason}`, metadata: { reason: rejectReason } })

    // In-app notification for the client
    if (row.user_id) {
      await supabase.from('client_notifications').insert({
        user_id:      row.user_id,
        event_type:   'payment_rejected',
        entity_table: 'payments',
        entity_id:    row.id,
        message:      `Your payment of ${fmtAmt(row.amount)} was not approved. Reason: ${rejectReason}`,
        metadata:     { amount: row.amount, method: row.method, product_type: row.product_type, status: 'rejected', rejection_reason: rejectReason },
        action_url:   '/notifications',
      })
    }

    setLoading(false); onRejected(row.id); onClose()
  }

  return createPortal(
    <>
      {lightbox && receiptUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={() => setLightbox(false)}>
          <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-white">Payment Receipt</p>
            <button onClick={() => setLightbox(false)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto flex items-start justify-center p-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptUrl} alt="Receipt" className="block max-w-full max-h-[80vh] w-auto h-auto rounded-lg shadow-2xl mx-auto object-contain" />
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-[200] overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="flex min-h-full items-start justify-center p-4 pt-8">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Eye className="h-4 w-4 text-primary" />
                <div><h3 className="text-sm font-bold text-foreground">Review Payment</h3><p className="text-[10px] text-muted-foreground">{clientName(row)} · {fmtAmt(row.amount)}</p></div>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Payment details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Client',    value: clientName(row) },
                  { label: 'Email',     value: clientEmail(row) || '—' },
                  { label: 'Phone',     value: row.guest_phone ?? '—' },
                  { label: 'Method',    value: row.method.replace('_', ' ').toUpperCase() },
                  { label: 'Reference', value: row.reference_number ?? '—' },
                  { label: 'Amount',    value: fmtAmt(row.amount) },
                  { label: 'Product',   value: row.product_type },
                  { label: 'Date',      value: fmtDate(row.created_at) },
                ].map(f => (
                  <div key={f.label} className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                    <p className="font-semibold text-foreground truncate">{f.value}</p>
                  </div>
                ))}
              </div>
              {/* Senior/PWD flag */}
              {row.senior_pwd_discount && (
                <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">%</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Senior Citizen / PWD Discount Requested</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Verify the attached proof before approving.</p>
                  </div>
                </div>
              )}
              {/* Receipt */}
              {receiptUrl && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Payment Receipt</p>
                  <button className="w-full block relative group rounded-xl overflow-hidden border border-border bg-muted/20" onClick={() => setLightbox(true)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img ref={receiptRef} src={receiptUrl} alt="Receipt" className="block w-full h-auto" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-1">Click to view full screen</p>
                </div>
              )}
              {/* Notes */}
              {row.notes && (
                <div className="bg-muted/20 border border-border/60 rounded-xl px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Notes</p>
                  <p className="text-xs text-foreground">{row.notes}</p>
                </div>
              )}
              {rejectMode && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rejection Reason <span className="text-destructive">*</span></label>
                  <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection…" maxLength={300} className={`${inputCls} h-auto resize-none py-2.5`} />
                </div>
              )}
              {error && <AlertBanner variant="error" message={error} />}
              <div className="flex gap-2 pt-1">
                {!rejectMode ? (
                  <>
                    <button onClick={() => setRejectMode(true)} className="flex-1 h-10 rounded-xl border border-destructive/30 text-destructive text-sm font-bold hover:bg-destructive/10 transition-all">Reject</button>
                    <button onClick={handleApprove} disabled={loading} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />{loading ? 'Approving…' : 'Approve Payment'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setRejectMode(false); setError('') }} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Back</button>
                    <button onClick={handleReject} disabled={loading || !rejectReason.trim()} className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 disabled:opacity-40 transition-all">{loading ? 'Rejecting…' : 'Reject Payment'}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>, document.body
  )
}

// ── Cash Modal — improved 2-step ──────────────────────────────
function CashModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const [step,        setStep]        = useState<'form' | 'review'>('form')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [serviceIdx,  setServiceIdx]  = useState<number | ''>('')
  const [customPrice, setCustomPrice] = useState('')
  const [seniorPwd,   setSeniorPwd]   = useState(false)
  const [includeUrn,  setIncludeUrn]  = useState(false)
  const [urnIdx,      setUrnIdx]      = useState<number | ''>('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const selectedService = typeof serviceIdx === 'number' ? SERVICES[serviceIdx] : null
  const isCremation     = selectedService?.type === 'cremation'

  // Urn options — indices 6–11 in SERVICES
  const URN_SERVICES = SERVICES.slice(6, 12)
  const selectedUrn  = typeof urnIdx === 'number' ? URN_SERVICES[urnIdx] : null

  const servicePrice = selectedService
    ? (selectedService.price > 0 ? selectedService.price : Number(customPrice) || 0)
    : 0
  const urnPrice     = (isCremation && includeUrn && selectedUrn) ? selectedUrn.price : 0
  const basePrice    = servicePrice + urnPrice
  const discount     = seniorPwd ? Math.round(basePrice * 0.2 * 100) / 100 : 0
  const finalAmount  = basePrice - discount
  const needsCustom  = selectedService?.price === 0

  // Reset urn when service changes away from cremation
  const handleServiceChange = (val: string) => {
    setServiceIdx(val === '' ? '' : Number(val))
    setCustomPrice('')
    setSeniorPwd(false)
    setIncludeUrn(false)
    setUrnIdx('')
  }

  const handleNext = () => {
    setError('')
    if (!name.trim())       { setError('Client name is required.'); return }
    if (!phone.trim())      { setError('Phone number is required.'); return }
    if (serviceIdx === '')  { setError('Please select a service.'); return }
    if (needsCustom && (!customPrice || Number(customPrice) <= 0)) { setError('Please enter the amount.'); return }
    if (isCremation && includeUrn && urnIdx === '') { setError('Please select an urn.'); return }
    setStep('review')
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()

    const noteParts: string[] = []
    if (seniorPwd) noteParts.push(`Senior/PWD 20% discount applied. Original: ${fmtAmt(basePrice)}`)
    if (isCremation && includeUrn && selectedUrn) noteParts.push(`Urn: ${selectedUrn.label} (+${fmtAmt(selectedUrn.price)})`)
    if (isCremation && !includeUrn) noteParts.push('Client using own urn')
    const notes = noteParts.join(' · ') || null

    // Build product_ref to include urn info
    const productRef = isCremation && includeUrn && selectedUrn
      ? `Cremation Service + ${selectedUrn.label}`
      : selectedService?.label ?? null

    const { error: err } = await supabase.from('payments').insert({
      user_id:      profile?.id ?? null,
      guest_name:   profile ? null : name.trim(),
      guest_email:  profile ? null : (email.trim() || null),
      guest_phone:  phone.trim(),
      product_type: selectedService?.type ?? 'general',
      product_ref:  productRef,
      method:       'cash',
      amount:       finalAmount,
      status:       'approved',
      notes,
      approved_at:  new Date().toISOString(),
    })
    setLoading(false)
    if (err) { setError(err.message); setStep('form'); return }
    onSuccess(); onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'review' && (
              <button onClick={() => setStep('form')} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <Banknote className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">{step === 'form' ? 'Record Cash Payment' : 'Review Before Recording'}</h3>
              <p className="text-[10px] text-muted-foreground">{step === 'form' ? 'Step 1 of 2 — Client & Service' : 'Step 2 of 2 — Confirm details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          {step === 'form' ? (
            <>
              {/* Client info */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Name <span className="text-destructive">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Dela Cruz" maxLength={100} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number <span className="text-destructive">*</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+63 912 345 6789" maxLength={20} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address <span className="text-muted-foreground/50 font-normal">(optional)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@example.com" className={inputCls} />
              </div>

              {/* Service */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Funeral Service <span className="text-destructive">*</span></label>
                <select value={serviceIdx} onChange={e => handleServiceChange(e.target.value)} className={inputCls}>
                  <option value="">— Select a service —</option>
                  <optgroup label="Traditional Packages">
                    {SERVICES.slice(0, 5).map((s, i) => <option key={i} value={i}>{s.label} — {s.price > 0 ? fmtAmt(s.price) : 'Custom'}</option>)}
                  </optgroup>
                  <optgroup label="Cremation">
                    {SERVICES.slice(5, 6).map((s, i) => <option key={i + 5} value={i + 5}>{s.label} — {fmtAmt(s.price)}</option>)}
                  </optgroup>
                  <optgroup label="Urns">
                    {SERVICES.slice(6, 12).map((s, i) => <option key={i + 6} value={i + 6}>{s.label} — {fmtAmt(s.price)}</option>)}
                  </optgroup>
                  <optgroup label="Other">
                    {SERVICES.slice(12).map((s, i) => <option key={i + 12} value={i + 12}>{s.label}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Urn add-on — only for cremation */}
              {isCremation && (
                <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" checked={includeUrn} onChange={e => { setIncludeUrn(e.target.checked); setUrnIdx('') }} className="sr-only peer" />
                      <div className="h-5 w-5 rounded border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                        {includeUrn && <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Client availed an urn</p>
                      <p className="text-[10px] text-muted-foreground">Check if client is purchasing an urn with the cremation service</p>
                    </div>
                  </label>
                  {includeUrn && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Urn <span className="text-destructive">*</span></label>
                      <select value={urnIdx} onChange={e => setUrnIdx(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                        <option value="">— Select an urn —</option>
                        {URN_SERVICES.map((u, i) => (
                          <option key={i} value={i}>{u.label} — {fmtAmt(u.price)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Custom price for columbarium/general */}
              {needsCustom && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount (₱) <span className="text-destructive">*</span></label>
                  <input type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="Enter amount" min="1" className={inputCls} />
                </div>
              )}

              {/* Price display */}
              {selectedService && basePrice > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Price Breakdown</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{selectedService.label}</span>
                    <span className="font-mono font-semibold text-foreground">{fmtAmt(servicePrice)}</span>
                  </div>
                  {isCremation && includeUrn && selectedUrn && (
                    <div className="flex justify-between text-primary">
                      <span>{selectedUrn.label}</span>
                      <span className="font-mono">+ {fmtAmt(urnPrice)}</span>
                    </div>
                  )}
                  {(isCremation && includeUrn && selectedUrn) && (
                    <div className="flex justify-between font-bold text-primary border-t border-primary/20 pt-1 mt-1">
                      <span>Subtotal</span>
                      <span className="font-mono">{fmtAmt(basePrice)}</span>
                    </div>
                  )}
                  {!(isCremation && includeUrn && selectedUrn) && (
                    <div className="flex justify-between font-bold text-primary pt-0.5">
                      <span>Total</span>
                      <span className="font-mono text-base">{fmtAmt(basePrice)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Senior/PWD discount */}
              {selectedService && basePrice > 0 && (
                <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" checked={seniorPwd} onChange={e => setSeniorPwd(e.target.checked)} className="sr-only peer" />
                      <div className="h-5 w-5 rounded border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                        {seniorPwd && <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Senior Citizen / PWD — 20% Discount</p>
                      <p className="text-[10px] text-muted-foreground">Check if client has valid Senior ID or PWD card</p>
                    </div>
                  </label>
                  {seniorPwd && basePrice > 0 && (
                    <div className="bg-card border border-border/60 rounded-xl p-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Original</span><span className="font-mono">{fmtAmt(basePrice)}</span></div>
                      <div className="flex justify-between text-primary"><span>20% Discount</span><span className="font-mono">− {fmtAmt(discount)}</span></div>
                      <div className="flex justify-between font-bold text-primary border-t border-border/40 pt-1"><span>Amount Payable</span><span className="font-mono">{fmtAmt(finalAmount)}</span></div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Review step */
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Payment Summary</p>
                </div>
                <div className="divide-y divide-border/40">
                  {[
                    { label: 'Client',  value: name },
                    { label: 'Phone',   value: phone },
                    ...(email ? [{ label: 'Email', value: email }] : []),
                    { label: 'Service', value: selectedService?.label ?? '—' },
                    ...(isCremation && includeUrn && selectedUrn ? [{ label: 'Urn', value: `${selectedUrn.label} (+${fmtAmt(urnPrice)})` }] : []),
                    ...(isCremation && !includeUrn ? [{ label: 'Urn', value: 'Client using own urn' }] : []),
                    { label: 'Method',  value: 'Cash' },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-semibold text-foreground">{f.value}</span>
                    </div>
                  ))}
                  {seniorPwd && (
                    <>
                      <div className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">Original Price</span>
                        <span className="font-mono text-muted-foreground line-through">{fmtAmt(basePrice)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-xs text-primary">
                        <span>Senior/PWD Discount (20%)</span>
                        <span className="font-mono">− {fmtAmt(discount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between px-4 py-3 text-sm font-bold bg-primary/[0.04]">
                    <span className="text-primary/70 uppercase tracking-wider text-[10px] font-black">Total Amount</span>
                    <span className="text-primary">{fmtAmt(finalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-muted/30 border border-border/60 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">This will be recorded as an approved cash payment immediately. Please verify all details before confirming.</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
          {step === 'form' ? (
            <>
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
              <button onClick={handleNext} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">Review →</button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('form')} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Edit</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
                <Check className="h-3.5 w-3.5" />{loading ? 'Recording…' : 'Confirm & Record'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>, document.body
  )
}

// ── Export / Print Receipt ────────────────────────────────────
async function exportReceiptPDF(rows: PaymentRow[], title = 'Payment Receipt') {
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const PRIMARY: [number, number, number] = [34, 107, 66]
  const LIGHT:   [number, number, number] = [240, 247, 243]
  const DARK:    [number, number, number] = [30,  40,  35]
  const isSingle = rows.length === 1
  const doc = new jsPDF({ orientation: isSingle ? 'portrait' : 'landscape', unit: 'mm', format: isSingle ? 'a5' : 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setFillColor(...PRIMARY); doc.rect(0, 0, pageW, 28, 'F')
  try {
    const res = await fetch('/logo.png'); const blob = await res.blob()
    const b64 = await new Promise<string>(res2 => { const r = new FileReader(); r.onloadend = () => res2(r.result as string); r.readAsDataURL(blob) })
    doc.addImage(b64, 'PNG', 8, 4, 20, 20)
  } catch { /* logo optional */ }
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(12)
  doc.text('eMemoria', 32, 11)
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(200,230,210)
  doc.text('Funeral Services', 32, 17)
  doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(255,255,255)
  doc.text(title, pageW / 2, 16, { align: 'center' })
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(200,230,210)
  doc.text(`${new Date().toLocaleString('en-PH')}`, pageW - 8, 10, { align: 'right' })

  if (isSingle) {
    const r = rows[0]
    const startY = 34
    const fields = [
      ['Receipt For',       clientName(r)],
      ['Email',             clientEmail(r) || '—'],
      ['Phone',             r.guest_phone ?? '—'],
      ['Service / Product', r.product_type + (r.product_ref ? ` — ${r.product_ref}` : '')],
      ['Payment Method',    r.method.replace('_',' ').toUpperCase()],
      ['Reference #',       r.reference_number ?? '—'],
      ['Date',              fmtDate(r.created_at)],
      ['Status',            r.status.toUpperCase()],
    ]
    doc.setFillColor(...LIGHT); doc.rect(8, startY, pageW - 16, fields.length * 8.5 + 6, 'F')
    doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.3)
    doc.rect(8, startY, pageW - 16, fields.length * 8.5 + 6)
    let y = startY + 7
    fields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100,120,110)
      doc.text(label, 14, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      doc.text(String(value), pageW - 14, y, { align: 'right' })
      y += 8.5
    })
    // Amount box
    const amtY = y + 6
    doc.setFillColor(...PRIMARY); doc.rect(8, amtY, pageW - 16, 14, 'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(200,230,210)
    doc.text('AMOUNT PAID', 14, amtY + 6)
    doc.setFontSize(14); doc.setTextColor(255,255,255)
    doc.text(`PHP ${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageW - 14, amtY + 8, { align: 'right' })
    // Footer
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(150,160,155)
    doc.text('eMemoria Funeral Services · Sariaya, Quezon · +63 918 901 9978', pageW / 2, pageH - 8, { align: 'center' })
    doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.3); doc.line(8, pageH - 10, pageW - 8, pageH - 10)
  } else {
    const approved = rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0)
    doc.setFillColor(...LIGHT); doc.rect(0, 28, pageW, 10, 'F')
    doc.setFontSize(7.5); doc.setTextColor(...DARK)
    doc.text(`Records: ${rows.length}   |   Total Approved: PHP ${approved.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, pageW / 2, 34.5, { align: 'center' })
    autoTable(doc, {
      startY: 42,
      head: [['#','Date','Client','Service','Method','Ref #','Amount','Status']],
      body: rows.map((r, i) => [i+1, fmtDate(r.created_at), clientName(r), r.product_type, r.method.replace('_',' ').toUpperCase(), r.reference_number ?? '—', Number(r.amount).toLocaleString('en-PH',{minimumFractionDigits:2}), r.status.toUpperCase()]),
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [220,230,225], lineWidth: 0.2 },
      headStyles: { fillColor: PRIMARY, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250,253,251] },
      margin: { left: 8, right: 8 },
      didDrawPage: (data: { pageNumber: number }) => {
        const pg = doc.getNumberOfPages()
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(150,160,155)
        doc.text(`eMemoria Funeral Services · Receipt Register · Page ${data.pageNumber} of ${pg}`, pageW/2, pageH-5, {align:'center'})
        doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.3); doc.line(8, pageH-8, pageW-8, pageH-8)
      },
    })
  }
  doc.save(`receipt-${isSingle ? clientName(rows[0]).replace(/\s+/g,'_') : 'batch'}-${new Date().toISOString().slice(0,10)}.pdf`)
}

// ── Record Detail View ────────────────────────────────────────
function PaymentDetail({ row, currentRole, onBack, onUpdated }: {
  row: PaymentRow; currentRole: UserRole
  onBack: () => void; onUpdated: (r: Partial<PaymentRow> & { id: string }) => void
}) {
  const supabase = createClient()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [voidOpen,   setVoidOpen]   = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [lightbox,   setLightbox]   = useState(false)
  const [exporting,  setExporting]  = useState(false)

  useEffect(() => {
    if (!row.receipt_file_path) return
    supabase.storage.from('payments').createSignedUrl(row.receipt_file_path, 3600).then(({ data }) => setReceiptUrl(data?.signedUrl ?? null))
  }, [row.receipt_file_path, supabase])

  return (
    <div className="space-y-5">
      {lightbox && receiptUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={() => setLightbox(false)}>
          <div className="flex items-center justify-between px-6 py-4 shrink-0">
            <p className="text-sm font-semibold text-white">Payment Receipt</p>
            <button onClick={() => setLightbox(false)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto flex items-start justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptUrl} alt="Receipt" className="block max-w-full max-h-[80vh] w-auto h-auto rounded-lg shadow-2xl mx-auto object-contain" />
          </div>
        </div>
      )}
      {reviewOpen && <ReviewApproveModal row={row} onClose={() => setReviewOpen(false)} onApproved={id => { onUpdated({ id, status: 'approved' }); setReviewOpen(false) }} onRejected={id => { onUpdated({ id, status: 'rejected' }); setReviewOpen(false) }} />}
      {voidOpen   && <VoidModal row={row} onClose={() => setVoidOpen(false)} onVoided={id => { onUpdated({ id, status: 'voided' }); setVoidOpen(false) }} />}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to payments
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={async () => {
              setExporting(true)
              await generateReceipt({
                ...row,
                profileName:  row.profileName,
                profileEmail: row.profileEmail,
              })
              setExporting(false)
            }}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all"
          >
            {exporting
              ? <><div className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> Generating…</>
              : <><Receipt className="h-3.5 w-3.5" /> Download Receipt</>
            }
          </button>
          {row.status === 'pending' && currentRole === 'admin' && (
            <button onClick={() => setReviewOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all">
              <Eye className="h-3.5 w-3.5" /> Review & Approve
            </button>
          )}
          {row.status !== 'voided' && currentRole === 'admin' && (
            <button onClick={() => setVoidOpen(true)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border border-destructive/20 text-destructive text-[10px] font-semibold hover:bg-destructive/10 transition-colors">
              <Ban className="h-3 w-3" /> Void
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary/70 mb-0.5">Payment Record</p>
            <h2 className="text-lg font-bold text-foreground">{clientName(row)}</h2>
            <p className="text-xs text-muted-foreground">{clientEmail(row)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">{fmtAmt(row.amount)}</p>
            <Badge label={row.status} variant={statusVariant(row.status)} plain />
          </div>
        </div>
        <div className="px-6 py-5 space-y-5 bg-card">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Phone',     value: row.guest_phone ?? '—' },
              { label: 'Method',    value: row.method.replace('_',' ').toUpperCase() },
              { label: 'Reference', value: row.reference_number ?? '—' },
              { label: 'Product',   value: row.product_type },
              { label: 'Date',      value: fmtDate(row.created_at) },
              { label: 'Approved',  value: row.approved_at ? fmtDate(row.approved_at) : '—' },
            ].map(f => (
              <div key={f.label} className="bg-muted/30 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                <p className="font-semibold text-foreground">{f.value}</p>
              </div>
            ))}
          </div>
          {/* Senior/PWD flag */}
          {row.senior_pwd_discount && (
            <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">%</span>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Senior Citizen / PWD Discount Requested</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Verify the attached proof before approving.</p>
              </div>
            </div>
          )}
          {row.notes && (
            <div className="bg-muted/20 border border-border/60 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-foreground">{row.notes}</p>
            </div>
          )}
          {receiptUrl && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Payment Receipt</p>
              <button className="relative block group rounded-xl overflow-hidden border border-border max-w-xs" onClick={() => setLightbox(true)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptUrl} alt="Receipt" className="block w-full h-auto" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>
          )}
          {row.status === 'voided' && (row.void_reason || row.void_comment) && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-destructive/70 mb-1">Void Reason</p>
              <p className="text-xs text-foreground">{row.void_reason}{row.void_comment ? ` — ${row.void_comment}` : ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export function PaymentsTab({ currentRole, highlightPaymentId, onHighlightClear, initialStatusFilter }: {
  currentRole: UserRole
  highlightPaymentId?: string | null
  onHighlightClear?: () => void
  initialStatusFilter?: PaymentStatus | 'all'
}) {
  const supabase = createClient()
  const [rows,        setRows]        = useState<PaymentRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState('')
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>(initialStatusFilter ?? 'all')
  const [showCashModal, setShowCashModal] = useState(false)
  const [reviewRow,   setReviewRow]   = useState<PaymentRow | null>(null)
  const [voidRow,     setVoidRow]     = useState<PaymentRow | null>(null)
  const [detailRow,   setDetailRow]   = useState<PaymentRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLTableRowElement | null>(null)

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

  // Realtime — payments table: new submission or status change pushes instantly
  useEffect(() => {
    const channel = supabase
      .channel('payments-tab-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, load])

  useEffect(() => {
    if (!highlightPaymentId || loading) return
    setStatusFilter('all')
    const timer = setTimeout(() => { highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 150)
    return () => clearTimeout(timer)
  }, [highlightPaymentId, loading])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const updateRow = (updated: Partial<PaymentRow> & { id: string }) => {
    setRows(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    if (detailRow?.id === updated.id) setDetailRow(prev => prev ? { ...prev, ...updated } : null)
  }

  const statusVariant2 = (s: string): BadgeVariant => statusVariant(s)
  const q = search.toLowerCase()
  const filtered = rows.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchSearch = !q || [clientName(p), clientEmail(p), p.reference_number, p.product_type].some(v => v?.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  const allSelected  = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id))
  const someSelected = filtered.some(r => selectedIds.has(r.id))
  const toggleSelect = (id: string) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const selectAll    = (checked: boolean) => setSelectedIds(checked ? new Set(filtered.map(r => r.id)) : new Set())

  const exportRows = selectedIds.size > 0 ? rows.filter(r => selectedIds.has(r.id)) : filtered

  if (loading) return <Spinner />

  // ── Detail view ─────────────────────────────────────────────
  if (detailRow) {
    return (
      <PaymentDetail
        row={detailRow}
        currentRole={currentRole}
        onBack={() => setDetailRow(null)}
        onUpdated={updateRow}
      />
    )
  }

  const filterOptions = [
    { value: 'all'      as const, label: `All (${rows.length})` },
    { value: 'pending'  as const, label: `Pending (${rows.filter(r => r.status === 'pending').length})` },
    { value: 'approved' as const, label: `Approved (${rows.filter(r => r.status === 'approved').length})` },
    { value: 'rejected' as const, label: `Rejected (${rows.filter(r => r.status === 'rejected').length})` },
  ]

  return (
    <div className="space-y-5">
      {/* Modals */}
      {reviewRow && <ReviewApproveModal row={reviewRow} onClose={() => setReviewRow(null)} onApproved={id => updateRow({ id, status: 'approved' })} onRejected={id => updateRow({ id, status: 'rejected' })} />}
      {voidRow   && <VoidModal          row={voidRow}   onClose={() => setVoidRow(null)}   onVoided={id  => updateRow({ id, status: 'voided' })} />}
      {showCashModal && <CashModal onClose={() => setShowCashModal(false)} onSuccess={load} />}

      <PaymentInfoCard canEdit={currentRole === 'admin'} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Payments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} total transactions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Record Cash — prominent */}
          <button onClick={() => setShowCashModal(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 shadow-sm transition-all">
            <Banknote className="h-4 w-4" /> Record Cash Payment
          </button>
          {/* Export */}
          <div ref={exportRef} className="relative">
            <div className="flex items-stretch rounded-xl overflow-hidden border border-border">
              <button onClick={async () => { setExporting(true); await exportReceiptPDF(exportRows); setExporting(false) }}
                disabled={exporting || exportRows.length === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-card text-foreground text-[11px] font-bold hover:bg-muted/40 transition-colors disabled:opacity-40">
                <Printer className="h-3.5 w-3.5" /> Print{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </button>
              <button onClick={() => setShowExportMenu(v => !v)}
                className="h-9 px-2 bg-card text-muted-foreground hover:bg-muted/40 transition-colors border-l border-border">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
                <button onClick={async () => { setShowExportMenu(false); setExporting(true); await exportReceiptPDF(exportRows, exportRows.length === 1 ? 'Payment Receipt' : 'Receipt Register'); setExporting(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loadError && <AlertBanner variant="error" message={`Failed to load: ${loadError}`} />}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, reference…" /></div>
        <FilterPills options={filterOptions} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {filtered.length === 0 ? <EmptyState message="No payments match your search." /> : (
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
          {/* Summary strip */}
          <div className="bg-primary/5 border-b border-primary/20 px-5 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
            {[
              { label: 'Total',    value: rows.length,                                              color: 'text-foreground' },
              { label: 'Approved', value: rows.filter(r => r.status === 'approved').length,          color: 'text-primary' },
              { label: 'Pending',  value: rows.filter(r => r.status === 'pending').length,           color: 'text-muted-foreground' },
              { label: 'Rejected', value: rows.filter(r => r.status === 'rejected').length,          color: 'text-destructive' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                {i > 0 && <div className="w-px h-3.5 bg-border/60" />}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">{s.label}</span>
                  <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                </div>
              </div>
            ))}
            {selectedIds.size > 0 && (
              <><div className="w-px h-3.5 bg-border/60" /><div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase tracking-widest text-blue-500/70">Selected</span><span className="text-xs font-bold text-blue-500">{selectedIds.size}</span></div></>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-muted/40 border-b-2 border-border border-r border-border/30 w-9">
                    <input type="checkbox" checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                      onChange={e => selectAll(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                  </th>
                  {['Client','Method','Reference','Amount','Date','Status', ...(currentRole === 'admin' ? ['Actions'] : [])].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b-2 border-border border-r border-border/30 last:border-r-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const isHighlighted = highlightPaymentId === p.id
                  const rowBg = isHighlighted ? 'bg-primary/10' : selectedIds.has(p.id) ? 'bg-primary/5' : i % 2 !== 0 ? 'bg-muted/[0.04]' : 'bg-card'
                  return (
                    <tr key={p.id} ref={isHighlighted ? highlightRef : null}
                      className={`border-b border-border/40 transition-colors hover:bg-primary/[0.03] cursor-pointer ${rowBg}`}
                      onClick={() => setDetailRow(p)}>
                      <td className="px-4 py-3 border-r border-border/30" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                      </td>
                      <td className="px-5 py-3 border-r border-border/30">
                        <p className="font-semibold text-foreground leading-tight">{clientName(p)}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{clientEmail(p)}</p>
                      </td>
                      <td className="px-5 py-3 border-r border-border/30"><Badge label={p.method} variant="blue" plain /></td>
                      <td className="px-5 py-3 border-r border-border/30 text-[10px] text-muted-foreground font-mono">{p.reference_number ?? '—'}</td>
                      <td className="px-5 py-3 border-r border-border/30 font-bold text-primary">₱{Number(p.amount).toLocaleString()}</td>
                      <td className="px-5 py-3 border-r border-border/30 text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(p.created_at)}</td>
                      <td className="px-5 py-3 border-r border-border/30"><Badge label={p.status} variant={statusVariant2(p.status)} plain /></td>
                      {currentRole === 'admin' && (
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.status === 'pending' && (
                              <button onClick={() => setReviewRow(p)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90">
                                <Eye className="h-3 w-3" /> Review
                              </button>
                            )}
                            {p.status === 'approved' && (
                              <button
                                onClick={() => setDetailRow(p)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/10 transition-colors"
                              >
                                <Receipt className="h-3 w-3" /> Receipt
                              </button>
                            )}
                            {p.status !== 'voided' && (
                              <button onClick={() => setVoidRow(p)}
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-red-200 text-red-600 text-[10px] font-semibold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-colors">
                                <Ban className="h-2.5 w-2.5" /> Void
                              </button>
                            )}
                            {p.status === 'voided' && <span className="text-[10px] text-muted-foreground">Voided</span>}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/[0.06]">
                  <td colSpan={4} className="px-5 py-2.5 border-r border-border/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Total Approved Revenue</span>
                  </td>
                  <td className="px-5 py-2.5 font-bold text-primary border-r border-border/30">
                    ₱{rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0).toLocaleString()}
                  </td>
                  <td colSpan={currentRole === 'admin' ? 3 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
