'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, ScrollText, CheckCircle2, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { createClient } from '@/lib/supabase/client'
import type { Obituary } from '@/lib/supabase/types'

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

// ── Helpers ──────────────────────────────────────────────────
type RichObituary = Obituary & { photoUrl: string | null }

function splitName(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' }
  const lastName  = parts[parts.length - 1]
  const firstName = parts[0]
  const middleName = parts.slice(1, -1).join(' ')
  return { firstName, middleName, lastName }
}

// ── Tarp card — renders the actual TarpPreview ───────────────
function TarpCard({ obituary, onClick }: { obituary: RichObituary; onClick?: () => void }) {
  const { firstName, middleName, lastName } = splitName(obituary.full_name)
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className="w-full block rounded-2xl overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={onClick ? `View ${obituary.full_name}` : undefined}
    >
      <TarpPreview
        firstName={firstName}
        middleName={middleName}
        lastName={lastName}
        birthDate={obituary.birth_date ?? ''}
        deathDate={obituary.death_date ?? ''}
        age={obituary.age ?? ''}
        photoUrl={obituary.photoUrl}
        venueAddress={obituary.venue_address ?? ''}
        contactNumber={obituary.contact_number ?? ''}
      />
    </Wrapper>
  )
}

// ── Slideshow — coverflow carousel ──────────────────────────
const SLIDE_INTERVAL = 5000

