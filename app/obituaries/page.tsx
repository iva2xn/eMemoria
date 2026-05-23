'use client'

import React, { useState, useRef } from 'react'
import { X, ScrollText, CheckCircle2, UploadCloud } from 'lucide-react'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { createClient } from '@/lib/supabase/client'

// ── Shared styles ────────────────────────────────────────────
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

// ── Obituary / Tarp submission modal ─────────────────────────
function ObituaryModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [firstName,     setFirstName]     = useState('')
  const [middleName,    setMiddleName]    = useState('')
  const [lastName,      setLastName]      = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [age,           setAge]           = useState('')
  const [venueAddress,  setVenueAddress]  = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [submitterName,  setSubmitterName]  = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [photo,         setPhoto]         = useState<File | null>(null)
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null)
  const [fileName,      setFileName]      = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [done,          setDone]          = useState(false)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setFileName(f.name)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim())     { setError('First name of deceased is required.'); return }
    if (!lastName.trim())      { setError('Last name of deceased is required.'); return }
    if (!birthDate)            { setError('Date of birth is required.'); return }
    if (!deathDate)            { setError('Date of death is required.'); return }
    if (!age)                  { setError('Age is required.'); return }
    if (!venueAddress.trim())  { setError('Venue address is required.'); return }
    if (!contactNumber.trim()) { setError('Contact number is required.'); return }

    setLoading(true)

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('obituaries').upload(path, photo, { upsert: false })
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setLoading(false); return }
      imagePath = path
    }

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:       fullName.trim(),
      birth_date:      birthDate || null,
      death_date:      deathDate || null,
      age:             age ? Number(age) : null,
      image_path:      imagePath,
      venue_address:   venueAddress.trim(),
      contact_number:  contactNumber.trim(),
      submitter_name:  submitterName.trim() || null,
      submitter_email: submitterEmail.trim() || null,
      is_published:    false,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Non-interactive backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      {/* Scrollable centering wrapper */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Submit Memorial Tarpaulin</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {done ? (
            <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">Obituary Submitted</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Our team will review and prepare the tarpaulin. We&apos;ll reach out to you shortly.
              </p>
              <Button onClick={onClose} className="rounded-xl px-8 mt-2">Close</Button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              <p className="text-xs text-muted-foreground">
                Fill in the details below so we can prepare the memorial tarpaulin for your loved one.
              </p>

              {/* Live tarp preview */}
              <div className="space-y-1.5">
                <p className={lbl}>Live Tarpaulin Preview</p>
                <TarpPreview
                  firstName={firstName || 'FIRST NAME'}
                  middleName={middleName}
                  lastName={lastName || 'LAST NAME'}
                  birthDate={birthDate}
                  deathDate={deathDate}
                  age={age}
                  photoUrl={photoPreview}
                  venueAddress={venueAddress}
                  contactNumber={contactNumber}
                />
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Deceased info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="First Name of Deceased" required>
                      <input type="text" placeholder="e.g. Juan" value={firstName}
                        onChange={e => setFirstName(e.target.value)} className={inp} />
                    </Field>
                  </div>
                  <Field label="Middle Name (optional)">
                    <input type="text" placeholder="e.g. Santos" value={middleName}
                      onChange={e => setMiddleName(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Last Name / Surname" required>
                    <input type="text" placeholder="e.g. Dela Cruz" value={lastName}
                      onChange={e => setLastName(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Date of Birth" required>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Date of Death" required>
                    <input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Age" required>
                    <input type="number" placeholder="e.g. 72" min="0" max="150" value={age}
                      onChange={e => setAge(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Contact Number" required>
                    <input type="tel" placeholder="e.g. 0916 797 8416" value={contactNumber}
                      onChange={e => setContactNumber(e.target.value)} className={inp} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Venue / Wake Address" required>
                      <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress}
                        onChange={e => setVenueAddress(e.target.value)} className={inp} />
                    </Field>
                  </div>
                </div>

                {/* Submitter info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border">
                  <Field label="Your Name (optional)">
                    <input type="text" placeholder="e.g. Maria Dela Cruz" value={submitterName}
                      onChange={e => setSubmitterName(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Your Email (optional)">
                    <input type="email" placeholder="e.g. maria@example.com" value={submitterEmail}
                      onChange={e => setSubmitterEmail(e.target.value)} className={inp} />
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
                    <p className="text-xs font-semibold text-foreground truncate px-4">
                      {fileName || 'Click to upload photo'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG recommended · max 5 MB</p>
                  </div>
                </Field>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 font-bold rounded-xl">
                    {loading ? 'Submitting…' : 'Submit Obituary'}
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

// ── Main page ─────────────────────────────────────────────────
export default function ObituariesPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const obituaries = Array.from({ length: 12 }, (_, i) => `/obituaries/obituaries${i + 1}.png`)

  return (
    <>
      <HeroHeader />

      {/* ── PAGE HEADER ── */}
      <div className="border-b border-border/40 bg-muted/30 px-6 py-10 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">Obituaries</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
          Honoring and remembering the lives of those we&apos;ve lost.
        </p>
        <Button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          <ScrollText className="h-4 w-4" />
          Submit an Obituary
        </Button>
      </div>

      {/* ── GRID ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {obituaries.map((src, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(src)}
              className="group w-full overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Obituary ${index + 1}`}
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-5 right-5 z-[110] h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null) }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Obituary"
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}

      {/* ── OBITUARY SUBMISSION MODAL ── */}
      {showModal && <ObituaryModal onClose={() => setShowModal(false)} />}
    </>
  )
}
