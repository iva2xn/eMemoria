'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { AlertBanner } from '@/components/ui/alert-banner'
import { WakeScheduleModal } from '@/components/billing/wake-schedule-modal'
import {
  Calendar, MapPin, Clock,
  Moon, AlertTriangle, Check, X, ChevronRight, ChevronLeft,
  CalendarDays, Navigation, CheckCircle2, XCircle, CreditCard,
} from 'lucide-react'
import { SARIAYA_CEMETERIES } from '@/components/admin/wake-schedule-tab'
import type { Wake, WakeExtensionRequest } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function locationDisplay(w: { burial_location: string | null; burial_location_other: string | null }) {
  if (!w.burial_location) return 'Not set'
  if (w.burial_location === 'Other Location') return w.burial_location_other || 'Other'
  return w.burial_location
}
function todayStr() {
  return new Date().toISOString().split('T')[0]
}
// Max extension = 7 days from the day after the current wake_end_date
function computeExtensionRange(wake: Wake): { minDate: string; maxDate: string } {
  // Start: day after current end date (or today if no end date)
  const base = wake.wake_end_date
    ? new Date(wake.wake_end_date + 'T00:00:00')
    : new Date()
  const start = new Date(base)
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 6) // +6 gives 7 days total from start
  return {
    minDate: start.toISOString().split('T')[0],
    maxDate: end.toISOString().split('T')[0],
  }
}
function daysBetween(startIso: string, endIso: string): number {
  const s = new Date(startIso + 'T00:00:00')
  const e = new Date(endIso + 'T00:00:00')
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

const REJECTION_REASON_DISPLAY: Record<string, string> = {
  'Exceeds maximum extension period':        'The requested extension exceeds the allowed maximum.',
  'Schedule conflict with other services':   'There is a scheduling conflict with another service.',
  'Incomplete supporting documents':         'Additional documents are required.',
  'Requested location is unavailable':       'The requested location is not available at this time.',
  'Administrative reasons':                  'Due to administrative reasons.',
  'Other':                                   'Please contact the funeral home for details.',
}

// ── Extension Request Modal ───────────────────────────────────
function RequestModal({
  wake,
  type,
  pricePerDay,
  onClose,
  onSubmitted,
}: {
  wake: Wake
  type: 'extension' | 'location_change'
  pricePerDay: number
  onClose: () => void
  onSubmitted: () => void
}) {
  const supabase = createClient()
  const [step,     setStep]     = useState<1 | 2>(1)
  const [endDate,  setEndDate]  = useState('')
  const [location, setLocation] = useState('')
  const [locOther, setLocOther] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const isOther     = location === 'Other Location'
  const isExtension = type === 'extension'
  const { minDate, maxDate } = computeExtensionRange(wake)

  // Compute cost for extension
  const daysCount = isExtension && endDate ? daysBetween(minDate, endDate) : 0
  const totalCost = daysCount * pricePerDay

  const validate = () => {
    if (isExtension && !endDate) { setError('Please select a new end date.'); return false }
    if (!isExtension && !location) { setError('Please select a location.'); return false }
    if (!isExtension && isOther && !locOther.trim()) { setError('Please specify the location.'); return false }
    return true
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('You must be signed in.'); setLoading(false); return }

    const { error: err } = await supabase.from('wake_extension_requests').insert({
      wake_id:             wake.id,
      user_id:             user.id,
      request_type:        type,
      requested_end_date:  isExtension ? endDate : null,
      new_location:        !isExtension ? location : null,
      new_location_other:  (!isExtension && isOther) ? locOther.trim() : null,
      status:              'pending',
      ...(isExtension ? {
        price_per_day:  pricePerDay,
        days_requested: daysCount,
        total_amount:   totalCost,
      } : {}),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSubmitted()
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setError('') }}
                className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            {isExtension ? <CalendarDays className="h-4 w-4 text-primary" /> : <Navigation className="h-4 w-4 text-primary" />}
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isExtension ? 'Request Date Extension' : 'Request Location Change'}
              </h3>
              <p className="text-[10px] text-muted-foreground">Step {step} of 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          {/* Deceased info */}
          <div className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Wake For</p>
            <p className="text-sm font-bold text-foreground">{wake.deceased_name}</p>
            {wake.wake_end_date && (
              <p className="text-xs text-muted-foreground">Current end date: {fmtDate(wake.wake_end_date)}</p>
            )}
          </div>

          {step === 1 ? (
            isExtension ? (
              <div className="space-y-3">
                {/* Price info banner */}
                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
                  <CreditCard className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                    <p className="font-bold">Extension has a fee</p>
                    <p>₱{pricePerDay.toLocaleString('en-PH')} per day · Maximum 7 additional days</p>
                    <p className="text-[10px] opacity-80">
                      Extension starts from {fmtDate(minDate)} (day after current end date)
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    New End Date <span className="text-primary">*</span>
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Maximum: {fmtDate(maxDate)} (7 days from start)
                  </p>
                </div>

                {/* Cost preview */}
                {endDate && daysCount > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days extended</span>
                      <span className="font-bold text-foreground">{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-semibold text-foreground">₱{pricePerDay.toLocaleString('en-PH')} / day</span>
                    </div>
                    <div className="flex justify-between border-t border-primary/10 pt-1.5 mt-1">
                      <span className="font-bold text-foreground">Total to pay</span>
                      <span className="font-bold text-primary text-sm">₱{totalCost.toLocaleString('en-PH')}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      Payment is required after admin approval.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    New Location <span className="text-primary">*</span>
                  </label>
                  <select
                    value={location}
                    onChange={e => { setLocation(e.target.value); if (e.target.value !== 'Other Location') setLocOther('') }}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
                  >
                    <option value="">— Select a cemetery in Sariaya —</option>
                    {SARIAYA_CEMETERIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {isOther && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Specify Location <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={locOther}
                      onChange={e => setLocOther(e.target.value)}
                      placeholder="Enter full address or location name"
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>
                )}
              </>
            )
          ) : (
            // Review step
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Request Summary</p>
                </div>
                <div className="divide-y divide-border/40">
                  <div className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-muted-foreground">Request Type</span>
                    <span className="font-semibold text-foreground capitalize">{type.replace('_', ' ')}</span>
                  </div>
                  {isExtension ? (
                    <>
                      <div className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">New End Date</span>
                        <span className="font-semibold text-foreground">{fmtDate(endDate)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">Days Extended</span>
                        <span className="font-semibold text-foreground">{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">Total Fee</span>
                        <span className="font-bold text-primary">₱{totalCost.toLocaleString('en-PH')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">New Location</span>
                      <span className="font-semibold text-foreground text-right max-w-[60%]">
                        {location === 'Other Location' ? (locOther || 'Other') : location}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-muted/30 border border-border/60 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  {isExtension
                    ? 'Your request will be reviewed by staff. Once approved, you will need to pay the extension fee through the Payment Portal.'
                    : 'Your request will be reviewed by our staff. You will be notified once a decision has been made.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (validate()) setStep(2) }}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Review →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                ← Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? 'Submitting…' : 'Submit Request'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Request History Item ──────────────────────────────────────
function RequestHistoryItem({ req, pricePerDay }: { req: WakeExtensionRequest; pricePerDay: number }) {
  const isApproved  = req.status === 'approved'
  const isRejected  = req.status === 'rejected'
  const isPending   = req.status === 'pending'
  const isExtension = req.request_type === 'extension'

  // For approved extensions — compute billing URL
  const extensionBillingUrl = isApproved && isExtension && req.total_amount
    ? `/billing?product=wake_extension&wake_id=${req.wake_id}&extension_request_id=${req.id}&price=${req.total_amount}&label=${encodeURIComponent(`Wake Extension (${req.days_requested} day${req.days_requested !== 1 ? 's' : ''})`)}`
    : null

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${
      isApproved ? 'border-primary/20 bg-primary/[0.03]'
      : isRejected ? 'border-destructive/20 bg-destructive/[0.03]'
      : 'border-border bg-muted/20'
    }`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isApproved && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {isRejected && <XCircle      className="h-4 w-4 text-destructive" />}
          {isPending  && <Clock        className="h-4 w-4 text-muted-foreground" />}
          <span className={`text-xs font-bold ${isApproved ? 'text-primary' : isRejected ? 'text-destructive' : 'text-muted-foreground'}`}>
            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Review'}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <p className="text-xs text-muted-foreground capitalize">
        {req.request_type === 'extension' ? 'Date Extension' : 'Location Change'}
        {req.request_type === 'extension' && req.requested_end_date && (
          <span className="ml-1 text-foreground font-semibold">→ {fmtDate(req.requested_end_date)}</span>
        )}
        {req.request_type === 'location_change' && req.new_location && (
          <span className="ml-1 text-foreground font-semibold">
            → {req.new_location === 'Other Location' ? (req.new_location_other || 'Other') : req.new_location}
          </span>
        )}
      </p>

      {/* Extension fee info */}
      {isExtension && req.total_amount != null && (
        <p className="text-xs text-muted-foreground">
          Fee: <span className="font-bold text-foreground">₱{Number(req.total_amount).toLocaleString('en-PH')}</span>
          <span className="ml-1 text-[10px]">({req.days_requested} day{req.days_requested !== 1 ? 's' : ''} × ₱{Number(req.price_per_day ?? pricePerDay).toLocaleString('en-PH')})</span>
        </p>
      )}

      {isRejected && req.rejection_reason && (
        <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2 leading-relaxed">
          <span className="font-bold">Reason: </span>
          {REJECTION_REASON_DISPLAY[req.rejection_reason] ?? req.rejection_reason}
          {req.rejection_comment && req.rejection_reason !== 'Other' && (
            <span className="block mt-0.5 text-muted-foreground">{req.rejection_comment}</span>
          )}
          {req.rejection_reason === 'Other' && req.rejection_comment && (
            <span className="block mt-0.5">{req.rejection_comment}</span>
          )}
        </div>
      )}

      {/* Payment CTA for approved extension requests */}
      {extensionBillingUrl && (
        <a
          href={extensionBillingUrl}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
        >
          <CreditCard className="h-3 w-3" /> Pay Extension Fee →
        </a>
      )}
    </div>
  )
}

// ── Single Wake Card (schedule + make a request combined) ─────
function WakeCard({
  wake,
  requests,
  pricePerDay,
  onOpenModal,
  onSubmitted,
}: {
  wake: Wake
  requests: WakeExtensionRequest[]
  pricePerDay: number
  onOpenModal: (wakeId: string, type: 'extension' | 'location_change') => void
  onSubmitted: () => void
}) {
  const [showHistory, setShowHistory] = useState(false)

  // Per-type pending check
  const hasPendingExtension = requests.some(r => r.status === 'pending' && r.request_type === 'extension')
  const hasPendingLocation  = requests.some(r => r.status === 'pending' && r.request_type === 'location_change')

  const recentRequests = requests.slice(0, 3)
  const hasMore = requests.length > 3

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Schedule header */}
      <div className="bg-primary/5 border-b border-primary/20 px-6 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Wake Schedule</p>
        <h2 className="text-xl font-bold text-foreground">{wake.deceased_name}</h2>
      </div>

      {/* Schedule details */}
      <div className="px-6 py-5 space-y-4">
        {/* Pickup */}
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Pickup Date &amp; Time</p>
            <p className="text-sm font-semibold text-foreground">{fmtDateTime(wake.pickup_datetime)}</p>
          </div>
        </div>

        {/* Venue */}
        {wake.venue_address && (
          <div className="flex items-start gap-4">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Venue / Wake Address</p>
              <p className="text-sm font-semibold text-foreground">{wake.venue_address}</p>
            </div>
          </div>
        )}

        {/* Wake period */}
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Wake Period</p>
            {wake.wake_start_date || wake.wake_end_date ? (
              <p className="text-sm font-semibold text-foreground">
                {fmtDate(wake.wake_start_date)}
                {wake.wake_end_date && <span className="text-muted-foreground"> — </span>}
                {fmtDate(wake.wake_end_date)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">To be scheduled</p>
            )}
          </div>
        </div>

        {/* Burial location */}
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Burial Location</p>
            <p className="text-sm font-semibold text-foreground">{locationDisplay(wake)}</p>
          </div>
        </div>

        {/* Notes */}
        {wake.notes && (
          <div className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes from Staff</p>
            <p className="text-sm text-foreground leading-relaxed">{wake.notes}</p>
          </div>
        )}
      </div>

      {/* Make a Request section */}
      <div className="border-t border-border/60">
        <div className="px-6 py-4 border-b border-border/40">
          <h3 className="text-sm font-bold text-foreground">Make a Request</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Need to adjust your schedule? Submit a request for staff review.
          </p>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Extend Date */}
          <button
            onClick={() => onOpenModal(wake.id, 'extension')}
            disabled={hasPendingExtension}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Extend Date</p>
              <p className="text-[11px] text-muted-foreground">
                ₱{pricePerDay.toLocaleString('en-PH')}/day · Max 7 days
              </p>
              {hasPendingExtension && (
                <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Pending review…</p>
              )}
            </div>
          </button>

          {/* Change Location */}
          <button
            onClick={() => onOpenModal(wake.id, 'location_change')}
            disabled={hasPendingLocation}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Change Location</p>
              <p className="text-[11px] text-muted-foreground">Select from Sariaya cemeteries</p>
              {hasPendingLocation && (
                <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Pending review…</p>
              )}
            </div>
          </button>
        </div>

        {(hasPendingExtension || hasPendingLocation) && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 bg-muted/30 border border-border/60 rounded-xl px-3 py-2.5">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                {hasPendingExtension && hasPendingLocation
                  ? 'You have pending requests for both extension and location change.'
                  : hasPendingExtension
                  ? 'You have a pending date extension request.'
                  : 'You have a pending location change request.'
                }
                {' '}You can submit a new request once the pending one has been reviewed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Request history */}
      {requests.length > 0 && (
        <div className="border-t border-border/40 px-6 py-4 space-y-3">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            Request History ({requests.length})
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>

          {showHistory && (
            <div className="space-y-2">
              {(hasMore ? recentRequests : requests).map(req => (
                <RequestHistoryItem key={req.id} req={req} pricePerDay={pricePerDay} />
              ))}
              {hasMore && !showHistory && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  View all {requests.length} requests →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
function WakeScheduleContent() {
  const supabase    = createClient()
  const router      = useRouter()
  const searchParams = useSearchParams()

  const [loading,     setLoading]     = useState(true)
  const [wakes,       setWakes]       = useState<Wake[]>([])
  // Map: wakeId → requests for that wake
  const [requestMap,  setRequestMap]  = useState<Record<string, WakeExtensionRequest[]>>({})
  const [userId,      setUserId]      = useState<string | null>(null)
  const [pricePerDay, setPricePerDay] = useState(500)

  // Modal state: which wake + which type
  const [modalWake, setModalWake] = useState<Wake | null>(null)
  const [modalType, setModalType] = useState<'extension' | 'location_change' | null>(null)

  const [successMsg, setSuccessMsg]       = useState('')
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

  // Auto-open the preferences modal when redirected from a notification
  useEffect(() => {
    if (searchParams.get('action') === 'submit-preferences') {
      setShowPreferencesModal(true)
      window.history.replaceState({}, '', '/wake-schedule')
    }
  }, [searchParams])

  const load = useCallback(async (uid: string) => {
    setLoading(true)

    const [{ data: wakesData }, { data: priceData }] = await Promise.all([
      supabase
        .from('wakes')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('wake_extension_price_config')
        .select('price_per_day')
        .eq('id', 1)
        .maybeSingle(),
    ])

    const wakeList = (wakesData as Wake[]) ?? []
    setWakes(wakeList)
    if (priceData?.price_per_day) setPricePerDay(Number(priceData.price_per_day))

    if (wakeList.length > 0) {
      const wakeIds = wakeList.map(w => w.id)
      const { data: reqData } = await supabase
        .from('wake_extension_requests')
        .select('*')
        .in('wake_id', wakeIds)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      const map: Record<string, WakeExtensionRequest[]> = {}
      for (const req of (reqData as WakeExtensionRequest[]) ?? []) {
        if (!map[req.wake_id]) map[req.wake_id] = []
        map[req.wake_id].push(req)
      }
      setRequestMap(map)
    } else {
      setRequestMap({})
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/login?next=/wake-schedule'); return }
      setUserId(user.id)
      load(user.id)
    })
  }, [supabase, router, load])

  // Real-time: refresh when admin reviews a request or updates a wake
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`wake-client-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wake_extension_requests' },
        () => load(userId)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wakes' },
        () => load(userId)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wakes' },
        () => load(userId)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, load])

  const openModal = (wakeId: string, type: 'extension' | 'location_change') => {
    const w = wakes.find(x => x.id === wakeId)
    if (!w) return
    setModalWake(w)
    setModalType(type)
  }

  if (loading) {
    return (
      <ClientLayout>
        <main className="flex-1 flex items-center justify-center py-32">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      {/* Request modal */}
      {modalType && modalWake && (
        <RequestModal
          wake={modalWake}
          type={modalType}
          pricePerDay={pricePerDay}
          onClose={() => { setModalWake(null); setModalType(null) }}
          onSubmitted={() => {
            setSuccessMsg(
              modalType === 'extension'
                ? 'Your extension request has been submitted. You will be notified once it has been reviewed, after which you can proceed to payment.'
                : 'Your request has been submitted. We will notify you once it has been reviewed.'
            )
            if (userId) load(userId)
            setTimeout(() => setSuccessMsg(''), 8000)
          }}
        />
      )}

      {/* Wake preferences modal — triggered by admin notification */}
      {showPreferencesModal && (
        <WakeScheduleModal
          deceasedName={wakes[0]?.deceased_name ?? 'your loved one'}
          onDone={() => {
            setShowPreferencesModal(false)
            setSuccessMsg('Your schedule preferences have been submitted. Our staff will be in touch soon.')
            setTimeout(() => setSuccessMsg(''), 7000)
          }}
        />
      )}

      <main className="flex-1 bg-background">
        {/* Hero */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Your Account</p>
            <h1 className="font-serif text-3xl font-bold text-foreground">Wake Schedule</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

          {successMsg && (
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{successMsg}</p>
            </div>
          )}

          {/* No wake record */}
          {wakes.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto border border-border/60">
                <Moon className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No wake schedule found</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed mt-1">
                  Your wake schedule will appear here once our staff sets it up after your booking is confirmed.
                </p>
              </div>

              <div className="max-w-sm mx-auto bg-card border border-border rounded-2xl overflow-hidden text-left mt-2">
                <div className="px-5 py-3 border-b border-border/60 bg-primary/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">How to Get a Wake Scheduled</p>
                </div>
                <ol className="px-5 py-4 space-y-3">
                  {[
                    { n: '1', text: 'Avail a Traditional Burial Package from our Services page.' },
                    { n: '2', text: 'Submit the required documents for staff review.' },
                    { n: '3', text: 'Once approved, complete your payment through the billing page.' },
                    { n: '4', text: 'Our staff will create your wake schedule and it will appear here.' },
                  ].map(s => (
                    <li key={s.n} className="flex items-start gap-3 text-xs text-muted-foreground">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                      <span className="leading-relaxed">{s.text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <a
                href="/services/traditional"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-1"
              >
                View Traditional Burial Packages <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            /* Multiple wake cards */
            <div className="space-y-6">
              {wakes.map(wake => (
                <WakeCard
                  key={wake.id}
                  wake={wake}
                  requests={requestMap[wake.id] ?? []}
                  pricePerDay={pricePerDay}
                  onOpenModal={openModal}
                  onSubmitted={() => {
                    if (userId) load(userId)
                  }}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </ClientLayout>
  )
}

export default function WakeSchedulePage() {
  return (
    <Suspense fallback={
      <ClientLayout>
        <main className="flex-1 flex items-center justify-center py-32">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      </ClientLayout>
    }>
      <WakeScheduleContent />
    </Suspense>
  )
}
