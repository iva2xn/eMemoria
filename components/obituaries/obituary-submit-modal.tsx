'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview, computeAge } from '@/components/ui/tarp-preview'
import { PhoneInput } from '@/components/ui/phone-input'
import { ScrollText, X, CheckCircle2, UploadCloud, ChevronLeft, AlertTriangle } from 'lucide-react'

const inp = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-primary ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

type Step = 'form' | 'review'

export function ObituarySubmitModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [step,           setStep]           = useState<Step>('form')
  const [firstName,      setFirstName]      = useState('')
  const [middleName,     setMiddleName]     = useState('')
  const [lastName,       setLastName]       = useState('')
  const [birthDate,      setBirthDate]      = useState('')
  const [deathDate,      setDeathDate]      = useState('')
  const [venueAddress,   setVenueAddress]   = useState('')
  const [contactNumber,  setContactNumber]  = useState('')
  const [submitterName,  setSubmitterName]  = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [photo,          setPhoto]          = useState<File | null>(null)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [fileName,       setFileName]       = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [done,           setDone]           = useState(false)

  // Auto-computed age — shown in review and tarp preview
  const computedAge = computeAge(birthDate, deathDate)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setFileName(f.name)
    setPhotoPreview(URL.createObjectURL(f))
  }

  // Step 1 → Step 2 validation
  const handleNext = () => {
    setError('')
    if (!firstName.trim())     { setError('First name of deceased is required.'); return }
    if (!lastName.trim())      { setError('Last name of deceased is required.'); return }
    if (!birthDate)            { setError('Date of birth is required.'); return }
    if (!deathDate)            { setError('Date of death is required.'); return }
    if (!venueAddress.trim())  { setError('Venue address is required.'); return }
    if (!contactNumber.trim()) { setError('Contact number is required.'); return }
    setStep('review')
  }

  // Final submit (step 2)
  const handleSubmit = async () => {
    setLoading(true); setError('')

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    // Get current user (optional — guests can submit too)
    const { data: { user } } = await supabase.auth.getUser()

    // Upload photo if provided
    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('obituaries')
        .upload(path, photo, { upsert: false })
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setLoading(false); return }
      imagePath = path
    }

    // Compute numeric age from dates for storage
    const ageNum = computeAge(birthDate, deathDate)
      ? (() => {
          const b = new Date(birthDate + 'T00:00:00')
          const d = new Date(deathDate + 'T00:00:00')
          let y = d.getFullYear() - b.getFullYear()
          let m = d.getMonth() - b.getMonth()
          if (d.getDate() < b.getDate()) m--
          if (m < 0) { y--; }
          return y >= 0 ? y : 0
        })()
      : null

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:       fullName.trim(),
      birth_date:      birthDate || null,
      death_date:      deathDate || null,
      age:             ageNum,
      image_path:      imagePath,
      venue_address:   venueAddress.trim(),
      contact_number:  contactNumber.trim(),
      submitter_name:  submitterName.trim() || null,
      submitter_email: submitterEmail.trim() || null,
      user_id:         user?.id ?? null,
      created_by:      user?.id ?? null,
      is_published:    false,
      is_approved:     false,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDone(true)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              {step === 'review' && !done && (
                <button
                  onClick={() => { setStep('form'); setError('') }}
                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <ScrollText className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {done ? 'Obituary Submitted' : step === 'form' ? 'Submit Memorial Tarpaulin' : 'Review Before Submitting'}
                </h2>
                {!done && (
                  <p className="text-[10px] text-muted-foreground">
                    {step === 'form' ? 'Step 1 of 2 — Fill in details' : 'Step 2 of 2 — Confirm details'}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {done ? (
            <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">Obituary Submitted</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Our team will review your submission. You can track its status in the <strong>My Obituaries</strong> tab.
              </p>
              <Button onClick={onClose} className="rounded-xl px-8 mt-2">Close</Button>
            </div>

          ) : step === 'form' ? (
            <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Live preview */}
              <div>
                <p className={lbl}>Live Tarpaulin Preview</p>
                <TarpPreview
                  firstName={firstName || 'FIRST NAME'} middleName={middleName}
                  lastName={lastName || 'LAST NAME'} birthDate={birthDate}
                  deathDate={deathDate} age={computedAge} photoUrl={photoPreview}
                  venueAddress={venueAddress} contactNumber={contactNumber}
                />
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="First Name of Deceased" required>
                    <input type="text" placeholder="e.g. Juan" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} />
                  </Field>
                </div>
                <Field label="Middle Name (optional)">
                  <input type="text" placeholder="e.g. Santos" value={middleName} onChange={e => setMiddleName(e.target.value)} className={inp} />
                </Field>
                <Field label="Last Name / Surname" required>
                  <input type="text" placeholder="e.g. Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} />
                </Field>
                <Field label="Date of Birth" required>
                  <input type="date" value={birthDate} max={new Date().toISOString().split('T')[0]} onChange={e => setBirthDate(e.target.value)} className={inp} />
                </Field>
                <Field label="Date of Death" required>
                  <input type="date" value={deathDate} max={new Date().toISOString().split('T')[0]} onChange={e => setDeathDate(e.target.value)} className={inp} />
                </Field>
                {/* Auto-computed age read-only display */}
                {computedAge && (
                  <div className="sm:col-span-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Age</span>
                    <span className="text-sm font-bold text-primary">{computedAge}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">(auto-computed)</span>
                  </div>
                )}
                <Field label="Contact Number" required>
                  <PhoneInput value={contactNumber} onChange={setContactNumber} className={inp} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Venue / Wake Address" required>
                    <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className={inp} />
                  </Field>
                </div>
              </div>

              {/* Submitter info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border/60">
                <Field label="Your Name (optional)">
                  <input type="text" placeholder="e.g. Maria Dela Cruz" value={submitterName} onChange={e => setSubmitterName(e.target.value)} className={inp} />
                </Field>
                <Field label="Your Email (optional)">
                  <input type="email" placeholder="e.g. maria@example.com" value={submitterEmail} onChange={e => setSubmitterEmail(e.target.value)} className={inp} />
                </Field>
              </div>

              {/* Photo upload */}
              <Field label="Photo of Deceased (PNG with transparent background preferred)">
                <div
                  className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group"
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mx-auto mb-1.5 transition-colors" />
                  <p className="text-xs font-semibold text-foreground truncate px-4">{fileName || 'Click to upload photo'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG recommended · max 5 MB</p>
                </div>
              </Field>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">Cancel</Button>
                <Button type="button" onClick={handleNext} className="flex-1 h-11 font-bold rounded-xl">
                  Review →
                </Button>
              </div>
            </div>

          ) : (
            // Step 2 — Review
            <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Tarp preview */}
              <div>
                <p className={lbl}>Tarpaulin Preview</p>
                <TarpPreview
                  firstName={firstName} middleName={middleName} lastName={lastName}
                  birthDate={birthDate} deathDate={deathDate} age={computedAge}
                  photoUrl={photoPreview} venueAddress={venueAddress} contactNumber={contactNumber}
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Submission Summary</p>
                </div>
                <div className="divide-y divide-border/40">
                  {[
                    { label: 'Full Name',     value: [firstName, middleName, lastName].filter(Boolean).join(' ') },
                    { label: 'Date of Birth', value: birthDate || '—' },
                    { label: 'Date of Death', value: deathDate || '—' },
                    { label: 'Age',           value: computedAge || '—' },
                    { label: 'Venue',         value: venueAddress },
                    { label: 'Contact',       value: contactNumber },
                    ...(submitterName  ? [{ label: 'Submitted By', value: submitterName }]  : []),
                    ...(submitterEmail ? [{ label: 'Your Email',   value: submitterEmail }] : []),
                  ].map(f => (
                    <div key={f.label} className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-semibold text-foreground text-right max-w-[60%] truncate">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  Your obituary will be reviewed by our staff before it is published. You can track the status in the <strong>My Obituaries</strong> tab.
                </p>
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => { setStep('form'); setError('') }} className="flex-1 h-11 rounded-xl">
                  ← Edit
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-11 font-bold rounded-xl">
                  {loading ? 'Submitting…' : 'Confirm & Submit'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
