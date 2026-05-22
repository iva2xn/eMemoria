'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from './alert-banner'
import { Button } from './button'
import { TarpPreview } from './tarp-preview'
import { UploadCloud, CheckCircle2 } from 'lucide-react'

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

export function ObituaryForm() {
  const supabase = createClient()

  const [firstName,     setFirstName]     = useState('')
  const [middleName,    setMiddleName]     = useState('')
  const [lastName,      setLastName]       = useState('')
  const [birthDate,     setBirthDate]      = useState('')
  const [deathDate,     setDeathDate]      = useState('')
  const [age,           setAge]            = useState('')
  const [venueAddress,  setVenueAddress]   = useState('')
  const [contactNumber, setContactNumber]  = useState('')
  const [submitterName, setSubmitterName]  = useState('')
  const [submitterEmail,setSubmitterEmail] = useState('')

  const [photo,    setPhoto]    = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setFileName(f.name)
    setPhotoUrl(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim())     { setError('First name is required.'); return }
    if (!lastName.trim())      { setError('Last name is required.'); return }
    if (!submitterName.trim()) { setError('Your name is required.'); return }
    if (!submitterEmail.trim()){ setError('Your email is required.'); return }
    if (!contactNumber.trim()) { setError('Contact number is required.'); return }
    if (!venueAddress.trim())  { setError('Venue address is required.'); return }

    setLoading(true)

    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('obituaries').upload(path, photo, { upsert: false })
      if (uploadErr) { setError('Photo upload failed: ' + uploadErr.message); setLoading(false); return }
      imagePath = path
    }

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:       fullName,
      birth_date:      birthDate || null,
      death_date:      deathDate || null,
      age:             age ? Number(age) : null,
      image_path:      imagePath,
      venue_address:   venueAddress.trim(),
      contact_number:  contactNumber.trim(),
      submitter_name:  submitterName.trim(),
      submitter_email: submitterEmail.trim(),
      is_published:    false,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-serif text-xl font-bold text-foreground">Obituary Submitted</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Our team will review and publish the obituary shortly. We will reach out to{' '}
          <span className="font-semibold text-foreground">{submitterEmail}</span> once it's live.
        </p>
      </div>
    )
  }

  const showPreview = !!(firstName || lastName || birthDate || deathDate)

  return (
    <div className="space-y-8">
      {showPreview && (
        <div className="space-y-2">
          <p className={lbl}>Tarpaulin Preview</p>
          <TarpPreview
            firstName={firstName || 'FIRST NAME'}
            middleName={middleName}
            lastName={lastName || 'LAST NAME'}
            birthDate={birthDate}
            deathDate={deathDate}
            age={age}
            photoUrl={photoUrl}
            venueAddress={venueAddress}
            contactNumber={contactNumber}
          />
          <p className="text-[10px] text-muted-foreground">Live preview — updates as you type.</p>
        </div>
      )}

      {error && <AlertBanner variant="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Deceased info */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h3 className="text-sm font-bold text-foreground">Deceased Information</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This information will appear on the tarpaulin.</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="First Name" required>
                <input type="text" placeholder="e.g. Juan" value={firstName}
                  onChange={e => setFirstName(e.target.value)} className={inp} />
              </Field>
              <Field label="Middle Name (optional)">
                <input type="text" placeholder="e.g. Santos" value={middleName}
                  onChange={e => setMiddleName(e.target.value)} className={inp} />
              </Field>
              <Field label="Last Name" required>
                <input type="text" placeholder="e.g. Dela Cruz" value={lastName}
                  onChange={e => setLastName(e.target.value)} className={inp} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date of Birth">
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} />
              </Field>
              <Field label="Date of Death">
                <input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className={inp} />
              </Field>
              <Field label="Age">
                <input type="number" placeholder="e.g. 72" min="0" max="150" value={age}
                  onChange={e => setAge(e.target.value)} className={inp} />
              </Field>
            </div>
            <Field label="Photo of Deceased (background removed preferred)">
              <div
                className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-5 text-center transition-all bg-background cursor-pointer group"
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
                <p className="text-xs font-semibold text-foreground truncate px-4">
                  {fileName || 'Click to upload photo'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">PNG with transparent background recommended · max 5 MB</p>
              </div>
            </Field>
          </div>
        </div>

        {/* Event info */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h3 className="text-sm font-bold text-foreground">Event Details</h3>
          </div>
          <div className="px-6 py-5 space-y-4">
            <Field label="Venue / Address" required>
              <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)} className={inp} />
            </Field>
            <Field label="Contact Number" required>
              <input type="tel" placeholder="e.g. 0916 797 8416" value={contactNumber}
                onChange={e => setContactNumber(e.target.value)} className={inp} />
            </Field>
          </div>
        </div>

        {/* Submitter info */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h3 className="text-sm font-bold text-foreground">Your Information</h3>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your Full Name" required>
                <input type="text" placeholder="Juan Dela Cruz" value={submitterName}
                  onChange={e => setSubmitterName(e.target.value)} className={inp} />
              </Field>
              <Field label="Your Email Address" required>
                <input type="email" placeholder="juan@example.com" value={submitterEmail}
                  onChange={e => setSubmitterEmail(e.target.value)} className={inp} />
              </Field>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl text-sm">
          {loading ? 'Submitting…' : 'Submit Obituary'}
        </Button>

      </form>
    </div>
  )
}
