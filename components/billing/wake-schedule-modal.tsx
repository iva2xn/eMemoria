'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { SARIAYA_CEMETERIES } from '@/components/admin/wake-schedule-tab'
import {
  Moon, Calendar, MapPin, Clock,
  CheckCircle2, X, ChevronLeft, AlertTriangle,
} from 'lucide-react'

const inp = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-primary ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

interface WakeScheduleModalProps {
  deceasedName: string   // pre-filled from the obituary modal
  onDone: () => void     // called after submit or skip → triggers redirect
}

export function WakeScheduleModal({ deceasedName, onDone }: WakeScheduleModalProps) {
  useLockBodyScroll()
  const supabase = createClient()

  const [step,            setStep]            = useState<1 | 2>(1)
  const [pickupDate,      setPickupDate]       = useState('')
  const [pickupTime,      setPickupTime]       = useState('')
  const [wakeStart,       setWakeStart]        = useState('')
  const [wakeEnd,         setWakeEnd]          = useState('')
  const [burialLocation,  setBurialLocation]   = useState('')
  const [burialOther,     setBurialOther]      = useState('')
  const [notes,           setNotes]            = useState('')
  const [loading,         setLoading]          = useState(false)
  const [error,           setError]            = useState('')
  const [done,            setDone]             = useState(false)

  const isOther  = burialLocation === 'Other Location'
  const todayStr = new Date().toISOString().split('T')[0]

  const validate = () => {
    if (isOther && !burialOther.trim()) {
      setError('Please specify the burial location.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('You must be signed in.'); setLoading(false); return }

    const { error: err } = await supabase.from('wake_schedule_requests').insert({
      user_id:                         user.id,
      deceased_name:                   deceasedName,
      preferred_pickup_date:           pickupDate   || null,
      preferred_pickup_time:           pickupTime.trim() || null,
      preferred_wake_start:            wakeStart    || null,
      preferred_wake_end:              wakeEnd      || null,
      preferred_burial_location:       burialLocation || null,
      preferred_burial_location_other: isOther ? burialOther.trim() : null,
      notes:                           notes.trim() || null,
      status:                          'pending',
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  // ── Done state ────────────────────────────────────────────
  if (done) {
    return createPortal(
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-serif text-xl font-bold text-foreground">Schedule Preferences Saved</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Our team will review your preferences and set up your wake schedule. You can track it on your{' '}
            <span className="font-semibold text-foreground">Wake Schedule</span> page.
          </p>
          <Button onClick={onDone} className="w-full h-11 font-bold rounded-xl mt-2">
            Continue
          </Button>
        </div>
      </div>,
      document.body
    )
  }

  const reviewRows = [
    { label: 'Deceased',       value: deceasedName },
    { label: 'Preferred Pickup Date', value: pickupDate  ? fmtDate(pickupDate)  : '— (not set)' },
    { label: 'Preferred Pickup Time', value: pickupTime  || '— (not set)' },
    { label: 'Wake Start',     value: wakeStart ? fmtDate(wakeStart) : '— (not set)' },
    { label: 'Wake End',       value: wakeEnd   ? fmtDate(wakeEnd)   : '— (not set)' },
    { label: 'Burial Location',value: burialLocation === 'Other Location' ? (burialOther || 'Other') : (burialLocation || '— (not set)') },
    ...(notes.trim() ? [{ label: 'Notes', value: notes }] : []),
  ]

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
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
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Moon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {step === 1 ? 'Wake Schedule Preferences' : 'Review Your Preferences'}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {deceasedName} · Step {step} of 2
              </p>
            </div>
          </div>
          <button
            onClick={onDone}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          {step === 1 ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Let us know your preferred wake schedule. These are requests — our staff will
                confirm the final details and you&apos;ll be notified via your Wake Schedule page.
                You may also skip this and contact us directly.
              </p>

              {/* Pickup */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Pickup
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preferred Pickup Date">
                    <input
                      type="date"
                      min={todayStr}
                      value={pickupDate}
                      onChange={e => setPickupDate(e.target.value)}
                      className={inp}
                    />
                  </Field>
                  <Field label="Preferred Pickup Time" hint="e.g. 8:00 AM, afternoon">
                    <input
                      type="text"
                      placeholder="e.g. 8:00 AM"
                      value={pickupTime}
                      onChange={e => setPickupTime(e.target.value)}
                      className={inp}
                      maxLength={30}
                    />
                  </Field>
                </div>
              </div>

              {/* Wake period */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Wake Period
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Wake Start Date">
                    <input
                      type="date"
                      min={todayStr}
                      value={wakeStart}
                      onChange={e => setWakeStart(e.target.value)}
                      className={inp}
                    />
                  </Field>
                  <Field label="Wake End Date">
                    <input
                      type="date"
                      min={wakeStart || todayStr}
                      value={wakeEnd}
                      onChange={e => setWakeEnd(e.target.value)}
                      className={inp}
                    />
                  </Field>
                </div>
              </div>

              {/* Burial location */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Burial / Interment Location
                </p>
                <select
                  value={burialLocation}
                  onChange={e => { setBurialLocation(e.target.value); if (e.target.value !== 'Other Location') setBurialOther('') }}
                  className={inp}
                >
                  <option value="">— Select a cemetery in Sariaya —</option>
                  {SARIAYA_CEMETERIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {isOther && (
                  <input
                    type="text"
                    placeholder="Enter full address or location name"
                    value={burialOther}
                    onChange={e => setBurialOther(e.target.value)}
                    className={inp}
                  />
                )}
              </div>

              {/* Notes */}
              <Field label="Additional Notes (optional)">
                <textarea
                  rows={3}
                  placeholder="Any special instructions or requests for our staff…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={500}
                  className={`${inp} h-auto resize-none py-3`}
                />
              </Field>
            </>
          ) : (
            /* Review step */
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Preference Summary</p>
                </div>
                <div className="divide-y divide-border/40">
                  {reviewRows.map(f => (
                    <div key={f.label} className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-semibold text-foreground text-right max-w-[55%]">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-muted/30 border border-border/60 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  These are preferences only. Our staff will confirm the final schedule and notify you
                  via your <span className="font-semibold">Wake Schedule</span> page.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
          {step === 1 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={onDone}
                className="flex-1 h-10 rounded-xl"
              >
                Skip for now
              </Button>
              <Button
                type="button"
                onClick={() => { setError(''); if (validate()) setStep(2) }}
                className="flex-1 h-10 font-bold rounded-xl"
              >
                Review →
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                ← Edit
              </button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-10 font-bold rounded-xl"
              >
                {loading ? 'Submitting…' : 'Submit Preferences'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
