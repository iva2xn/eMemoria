'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import {
  Badge, SectionHeader, EmptyState, Spinner,
  FilterPills, SearchInput, inputCls,
} from './admin-primitives'
import { logActivity } from '@/lib/activity-log'
import {
  X, Calendar, MapPin, Check, ChevronLeft,
  Edit2, AlertTriangle, Clock, Eye,
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import type { Wake, WakeExtensionRequest, UserRole } from '@/lib/supabase/types'

// ── Constants ─────────────────────────────────────────────────
export const SARIAYA_CEMETERIES = [
  'Sariaya Municipal Cemetery',
  'Golden Haven Memorial Park - Sariaya',
  'Mt. Zion Memorial Park',
  'Paradise Memorial Park',
  'Roman Catholic Cemetery',
  'Himlayan Cemetery',
  'Brgy. Sampaloc Cemetery',
  'Brgy. Talaan Aplaya Cemetery',
  'Brgy. Tumbaga Cemetery',
  'Brgy. Canda Cemetery',
  'Brgy. Liit Proper Cemetery',
  'Brgy. Bukal Sur Cemetery',
  'Brgy. Bukal Norte Cemetery',
  'Brgy. Manggalang Cemetery',
  'Brgy. Kalangkang Cemetery',
  'Other Location',
] as const

const REJECTION_REASONS = [
  'Exceeds maximum extension period',
  'Schedule conflict with other services',
  'Incomplete supporting documents',
  'Requested location is unavailable',
  'Administrative reasons',
  'Other',
] as const

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function locationDisplay(w: { burial_location: string | null; burial_location_other: string | null }) {
  if (!w.burial_location) return '—'
  if (w.burial_location === 'Other Location') return w.burial_location_other || 'Other'
  return w.burial_location
}

type WakeRow = Wake & { clientName?: string; clientEmail?: string; bookingPackage?: string }
type RequestRow = WakeExtensionRequest & { clientName?: string; wakeName?: string }

// ── Edit Wake Modal ───────────────────────────────────────────
function EditWakeModal({
  row,
  onClose,
  onSaved,
}: {
  row: WakeRow
  onClose: () => void
  onSaved: (updated: WakeRow) => void
}) {
  const supabase = createClient()
  const [step,            setStep]            = useState<1 | 2>(1)
  const [pickupDatetime,  setPickupDatetime]  = useState(
    row.pickup_datetime ? row.pickup_datetime.slice(0, 16) : ''
  )
  const [wakeStart,       setWakeStart]       = useState(row.wake_start_date ?? '')
  const [wakeEnd,         setWakeEnd]         = useState(row.wake_end_date ?? '')
  const [burialLocation,  setBurialLocation]  = useState(row.burial_location ?? '')
  const [burialOther,     setBurialOther]     = useState(row.burial_location_other ?? '')
  const [notes,           setNotes]           = useState(row.notes ?? '')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  const isOther = burialLocation === 'Other Location'

  const handleSave = async () => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'
    const { error: err } = await supabase.from('wakes').update({
      pickup_datetime:       pickupDatetime ? new Date(pickupDatetime).toISOString() : null,
      wake_start_date:       wakeStart || null,
      wake_end_date:         wakeEnd || null,
      burial_location:       burialLocation || null,
      burial_location_other: isOther ? burialOther : null,
      notes:                 notes.trim() || null,
    }).eq('id', row.id)
    if (err) { setError(err.message); setLoading(false); return }
    await logActivity({
      category:     'log',
      event_type:   'wake_updated',
      entity_table: 'wakes',
      entity_id:    row.id,
      actor_id:     user?.id,
      actor_name:   actorName,
      message:      `${actorName} updated wake schedule for ${row.deceased_name}`,
    })
    setLoading(false)
    onSaved({
      ...row,
      pickup_datetime:       pickupDatetime ? new Date(pickupDatetime).toISOString() : null,
      wake_start_date:       wakeStart || null,
      wake_end_date:         wakeEnd || null,
      burial_location:       burialLocation || null,
      burial_location_other: isOther ? burialOther : null,
      notes:                 notes.trim() || null,
    })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <Edit2 className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {step === 1 ? 'Edit Wake Schedule' : 'Review Changes'}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {row.deceased_name} · Step {step} of 2
              </p>
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

          {step === 1 ? (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pickup Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={pickupDatetime}
                  onChange={e => setPickupDatetime(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Wake Start Date
                  </label>
                  <input
                    type="date"
                    value={wakeStart}
                    onChange={e => setWakeStart(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Wake End Date
                  </label>
                  <input
                    type="date"
                    value={wakeEnd}
                    min={wakeStart || undefined}
                    onChange={e => setWakeEnd(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Burial / Interment Location
                </label>
                <select
                  value={burialLocation}
                  onChange={e => { setBurialLocation(e.target.value); if (e.target.value !== 'Other Location') setBurialOther('') }}
                  className={inputCls}
                >
                  <option value="">— Select a cemetery —</option>
                  {SARIAYA_CEMETERIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {isOther && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Specify Location <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={burialOther}
                    onChange={e => setBurialOther(e.target.value)}
                    placeholder="Enter full location…"
                    className={inputCls}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional instructions or context…"
                  className={`${inputCls} h-auto resize-none py-2.5`}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Schedule Summary</p>
                </div>
                <div className="divide-y divide-border/40">
                  {[
                    { label: 'Deceased',    value: row.deceased_name },
                    { label: 'Client',      value: row.clientName ?? '—' },
                    { label: 'Pickup',      value: pickupDatetime ? fmtDateTime(new Date(pickupDatetime).toISOString()) : '—' },
                    { label: 'Wake Start',  value: wakeStart ? fmtDate(wakeStart) : '—' },
                    { label: 'Wake End',    value: wakeEnd   ? fmtDate(wakeEnd)   : '—' },
                    { label: 'Location',    value: burialLocation === 'Other Location' ? (burialOther || 'Other') : (burialLocation || '—') },
                    ...(notes.trim() ? [{ label: 'Notes', value: notes }] : []),
                  ].map(f => (
                    <div key={f.label} className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-semibold text-foreground text-right max-w-[60%]">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-muted/30 border border-border/60 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  Please verify all details before saving. The client will be able to see this schedule.
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
                onClick={() => setStep(2)}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Review →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? 'Saving…' : 'Save Schedule'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Review Extension Request Modal ────────────────────────────
function ReviewRequestModal({
  req,
  onClose,
  onReviewed,
}: {
  req: RequestRow
  onClose: () => void
  onReviewed: (id: string, status: 'approved' | 'rejected', reason?: string, comment?: string) => void
}) {
  const supabase   = createClient()
  const [step,     setStep]     = useState<1 | 2>(1)
  const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('')
  const [reason,   setReason]   = useState('')
  const [comment,  setComment]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const isOther = reason === 'Other'

  const canProceed = decision === 'approved' || (decision === 'rejected' && !!reason && (!isOther || comment.trim()))

  const handleConfirm = async () => {
    if (!decision) return
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'
    const { error: err } = await supabase
      .from('wake_extension_requests')
      .update({
        status:             decision,
        rejection_reason:   decision === 'rejected' ? reason : null,
        rejection_comment:  decision === 'rejected' ? (isOther ? comment.trim() : (comment.trim() || null)) : null,
        reviewed_by:        user?.id ?? null,
        reviewed_at:        new Date().toISOString(),
      })
      .eq('id', req.id)
    if (err) { setError(err.message); setLoading(false); return }

    // If approving an extension, update the wake end date
    if (decision === 'approved' && req.request_type === 'extension' && req.requested_end_date) {
      await supabase.from('wakes').update({ wake_end_date: req.requested_end_date }).eq('id', req.wake_id)
    }

    // If approving a location change, update the wake burial location
    if (decision === 'approved' && req.request_type === 'location_change' && req.new_location) {
      await supabase.from('wakes').update({
        burial_location:       req.new_location,
        burial_location_other: req.new_location === 'Other Location' ? req.new_location_other : null,
      }).eq('id', req.wake_id)
    }

    await logActivity({
      category:     'log',
      event_type:   `wake_request_${decision}`,
      entity_table: 'wake_extension_requests',
      entity_id:    req.id,
      actor_id:     user?.id,
      actor_name:   actorName,
      message:      `${actorName} ${decision} ${req.clientName ?? 'a client'}'s ${req.request_type.replace('_', ' ')} request`,
    })

    setLoading(false)
    onReviewed(req.id, decision, reason, isOther ? comment.trim() : (comment.trim() || undefined))
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
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
            <Eye className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Review Request</h3>
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          {/* Request details */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Client</span>
              <span className="font-bold text-foreground">{req.clientName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Deceased</span>
              <span className="font-semibold text-foreground">{req.wakeName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Request Type</span>
              <span className="font-semibold capitalize text-foreground">
                {req.request_type.replace('_', ' ')}
              </span>
            </div>
            {req.request_type === 'extension' && req.requested_end_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Requested End Date</span>
                <span className="font-semibold text-foreground">{fmtDate(req.requested_end_date)}</span>
              </div>
            )}
            {req.request_type === 'location_change' && req.new_location && (
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">New Location</span>
                <span className="font-semibold text-foreground text-right max-w-[60%]">
                  {req.new_location === 'Other Location' ? (req.new_location_other || 'Other') : req.new_location}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Submitted</span>
              <span className="text-foreground">{fmtDate(req.created_at)}</span>
            </div>
          </div>

          {step === 1 ? (
            <>
              {/* Decision buttons */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Decision</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDecision('approved'); setReason(''); setComment('') }}
                    className={`flex-1 h-10 rounded-xl text-sm font-bold border-2 transition-all ${
                      decision === 'approved'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDecision('rejected')}
                    className={`flex-1 h-10 rounded-xl text-sm font-bold border-2 transition-all ${
                      decision === 'rejected'
                        ? 'bg-destructive text-destructive-foreground border-destructive'
                        : 'border-border text-muted-foreground hover:border-destructive/40'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Rejection reason */}
              {decision === 'rejected' && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reason <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={reason}
                      onChange={e => { setReason(e.target.value); setComment('') }}
                      className={inputCls}
                    >
                      <option value="">— Select a reason —</option>
                      {REJECTION_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  {isOther && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Custom Reason <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Describe the reason…"
                        maxLength={300}
                        className={`${inputCls} h-auto resize-none py-2.5`}
                      />
                    </div>
                  )}
                  {!isOther && reason && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Comment (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Additional details…"
                        className={`${inputCls} h-auto resize-none py-2.5`}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Final Confirmation
              </p>
              <p className="text-sm text-foreground">
                {decision === 'approved'
                  ? 'Approve this request? The wake schedule will be updated automatically.'
                  : `Reject this request? The client will be notified with the reason: "${reason}".`
                }
              </p>
            </div>
          )}
        </div>

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
                onClick={() => { setError(''); setStep(2) }}
                disabled={!canProceed}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 h-10 rounded-xl text-sm font-bold disabled:opacity-40 transition-all ${
                  decision === 'approved'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                }`}
              >
                {loading ? 'Saving…' : decision === 'approved' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export function WakeScheduleTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()

  const [wakes,        setWakes]        = useState<WakeRow[]>([])
  const [requests,     setRequests]     = useState<RequestRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [subTab,       setSubTab]       = useState<'schedules' | 'requests'>('schedules')
  const [editRow,      setEditRow]      = useState<WakeRow | null>(null)
  const [reviewReq,    setReviewReq]    = useState<RequestRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    // Fetch all wakes
    const { data: rawWakes } = await supabase
      .from('wakes')
      .select('*')
      .order('created_at', { ascending: false })

    if (rawWakes?.length) {
      const userIds = [...new Set(rawWakes.filter(w => w.user_id).map(w => w.user_id as string))]
      const bookingIds = [...new Set(rawWakes.filter(w => w.booking_id).map(w => w.booking_id as string))]
      let profileMap: Record<string, { name: string; email: string }> = {}
      let bookingMap: Record<string, string> = {}
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
      }
      if (bookingIds.length) {
        const { data: bookings } = await supabase.from('bookings').select('id,package_name').in('id', bookingIds)
        if (bookings) bookingMap = Object.fromEntries(bookings.map(b => [b.id, b.package_name]))
      }
      setWakes(rawWakes.map(w => ({
        ...w,
        clientName:     w.user_id ? profileMap[w.user_id]?.name : undefined,
        clientEmail:    w.user_id ? profileMap[w.user_id]?.email : undefined,
        bookingPackage: w.booking_id ? bookingMap[w.booking_id] : undefined,
      })))
    } else {
      setWakes([])
    }

    // Fetch extension requests
    const { data: rawReqs } = await supabase
      .from('wake_extension_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (rawReqs?.length) {
      const userIds = [...new Set(rawReqs.map(r => r.user_id))]
      const wakeIds = [...new Set(rawReqs.map(r => r.wake_id))]
      let profileMap: Record<string, string> = {}
      let wakeNameMap: Record<string, string> = {}
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id,name').in('id', userIds)
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name]))
      }
      if (wakeIds.length) {
        const { data: wakeRows } = await supabase.from('wakes').select('id,deceased_name').in('id', wakeIds)
        if (wakeRows) wakeNameMap = Object.fromEntries(wakeRows.map(w => [w.id, w.deceased_name]))
      }
      setRequests(rawReqs.map(r => ({
        ...r,
        clientName: profileMap[r.user_id] ?? undefined,
        wakeName:   wakeNameMap[r.wake_id] ?? undefined,
      })))
    } else {
      setRequests([])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const updateWake = (updated: WakeRow) => {
    setWakes(prev => prev.map(w => w.id === updated.id ? updated : w))
  }

  const updateRequest = (id: string, status: 'approved' | 'rejected') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    // Re-fetch wakes to reflect any auto-applied changes (extension/location)
    load()
  }

  const q = search.toLowerCase()
  const filteredWakes = wakes.filter(w =>
    !q || [w.deceased_name, w.clientName, w.clientEmail, w.burial_location].some(v => v?.toLowerCase().includes(q))
  )
  const filteredReqs = requests.filter(r =>
    !q || [r.clientName, r.wakeName, r.request_type, r.status].some(v => v?.toLowerCase().includes(q))
  )

  const pendingCount = requests.filter(r => r.status === 'pending').length

  if (loading) return <Spinner />

  const reqFilterOptions = [
    { value: 'schedules' as const, label: `Schedules (${wakes.length})` },
    { value: 'requests'  as const, label: `Requests${pendingCount > 0 ? ` · ${pendingCount} pending` : ` (${requests.length})`}` },
  ]

  return (
    <div className="space-y-5">
      {editRow   && <EditWakeModal    row={editRow}   onClose={() => setEditRow(null)}   onSaved={updateWake} />}
      {reviewReq && <ReviewRequestModal req={reviewReq} onClose={() => setReviewReq(null)} onReviewed={updateRequest} />}

      <SectionHeader
        title="Wake Schedule"
        sub="Manage pickup dates, burial locations, and extension requests for coffin/casket services"
      />

      <FilterPills options={reqFilterOptions} active={subTab} onChange={setSubTab} />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={subTab === 'schedules' ? 'Search by deceased, client, location…' : 'Search by client, deceased, type…'}
      />

      {/* ── Schedules sub-tab ── */}
      {subTab === 'schedules' && (
        filteredWakes.length === 0
          ? <EmptyState message={wakes.length === 0 ? 'No wake schedules yet. They are created when a coffin/casket booking is confirmed.' : 'No schedules match your search.'} />
          : (
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              <div className="overflow-x-auto bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/40">
                      {['Deceased', 'Client', 'Pickup', 'Wake Period', 'Burial Location', 'Package', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/30 last:border-r-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWakes.map((w, i) => (
                      <tr
                        key={w.id}
                        className={`border-b border-border/40 transition-colors hover:bg-muted/20 ${i % 2 !== 0 ? 'bg-muted/[0.03]' : 'bg-card'}`}
                      >
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <p className="font-bold text-foreground">{w.deceased_name}</p>
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <p className="font-semibold text-foreground">{w.clientName ?? '—'}</p>
                          {w.clientEmail && <p className="text-[10px] text-muted-foreground">{w.clientEmail}</p>}
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{fmtDateTime(w.pickup_datetime)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          {w.wake_start_date || w.wake_end_date ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{fmtDate(w.wake_start_date)} – {fmtDate(w.wake_end_date)}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="max-w-[160px] truncate">{locationDisplay(w)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <span className="text-[11px] text-muted-foreground">{w.bookingPackage ?? '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setEditRow(w)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* ── Requests sub-tab ── */}
      {subTab === 'requests' && (
        filteredReqs.length === 0
          ? <EmptyState message={requests.length === 0 ? 'No extension or location change requests yet.' : 'No requests match your search.'} />
          : (
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              <div className="overflow-x-auto bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/40">
                      {['Client', 'Deceased', 'Type', 'Details', 'Submitted', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/30 last:border-r-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReqs.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-border/40 transition-colors hover:bg-muted/20 ${i % 2 !== 0 ? 'bg-muted/[0.03]' : 'bg-card'}`}
                      >
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <p className="font-semibold text-foreground">{r.clientName ?? '—'}</p>
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <p className="text-foreground">{r.wakeName ?? '—'}</p>
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <Badge
                            label={r.request_type === 'extension' ? 'Extension' : 'Location Change'}
                            variant={r.request_type === 'extension' ? 'blue' : 'amber'}
                          />
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30 max-w-[180px]">
                          {r.request_type === 'extension' && r.requested_end_date && (
                            <p className="text-muted-foreground">Until {fmtDate(r.requested_end_date)}</p>
                          )}
                          {r.request_type === 'location_change' && r.new_location && (
                            <p className="text-muted-foreground truncate">
                              {r.new_location === 'Other Location' ? (r.new_location_other || 'Other') : r.new_location}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30 text-[10px] text-muted-foreground whitespace-nowrap">
                          {fmtDate(r.created_at)}
                        </td>
                        <td className="px-5 py-3.5 border-r border-border/30">
                          <Badge
                            label={r.status}
                            variant={r.status === 'approved' ? 'green' : r.status === 'pending' ? 'amber' : 'red'}
                          />
                          {r.status === 'rejected' && r.rejection_reason && (
                            <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[100px] truncate">{r.rejection_reason}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {r.status === 'pending' ? (
                            <button
                              onClick={() => setReviewReq(r)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors"
                            >
                              <Eye className="h-3 w-3" /> Review
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground capitalize">{r.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
    </div>
  )
}
