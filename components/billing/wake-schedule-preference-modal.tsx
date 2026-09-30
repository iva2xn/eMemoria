'use client'

/**
 * WakeSchedulePreferenceModal
 *
 * Shown immediately after a successful payment (for package purchases).
 * - NON-SKIPPABLE: no exit/close button, user must fill it out.
 * - Auto-fetches deceased info from the linked document submission.
 * - Calls onDone() when preferences are saved so the parent can redirect.
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll'
import { Button } from '@/components/ui/button'
import { SARIAYA_CEMETERIES } from '@/components/admin/wake-schedule-tab'
import {
  Moon, Calendar, MapPin, Clock, ChevronLeft,
  AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react'

const inp = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

const SUFFIXES = ['No Suffix', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'Esq.', 'PhD', 'MD', 'RN']

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

interface WakeSchedulePreferenceModalProps {
  /** Deceased name pre-filled from the obituary modal (fallback) */
  deceasedName?: string
  /** Document submission ID to auto-fetch deceased info from */
  documentSubmissionId?: string | null
  /** Called after successful submit → parent should redirect */
  onDone: () => void
}

export function WakeSchedulePreferenceModal({
  deceasedName: fallbackName = '',
  documentSubmissionId,
  onDone,
}: WakeSchedulePreferenceModalProps) {
  useLockBodyScroll()
  const supabase = createClient()

  // Deceased info (editable, pre-filled from doc submission)
  const [firstName,     setFirstName]     = useState('')
  const [middleInitial, setMiddleInitial] = useState('')
  const [lastName,      setLastName]      = useState('')
  const [suffix,        setSuffix]        = useState('No Suffix')
  const [placeOfDeath,  setPlaceOfDeath]  = useState('')
  const [gpsLoading,    setGpsLoading]    = useState(false)
  const [gpsError,      setGpsError]      = useState('')

  // Schedule preferences
  const [pickupDate,      setPickupDate]       = useState('')
  const [pickupTime,      setPickupTime]       = useState('')
  const [wakeStart,       setWakeStart]        = useState('')
  const [wakeEnd,         setWakeEnd]          = useState('')
  const [burialLocation,  setBurialLocation]   = useState('')
  const [burialOther,     setBurialOther]      = useState('')
  const [notes,           setNotes]            = useState('')

  const [step,    setStep]    = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  const isOther  = burialLocation === 'Other Location'
  const todayStr = new Date().toISOString().split('T')[0]

  // Auto-fetch deceased info from document submission
  useEffect(() => {
    if (!documentSubmissionId) return
    setFetching(true)
    supabase
      .from('document_submissions')
      .select('deceased_first_name, deceased_middle_initial, deceased_last_name, deceased_suffix, place_of_death')
      .eq('id', documentSubmissionId)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.deceased_first_name)     setFirstName(data.deceased_first_name)
          if (data.deceased_middle_initial) setMiddleInitial(data.deceased_middle_initial)
          if (data.deceased_last_name)      setLastName(data.deceased_last_name)
          if (data.deceased_suffix)         setSuffix(data.deceased_suffix)
          if (data.place_of_death)          setPlaceOfDeath(data.place_of_death)
        }
        setFetching(false)
      })
  }, [documentSubmissionId, supabase])

  // Fallback: use deceasedName prop to populate first/last name if no doc submission
  useEffect(() => {
    if (!documentSubmissionId && fallbackName && !firstName && !lastName) {
      const parts = fallbackName.trim().split(' ')
      if (parts.length >= 2) {
        setFirstName(parts[0])
        setLastName(parts[parts.length - 1])
        if (parts.length >= 3) setMiddleInitial(parts[1].charAt(0))
      } else {
        setFirstName(fallbackName)
      }
    }
  }, [documentSubmissionId, fallbackName, firstName, lastName])

  const handleLocate = () => {
    if (!navigator.geolocation) { setGpsError('Location is not supported on this device.'); return }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          setPlaceOfDeath(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch {
          setPlaceOfDeath(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        } finally {
          setGpsLoading(false)
        }
      },
      () => { setGpsError('Could not get your location. Please type it in manually.'); setGpsLoading(false) },
      { timeout: 10000 }
    )
  }

  const fullDeceasedName = [firstName, middleInitial, lastName, suffix !== 'No Suffix' ? suffix : '']
    .filter(Boolean).join(' ')

  const validate = (): boolean => {
    if (!firstName.trim())    { setError('First name of the deceased is required.'); return false }
    if (!lastName.trim())     { setError('Last name of the deceased is required.'); return false }
    if (!placeOfDeath.trim()) { setError('Place of death is required.'); return false }
    if (isOther && !burialOther.trim()) { setError('Please specify the burial location.'); return false }
    return true
  }

  const handleNext = () => {
    setError('')
    if (validate()) setStep(2)
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('You need to be signed in to submit this.'); setLoading(false); return }

    const { error: err } = await supabase.from('wake_schedule_requests').insert({
      user_id:                         user.id,
      deceased_name:                   fullDeceasedName || fallbackName || 'Unknown',
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

  // ── Done state ───────────────────────────────────────────────
  if (done) {
    return createPortal(
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-serif text-xl font-bold text-foreground">Schedule Preferences Saved</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Our team will review your preferences and prepare your wake schedule. You can track it on your{' '}
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
    { label: 'Deceased',          value: fullDeceasedName || '—' },
    { label: 'Place of Death',    value: placeOfDeath || '—' },
    { label: 'Pickup Date',       value: pickupDate   ? fmtDate(pickupDate)  : '— (not set)' },
    { label: 'Pickup Time',       value: pickupTime   || '— (not set)' },
    { label: 'Wake Start',        value: wakeStart    ? fmtDate(wakeStart)   : '— (not set)' },
    { label: 'Wake End',          value: wakeEnd      ? fmtDate(wakeEnd)     : '— (not set)' },
    { label: 'Burial Location',   value: burialLocation === 'Other Location' ? (burialOther || 'Other') : (burialLocation || '— (not set)') },
    ...(notes.trim() ? [{ label: 'Notes', value: notes }] : []),
  ]

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — no close button (non-skippable) */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          {step === 2 && (
            <button
              onClick={() => { setStep(1); setError('') }}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Moon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">
              {step === 1 ? 'Wake Schedule Preferences' : 'Review Your Preferences'}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Step {step} of 2 · This step is required before continuing
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {error && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive font-semibold leading-snug">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before we proceed, please confirm the deceased&apos;s information and let us know your preferred wake schedule.
                These are preferences only — our staff will confirm the final details and notify you.
              </p>

              {/* Deceased Information */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Deceased Information
                </p>
                {fetching ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading info from your document submission…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name" required>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className={inp}
                        maxLength={50}
                      />
                    </Field>
                    <Field label="Middle Initial">
                      <input
                        type="text"
                        value={middleInitial}
                        onChange={e => setMiddleInitial(e.target.value)}
                        className={inp}
                        maxLength={10}
                      />
                    </Field>
                    <Field label="Last Name" required>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className={inp}
                        maxLength={50}
                      />
                    </Field>
                    <Field label="Suffix">
                      <div className="relative">
                        <select
                          value={suffix}
                          onChange={e => setSuffix(e.target.value)}
                          className={`${inp} appearance-none pr-8 cursor-pointer`}
                        >
                          {SUFFIXES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
                      </div>
                    </Field>
                    {/* Place of Death */}
                    <div className="col-span-2">
                      <label className={lbl}>Place of Death <span className="text-primary">*</span></label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={placeOfDeath}
                          onChange={e => setPlaceOfDeath(e.target.value)}
                          placeholder="Enter the location or use the pin button"
                          className={`${inp} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={handleLocate}
                          disabled={gpsLoading}
                          title="Use my current location"
                          className="shrink-0 h-11 w-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all disabled:opacity-50"
                        >
                          {gpsLoading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <MapPin className="h-4 w-4" />
                          }
                        </button>
                      </div>
                      {gpsError && <p className="text-[11px] text-destructive mt-1 font-medium">{gpsError}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Pickup */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Pickup (optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preferred Pickup Date">
                    <input type="date" min={todayStr} value={pickupDate}
                      onChange={e => setPickupDate(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Preferred Pickup Time" hint="e.g. 8:00 AM">
                    <input type="text" placeholder="e.g. 8:00 AM" value={pickupTime}
                      onChange={e => setPickupTime(e.target.value)} className={inp} maxLength={30} />
                  </Field>
                </div>
              </div>

              {/* Wake period */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Wake Period (optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Wake Start Date">
                    <input type="date" min={todayStr} value={wakeStart}
                      onChange={e => setWakeStart(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Wake End Date">
                    <input type="date" min={wakeStart || todayStr} value={wakeEnd}
                      onChange={e => setWakeEnd(e.target.value)} className={inp} />
                  </Field>
                </div>
              </div>

              {/* Burial location */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Burial Location (optional)
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
                  <input type="text" placeholder="Enter full address or location name"
                    value={burialOther} onChange={e => setBurialOther(e.target.value)} className={inp} />
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
                  These are preferences only. Our staff will confirm the final schedule and
                  notify you through your <span className="font-semibold">Wake Schedule</span> page.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer — NO skip button */}
        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
          {step === 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="w-full h-10 font-bold rounded-xl"
            >
              Review →
            </Button>
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
