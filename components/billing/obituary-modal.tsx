'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview, computeAge } from '@/components/ui/tarp-preview'
import { UploadCloud, ScrollText, X, CheckCircle2, Wand2 } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'

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

interface ObituaryModalProps {
  submitterName: string
  submitterEmail: string
  submitterPhone: string
  onDone: () => void
}

export function ObituaryModal({ submitterName, submitterEmail, submitterPhone, onDone }: ObituaryModalProps) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [firstName,     setFirstName]     = useState('')
  const [middleName,    setMiddleName]    = useState('')
  const [lastName,      setLastName]      = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [venueAddress,  setVenueAddress]  = useState('')
  const [contactNumber, setContactNumber] = useState(submitterPhone)
  const [photo,         setPhoto]         = useState<File | null>(null)
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null)
  const [fileName,      setFileName]      = useState('')
  const [bgRemoving,    setBgRemoving]    = useState(false)
  const [bgRemoved,     setBgRemoved]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [done,          setDone]          = useState(false)

  // Age is always auto-computed from birth + death dates — never manually entered
  const today       = new Date().toISOString().split('T')[0]
  const computedAge = computeAge(birthDate, deathDate)

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10 MB.')
      return
    }
    const originalUrl = URL.createObjectURL(f)
    setPhoto(f)
    setFileName(f.name)
    setPhotoPreview(originalUrl)
    setBgRemoved(false)

    // Auto background removal
    setBgRemoving(true)
    try {
      const { removeBackground } = await import('@/lib/remove-background')
      const { url, blob } = await removeBackground(f)
      URL.revokeObjectURL(originalUrl)
      setPhotoPreview(url)
      const bgRemovedFile = new File([blob], f.name.replace(/\.\w+$/, '.png'), { type: 'image/png' })
      setPhoto(bgRemovedFile)
      setBgRemoved(true)
    } catch (err) {
      console.warn('Background removal failed, using original:', err)
    } finally {
      setBgRemoving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim())    { setError('First name of deceased is required.'); return }
    if (!lastName.trim())     { setError('Last name of deceased is required.'); return }
    if (!birthDate)           { setError('Date of birth is required.'); return }
    if (!deathDate)           { setError('Date of death is required.'); return }
    if (!venueAddress.trim()) { setError('Venue address is required.'); return }
    if (!contactNumber.trim()){ setError('Contact number is required.'); return }

    setLoading(true)

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    // Compute numeric age for DB storage — keep months as fractional year for babies
    let ageNum: number | null = null
    if (birthDate && deathDate) {
      const b = new Date(birthDate + 'T00:00:00')
      const d = new Date(deathDate + 'T00:00:00')
      let years  = d.getFullYear() - b.getFullYear()
      let months = d.getMonth() - b.getMonth()
      if (d.getDate() < b.getDate()) months--
      if (months < 0) { years--; months += 12 }
      // Store 0 for babies under 1 year — the display string handles months
      ageNum = years >= 0 ? years : 0
    }

    // Get current user — required so the obituary appears on their /obituaries page
    const { data: { user } } = await supabase.auth.getUser()

    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('obituaries').upload(path, photo, { upsert: false })
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setLoading(false); return }
      imagePath = path
    }

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:       fullName,
      birth_date:      birthDate || null,
      death_date:      deathDate || null,
      age:             ageNum,
      image_path:      imagePath,
      venue_address:   venueAddress.trim(),
      contact_number:  contactNumber.trim(),
      submitter_name:  submitterName || null,
      submitter_email: submitterEmail || null,
      // Link to the logged-in user so it appears on their /obituaries page
      user_id:         user?.id ?? null,
      created_by:      user?.id ?? null,
      is_published:    false,
      is_approved:     false,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Memorial Tarpaulin Details</h2>
            </div>
            <button
              onClick={onDone}
              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Done state */}
          {done ? (
            <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">Obituary Submitted</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Our team will review your submission. You can track its status in{' '}
                <span className="font-semibold text-foreground">My Obituaries</span>.
              </p>
              <Button onClick={onDone} className="rounded-xl px-8 mt-2">Continue</Button>
            </div>

          ) : (
            /* Form */
            <div className="px-6 py-5 space-y-5 max-h-[85vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Payment submitted. Fill in the details below so we can prepare the memorial tarpaulin for your loved one.
              </p>

              {/* Live preview */}
              <div>
                <p className={lbl}>Live Tarpaulin Preview</p>
                <TarpPreview
                  firstName={firstName || 'FIRST NAME'}
                  middleName={middleName}
                  lastName={lastName || 'LAST NAME'}
                  birthDate={birthDate}
                  deathDate={deathDate}
                  age={computedAge}
                  photoUrl={photoPreview}
                  venueAddress={venueAddress}
                  contactNumber={contactNumber}
                  showDownload={false}
                />
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="First Name of Deceased" required>
                      <input
                        type="text" placeholder="e.g. Juan"
                        value={firstName} onChange={e => setFirstName(e.target.value)}
                        className={inp}
                      />
                    </Field>
                  </div>
                  <Field label="Middle Name (optional)">
                    <input
                      type="text" placeholder="e.g. Santos"
                      value={middleName} onChange={e => setMiddleName(e.target.value)}
                      className={inp}
                    />
                  </Field>
                  <Field label="Last Name / Surname" required>
                    <input
                      type="text" placeholder="e.g. Dela Cruz"
                      value={lastName} onChange={e => setLastName(e.target.value)}
                      className={inp}
                    />
                  </Field>
                  <Field label="Date of Birth" required>
                    <input
                      type="date" value={birthDate} max={today}
                      onChange={e => setBirthDate(e.target.value)}
                      className={inp}
                    />
                  </Field>
                  <Field label="Date of Death" required>
                    <input
                      type="date" value={deathDate} max={today}
                      onChange={e => setDeathDate(e.target.value)}
                      className={inp}
                    />
                  </Field>

                  {/* Auto-computed age — read-only */}
                  {computedAge && (
                    <div className="sm:col-span-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Age</span>
                      <span className="text-sm font-bold text-primary">{computedAge}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">(auto-computed)</span>
                    </div>
                  )}

                  <Field label="Contact Number" required>
                    <PhoneInput value={contactNumber} onChange={setContactNumber} className={inp} required />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Venue / Wake Address" required>
                      <input
                        type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City"
                        value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
                        className={inp}
                      />
                    </Field>
                  </div>
                </div>

                {/* Photo upload */}
                <Field label="Photo of Deceased">
                  <div
                    className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group"
                    onClick={() => !bgRemoving && fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    {bgRemoving ? (
                      <>
                        <Wand2 className="h-5 w-5 text-primary mx-auto mb-1.5 animate-pulse" />
                        <p className="text-xs font-semibold text-primary">Removing background…</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">This may take a few seconds</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mx-auto mb-1.5 transition-colors" />
                        <p className="text-xs font-semibold text-foreground truncate px-4">
                          {fileName || 'Click to upload photo'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {bgRemoved ? '✓ Background removed automatically' : 'PNG, JPG · max 10 MB · background auto-removed'}
                        </p>
                      </>
                    )}
                  </div>
                </Field>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onDone} className="flex-1 h-11 rounded-xl">
                    Skip for now
                  </Button>
                  <Button type="submit" disabled={loading || bgRemoving} className="flex-1 h-11 font-bold rounded-xl">
                    {bgRemoving ? 'Processing photo…' : loading ? 'Submitting…' : 'Submit Obituary'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
