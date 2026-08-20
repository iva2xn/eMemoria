'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { AlertBanner } from '@/components/ui/alert-banner'
import {
  Calendar, MapPin, Clock,
  Moon, AlertTriangle, Check, X, ChevronRight, ChevronLeft,
  CalendarDays, Navigation, CheckCircle2, XCircle,
} from 'lucide-react'
import { SARIAYA_CEMETERIES } from '@/components/admin/wake-schedule-tab'
import type { Wake, WakeExtensionRequest } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
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

// Max extension date = today + 14 days
function maxExtensionDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const REJECTION_REASON_DISPLAY: Record<string, string> = {
  'Exceeds maximum extension period':        'The requested extension exceeds the allowed 2-week maximum.',
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
  onClose,
  onSubmitted,
}: {
  wake: Wake
  type: 'extension' | 'location_change'
  onClose: () => void
  onSubmitted: () => void
}) {
  const supabase = createClient()
  const [step,        setStep]        = useState<1 | 2>(1)
  const [endDate,     setEndDate]     = useState('')
  const [location,    setLocation]    = useState('')
  const [locOther,    setLocOther]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const isOther    = location === 'Other Location'
  const isExtension = type === 'extension'

  const validate = () => {
    if (isExtension && !endDate) { setError('Please select a date.'); return false }
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
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  New End Date <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  min={todayStr()}
                  max={maxExtensionDate()}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
                />
                <p className="text-[10px] text-muted-foreground">
                  Maximum extension: 2 weeks from today ({fmtDate(maxExtensionDate())}).
                </p>
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
                    <div className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">New End Date</span>
                      <span className="font-semibold text-foreground">{fmtDate(endDate)}</span>
                    </div>
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
              <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  Your request will be reviewed by our staff. You will be notified once a decision has been made.
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
function RequestHistoryItem({ req }: { req: WakeExtensionRequest }) {
  const isApproved = req.status === 'approved'
  const isRejected = req.status === 'rejected'
  const isPending  = req.status === 'pending'

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${
      isApproved ? 'border-primary/20 bg-primary/[0.03]'
      : isRejected ? 'border-red-500/20 bg-red-500/[0.03]'
      : 'border-amber-500/20 bg-amber-500/[0.03]'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isApproved && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {isRejected && <XCircle      className="h-4 w-4 text-red-500" />}
          {isPending  && <Clock        className="h-4 w-4 text-amber-500" />}
          <span className={`text-xs font-bold ${isApproved ? 'text-primary' : isRejected ? 'text-red-500' : 'text-amber-600'}`}>
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

      {isRejected && req.rejection_reason && (
        <div className="text-[11px] text-red-600 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 leading-relaxed">
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
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function WakeSchedulePage() {
  const supabase = createClient()
  const router   = useRouter()

  const [loading,   setLoading]   = useState(true)
  const [wake,      setWake]      = useState<Wake | null>(null)
  const [requests,  setRequests]  = useState<WakeExtensionRequest[]>([])
  const [userId,    setUserId]    = useState<string | null>(null)
  const [modalType, setModalType] = useState<'extension' | 'location_change' | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    // Fetch latest wake for this user
    const { data: wakeData } = await supabase
      .from('wakes')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setWake(wakeData ?? null)

    // Fetch all extension requests for this user
    if (wakeData) {
      const { data: reqData } = await supabase
        .from('wake_extension_requests')
        .select('*')
        .eq('wake_id', wakeData.id)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      setRequests((reqData as WakeExtensionRequest[]) ?? [])
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

  // Real-time: refresh requests when admin reviews one
  useEffect(() => {
    if (!userId || !wake) return
    const channel = supabase
      .channel(`wake-requests-${wake.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wake_extension_requests', filter: `wake_id=eq.${wake.id}` },
        () => load(userId)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wakes', filter: `id=eq.${wake.id}` },
        () => load(userId)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, wake, load])

  const hasPendingRequest = requests.some(r => r.status === 'pending')

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
      {modalType && wake && (
        <RequestModal
          wake={wake}
          type={modalType}
          onClose={() => setModalType(null)}
          onSubmitted={() => {
            setSuccessMsg('Your request has been submitted. We will notify you once it has been reviewed.')
            if (userId) load(userId)
            setTimeout(() => setSuccessMsg(''), 6000)
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
          {!wake ? (
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

              {/* How to get a wake scheduled */}
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

              <Link
                href="/services/traditional"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-1"
              >
                View Traditional Burial Packages <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              {/* Schedule card */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-primary/5 border-b border-primary/20 px-6 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Wake Schedule</p>
                  <h2 className="text-xl font-bold text-foreground">{wake.deceased_name}</h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Pickup */}
                  <div className="flex items-start gap-4">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Pickup Date &amp; Time</p>
                      <p className="text-sm font-semibold text-foreground">{fmtDateTime(wake.pickup_datetime)}</p>
                    </div>
                  </div>

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
              </div>

              {/* Request buttons */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border/60">
                  <h3 className="text-sm font-bold text-foreground">Make a Request</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Need to adjust your schedule? Submit a request for staff review.
                  </p>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setModalType('extension')}
                    disabled={hasPendingRequest}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Extend Date</p>
                      <p className="text-[11px] text-muted-foreground">Up to 2 weeks from today</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setModalType('location_change')}
                    disabled={hasPendingRequest}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Navigation className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Change Location</p>
                      <p className="text-[11px] text-muted-foreground">Select from Sariaya cemeteries</p>
                    </div>
                  </button>
                </div>

                {hasPendingRequest && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        You have a pending request. You can submit a new one once it has been reviewed.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Request history */}
              {requests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Request History</h3>
                  {requests.map(req => (
                    <RequestHistoryItem key={req.id} req={req} />
                  ))}
                </div>
              )}
            </>
          )}


        </div>
      </main>
    </ClientLayout>
  )
}