function ObituarySlideshow({ obituaries, onSelect }: {
  obituaries: RichObituary[]
  onSelect: (o: RichObituary) => void
}) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const n = obituaries.length

  // Each item occupies ITEM_W % of the track width.
  // The strip is (n * ITEM_W)% wide.
  // We translate so the active item is centred.
  // Centre offset = 50% of track - 50% of one item = (50 - ITEM_W/2)%
  // translateX = -(current * ITEM_W)% + centreOffset
  const ITEM_W = 56   // vw-ish percentage of the track per card
  const SIDE_SCALE = 0.72
  const SIDE_OPACITY = 0.35

  const scrollThumb = useCallback((idx: number) => {
    const strip = thumbRef.current
    if (!strip) return
    ;(strip.children[idx] as HTMLElement | undefined)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  const go = useCallback((idx: number) => {
    const next = (idx + n) % n
    setCurrent(next)
    scrollThumb(next)
  }, [n, scrollThumb])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        const next = (c + 1) % n
        scrollThumb(next)
        return next
      })
    }, SLIDE_INTERVAL)
  }, [n, scrollThumb])

  useEffect(() => {
    if (n < 2) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [n, resetTimer])

  if (n === 0) return null

  const prev = () => { go(current - 1); resetTimer() }
  const next = () => { go(current + 1); resetTimer() }
  const o = obituaries[current]

  // translateX that centres the active card
  // strip width = n * ITEM_W%, each card starts at i * ITEM_W%
  // we want card centre (i * ITEM_W + ITEM_W/2)% to align with track centre (50%)
  // so translateX = 50% - (i * ITEM_W + ITEM_W/2)%  (as % of strip width)
  // but since strip width = n*ITEM_W% of track, we work in track-% units:
  // translateX (track %) = 50 - (current * ITEM_W + ITEM_W/2)
  const translatePct = 50 - (current * ITEM_W + ITEM_W / 2)

  return (
    <div className="flex flex-col items-center w-full gap-3 select-none">

      {/* ── Carousel viewport ── */}
      <div className="relative w-full overflow-hidden">

        {/* Sliding strip — all items live here permanently */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: `${n * ITEM_W}%`,
            transform: `translateX(${translatePct}%)`,
            transition: 'transform 420ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
        >
          {obituaries.map((ob, i) => {
            const { firstName, middleName, lastName } = splitName(ob.full_name)
            const isActive = i === current
            const dist = Math.min(Math.abs(i - current), n - Math.abs(i - current))
            const scale   = isActive ? 1 : SIDE_SCALE - Math.max(0, dist - 1) * 0.06
            const opacity = isActive ? 1 : SIDE_OPACITY
            const blur    = isActive ? 0 : 1

            return (
              <div
                key={ob.id}
                style={{
                  width: `${100 / n}%`,
                  padding: '0 1.5%',
                  flexShrink: 0,
                  transform: `scale(${scale})`,
                  opacity,
                  filter: blur ? `blur(${blur}px)` : 'none',
                  transition: 'transform 420ms cubic-bezier(0.4,0,0.2,1), opacity 420ms ease, filter 420ms ease',
                  cursor: 'pointer',
                  zIndex: isActive ? 2 : 1,
                }}
                onClick={() => isActive ? onSelect(ob) : go(i)}
                role="button"
                tabIndex={isActive ? 0 : -1}
                aria-label={isActive ? `View ${ob.full_name}` : `Go to ${ob.full_name}`}
              >
                <div className={`w-full rounded-2xl overflow-hidden border-2 shadow-lg transition-shadow duration-420 ${
                  isActive ? 'border-primary/50 shadow-primary/10 shadow-xl' : 'border-border/20'
                }`}>
                  <TarpPreview
                    firstName={firstName} middleName={middleName} lastName={lastName}
                    birthDate={ob.birth_date ?? ''} deathDate={ob.death_date ?? ''} age={ob.age ?? ''}
                    photoUrl={ob.photoUrl} venueAddress={ob.venue_address ?? ''} contactNumber={ob.contact_number ?? ''}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Prev / Next buttons */}
        {n > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={next}
              className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* ── Name caption ── */}
      <div className="text-center">
        <p className="font-serif font-semibold text-foreground text-sm leading-tight">{o.full_name}</p>
        {(o.birth_date || o.death_date) && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {o.birth_date ? new Date(o.birth_date).getFullYear() : '?'}
            {' – '}
            {o.death_date ? new Date(o.death_date).getFullYear() : '?'}
          </p>
        )}
      </div>

      {/* ── Desktop: mini thumbnail strip (up to 10) ── */}
      {n > 1 && (
        <div
          ref={thumbRef}
          className="hidden md:flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 max-w-2xl w-full justify-center"
        >
          {obituaries.slice(0, 10).map((ob, i) => {
            const { firstName, middleName, lastName } = splitName(ob.full_name)
            return (
              <button
                key={ob.id}
                onClick={() => { go(i); resetTimer() }}
                aria-label={`Go to ${ob.full_name}`}
                className={`shrink-0 w-14 rounded-md overflow-hidden border-2 transition-all duration-300 focus:outline-none ${
                  i === current
                    ? 'border-primary shadow-sm scale-[1.08]'
                    : 'border-transparent opacity-45 hover:opacity-75 hover:border-border'
                }`}
              >
                <TarpPreview
                  firstName={firstName} middleName={middleName} lastName={lastName}
                  birthDate={ob.birth_date ?? ''} deathDate={ob.death_date ?? ''} age={ob.age ?? ''}
                  photoUrl={ob.photoUrl} venueAddress={ob.venue_address ?? ''} contactNumber={ob.contact_number ?? ''}
                />
              </button>
            )
          })}
        </div>
      )}

      {/* ── Mobile: dots only ── */}
      {n > 1 && (
        <div className="flex md:hidden justify-center gap-1.5 shrink-0">
          {obituaries.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i); resetTimer() }}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-border hover:bg-muted-foreground'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Obituary submission modal ─────────────────────────────────
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

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
  const supabase = createClient()

  const [allPublished, setAllPublished] = useState<RichObituary[]>([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState<RichObituary | null>(null)
  const [showModal, setShowModal]       = useState(false)

  useEffect(() => {
    const fetchObituaries = async () => {
      const { data, error } = await supabase
        .from('obituaries')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) { setLoading(false); return }

      const enriched: RichObituary[] = (data ?? []).map(o => ({
        ...o,
        photoUrl: o.image_path && o.image_path !== 'obituaries/placeholder.png'
          ? supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
          : null,
      }))

      setAllPublished(enriched)
      setLoading(false)
    }

    fetchObituaries()
  }, [supabase])

  return (
    <>
      <HeroHeader />

      {/*
        Full-viewport panel (minus the 64px sticky header).
        Flex column: title row (shrink-0) → slideshow (flex-1, min-h-0).
      */}
      <main
        className="flex flex-col bg-background overflow-hidden"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        {/* ── Title row ── */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Obituaries</h1>
          <Button
            onClick={() => setShowModal(true)}
            size="sm"
            className="inline-flex items-center gap-1.5 rounded-xl font-semibold text-xs"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Submit
          </Button>
        </div>

        {/* ── Slideshow area — takes all remaining height ── */}
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 md:px-8 py-4">
          {loading ? (
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : allPublished.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No published obituaries yet.</p>
          ) : (
            <ObituarySlideshow obituaries={allPublished} onSelect={setSelected} />
          )}
        </div>
      </main>

      {/* ── Lightbox ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-5 right-5 z-[110] h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={e => { e.stopPropagation(); setSelected(null) }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <TarpCard obituary={selected} />
          </div>
        </div>
      )}

      {/* ── Submission modal ── */}
      {showModal && <ObituaryModal onClose={() => setShowModal(false)} />}
    </>
  )
}

