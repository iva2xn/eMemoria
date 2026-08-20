'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview, computeAge } from '@/components/ui/tarp-preview'
import { Badge, SectionHeader, EmptyState, Spinner, FilterPills, inputCls } from './admin-primitives'
import { ScrollText, UploadCloud, X, Check, Plus, Trash2, RotateCcw, Eye } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'
import { logActivity } from '@/lib/activity-log'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll'
import type { Obituary } from '@/lib/supabase/types'

// ── Shared helpers ────────────────────────────────────────────
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'
const inp = 'w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm text-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all appearance-none'

const DELETE_REASONS = [
  'Duplicate entry',
  'Posted by mistake',
  'Requested by family',
  'Incorrect information',
  'Test / placeholder record',
  'Other',
]

// ── 2-Step Approve & Publish Modal ────────────────────────────
function ApprovePublishModal({
  obituary,
  onClose,
  onConfirm,
}: {
  obituary: Obituary
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const supabase = createClient()
  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  const photoUrl = obituary.image_path && obituary.image_path !== 'obituaries/placeholder.png'
    ? supabase.storage.from('obituaries').getPublicUrl(obituary.image_path).data.publicUrl
    : null

  const nameParts = obituary.full_name.trim().split(' ')
  const firstName = nameParts[0] ?? ''
  const lastName  = nameParts[nameParts.length - 1] ?? ''
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">Approve &amp; Publish Obituary</p>
              <p className="text-[10px] text-muted-foreground">Step {step} of 2 — Review before confirming</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {step === 1 ? (
            <>
              {/* Tarp preview */}
              <TarpPreview
                firstName={firstName} middleName={middleName} lastName={lastName}
                birthDate={obituary.birth_date ?? ''} deathDate={obituary.death_date ?? ''}
                age={obituary.age ?? ''} photoUrl={photoUrl}
                venueAddress={obituary.venue_address ?? ''} contactNumber={obituary.contact_number ?? ''}
              />
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-bold text-foreground">{obituary.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="text-foreground">{new Date(obituary.created_at).toLocaleDateString('en-PH')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitter</span>
                  <span className="text-foreground">{obituary.submitter_name ?? '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">Cancel</button>
                <button onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
                  Next →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Confirm Publication</p>
                <p className="text-sm text-foreground">
                  Approve and publish <span className="font-semibold">"{obituary.full_name}"</span>?
                  Once published, it will be visible to the client in their Obituaries tab.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">← Back</button>
                <button
                  onClick={async () => { setLoading(true); await onConfirm(); setLoading(false) }}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Publishing…' : 'Approve & Publish'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────
function DeleteConfirmModal({
  obituary,
  onClose,
  onConfirm,
}: {
  obituary: Obituary
  onClose: () => void
  onConfirm: (reason: string, comment: string) => Promise<void>
}) {
  useLockBodyScroll()
  const [step, setStep] = useState<1 | 2>(1)
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!reason) { setError('Please select a reason.'); return }
    if (reason === 'Other' && !comment.trim()) { setError('Please describe the reason.'); return }
    setError('')
    setStep(2)
  }

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(reason, comment)
    setLoading(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-bold text-foreground">Delete Obituary</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 1 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Moving <span className="font-semibold text-foreground">"{obituary.full_name}"</span> to Recently Deleted.
                It will be permanently removed after 30 days.
              </p>
              {error && <AlertBanner variant="error" message={error} />}
              <div className="space-y-1.5">
                <label className={lbl}>Reason for deletion <span className="text-primary">*</span></label>
                <select
                  value={reason}
                  onChange={e => { setReason(e.target.value); setError('') }}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select a reason…</option>
                  {DELETE_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {reason === 'Other' && (
                <div className="space-y-1.5">
                  <label className={lbl}>Describe the reason <span className="text-primary">*</span></label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    placeholder="Enter details…"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all resize-none"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button type="button" onClick={handleNext} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">
                  Next →
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirm Deletion</p>
                <p className="text-sm text-foreground font-semibold">{obituary.full_name}</p>
                <p className="text-xs text-muted-foreground">Reason: {reason}{reason === 'Other' && comment ? ` — ${comment}` : ''}</p>
                <p className="text-[11px] text-amber-600 font-medium">This will move the record to Recently Deleted for 30 days.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                <Button type="button" onClick={handleConfirm} disabled={loading} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">
                  {loading ? 'Deleting…' : 'Confirm Delete'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Permanent Delete Confirm ──────────────────────────────────
function PermanentDeleteModal({
  obituary,
  onClose,
  onConfirm,
}: {
  obituary: Obituary
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  useLockBodyScroll()
  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Delete Forever?</h2>
              <p className="text-[10px] text-muted-foreground">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {step === 1 ? (
            <>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1">Warning — Permanent Deletion</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">"{obituary.full_name}"</span> will be permanently deleted and cannot be recovered.
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button type="button" onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">
                  Next →
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Final Confirmation</p>
                <p className="text-sm text-foreground">
                  Permanently delete <span className="font-semibold">"{obituary.full_name}"</span>?
                </p>
                <p className="text-[11px] text-red-600 font-medium">This cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                <Button type="button" onClick={handleConfirm} disabled={loading} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">
                  {loading ? 'Deleting…' : 'Delete Forever'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Recover Confirm ───────────────────────────────────────────
function RecoverConfirmModal({
  obituary,
  onClose,
  onConfirm,
}: {
  obituary: Obituary
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  useLockBodyScroll()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Recover Obituary?</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Restore <span className="font-semibold text-foreground">"{obituary.full_name}"</span> back to the active obituaries list?
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={loading} className="flex-1 h-10 rounded-xl">
              {loading ? 'Recovering…' : 'Yes, Recover'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Create Tarp Modal ─────────────────────────────────────────
function CreateTarpModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  useLockBodyScroll()
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [firstName,     setFirstName]     = useState('')
  const [middleName,    setMiddleName]    = useState('')
  const [lastName,      setLastName]      = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [venueAddress,  setVenueAddress]  = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [photo,         setPhoto]         = useState<File | null>(null)
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null)
  const [fileName,      setFileName]      = useState('')
  const [isPublished,   setIsPublished]   = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [done,          setDone]          = useState(false)

  // Age is auto-computed from birth + death dates
  const computedAge = computeAge(birthDate, deathDate)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setFileName(f.name)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim())    { setError('First name is required.'); return }
    if (!lastName.trim())     { setError('Last name is required.'); return }
    if (!birthDate)           { setError('Date of birth is required.'); return }
    if (!deathDate)           { setError('Date of death is required.'); return }
    if (!venueAddress.trim()) { setError('Venue address is required.'); return }
    if (!contactNumber.trim()){ setError('Contact number is required.'); return }

    setLoading(true)
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    // Compute numeric age for DB — 0 for babies under 1 year
    let ageNum: number | null = null
    if (birthDate && deathDate) {
      const b = new Date(birthDate + 'T00:00:00')
      const d = new Date(deathDate + 'T00:00:00')
      let years = d.getFullYear() - b.getFullYear()
      let months = d.getMonth() - b.getMonth()
      if (d.getDate() < b.getDate()) months--
      if (months < 0) { years--; }
      ageNum = years >= 0 ? years : 0
    }

    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('obituaries').upload(path, photo, { upsert: false })
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setLoading(false); return }
      imagePath = path
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:      fullName.trim(),
      birth_date:     birthDate || null,
      death_date:     deathDate || null,
      age:            ageNum,
      image_path:     imagePath,
      venue_address:  venueAddress.trim(),
      contact_number: contactNumber.trim(),
      is_published:   isPublished,
      is_approved:    isPublished, // approved if publishing immediately
      created_by:     user?.id ?? null,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDone(true)
  }

  useLockBodyScroll()
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Create Tarpaulin / Obituary</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {done ? (
            <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">Tarp Created</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                The obituary record has been saved{isPublished ? ' and published' : ' as a draft'}.
              </p>
              <Button onClick={() => { onSuccess(); onClose() }} className="rounded-xl px-8 mt-2">Done</Button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              <div className="space-y-1.5">
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
                />
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={lbl}>First Name of Deceased <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Juan" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Middle Name (optional)</label>
                    <input type="text" placeholder="e.g. Santos" value={middleName} onChange={e => setMiddleName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Last Name / Surname <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Date of Birth <span className="text-primary">*</span></label>
                    <input type="date" value={birthDate} max={new Date().toISOString().split('T')[0]} onChange={e => setBirthDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Date of Death <span className="text-primary">*</span></label>
                    <input type="date" value={deathDate} max={new Date().toISOString().split('T')[0]} onChange={e => setDeathDate(e.target.value)} className={inp} />
                  </div>
                  {computedAge && (
                    <div className="sm:col-span-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Age</span>
                      <span className="text-sm font-bold text-primary">{computedAge}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">(auto-computed)</span>
                    </div>
                  )}
                  <div>
                    <label className={lbl}>Contact Number <span className="text-primary">*</span></label>
                    <PhoneInput value={contactNumber} onChange={setContactNumber} className={inp} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Venue / Wake Address <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className={inp} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Photo of Deceased (PNG with transparent background preferred)</label>
                  <div
                    className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs font-semibold text-foreground truncate px-4">{fileName || 'Click to upload photo'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG recommended · max 5 MB</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsPublished(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${isPublished ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-foreground font-medium">
                    {isPublished ? 'Publish immediately' : 'Save as draft'}
                  </span>
                </label>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 font-bold rounded-xl">
                    {loading ? 'Creating…' : 'Create Tarp'}
                  </Button>
                </div>
              </form>
            </div>
          )}
      </div>
    </div>,
    document.body
  )
}

// ── Days remaining helper ─────────────────────────────────────
function daysUntilPermanentDelete(deletedAt: string): number {
  const deletedMs = new Date(deletedAt).getTime()
  const expiresMs = deletedMs + 30 * 24 * 60 * 60 * 1000
  const remaining = Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000))
  return Math.max(0, remaining)
}

// ── Recently Deleted Tab ──────────────────────────────────────
function RecentlyDeletedPane() {
  const supabase = createClient()
  const [rows, setRows] = useState<Obituary[]>([])
  const [loading, setLoading] = useState(true)
  const [permanentTarget, setPermanentTarget] = useState<Obituary | null>(null)
  const [recoverTarget, setRecoverTarget] = useState<Obituary | null>(null)

  const fetchDeleted = async () => {
    const { data } = await supabase
      .from('obituaries')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchDeleted() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePermanentDelete = async () => {
    if (!permanentTarget) return
    await supabase.from('obituaries').delete().eq('id', permanentTarget.id)
    setRows(r => r.filter(x => x.id !== permanentTarget.id))
    setPermanentTarget(null)
  }

  const handleRecover = async () => {
    if (!recoverTarget) return
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'

    await supabase.from('obituaries').update({
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
      delete_comment: null,
    }).eq('id', recoverTarget.id)

    await logActivity({
      category: 'log',
      event_type: 'obituary_recovered',
      entity_table: 'obituaries',
      entity_id: recoverTarget.id,
      actor_id: user?.id,
      actor_name: actorName,
      message: `${actorName} recovered obituary for ${recoverTarget.full_name}`,
      metadata: { full_name: recoverTarget.full_name },
    })

    setRows(r => r.filter(x => x.id !== recoverTarget.id))
    setRecoverTarget(null)
  }

  if (loading) return (
    <div className="py-16 flex justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
        <Trash2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Records here are permanently removed after 30 days. You can recover them or delete them immediately.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No recently deleted obituaries." />
      ) : (
        <div className="space-y-3">
          {rows.map(o => {
            const daysLeft = o.deleted_at ? daysUntilPermanentDelete(o.deleted_at) : 0
            const photoUrl = o.image_path && o.image_path !== 'obituaries/placeholder.png'
              ? supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
              : null
            const nameParts = o.full_name.trim().split(' ')
            const initials = [nameParts[0]?.[0], nameParts[nameParts.length - 1]?.[0]].filter(Boolean).join('').toUpperCase()
            return (
              <div key={o.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Photo thumbnail */}
                <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted/40 border border-border shrink-0 flex items-center justify-center">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={o.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{initials}</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-bold text-sm text-foreground">{o.full_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {o.birth_date && <span>Born: {new Date(o.birth_date + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                    {o.death_date && <span>Died: {new Date(o.death_date + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                    {o.venue_address && <span className="truncate max-w-[200px]">Venue: {o.venue_address}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Deleted {o.deleted_at ? new Date(o.deleted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    {o.delete_reason ? ` · Reason: ${o.delete_reason}` : ''}
                    {o.delete_comment ? ` (${o.delete_comment})` : ''}
                  </p>
                  <p className={`text-[11px] font-bold ${daysLeft <= 3 ? 'text-red-500' : 'text-amber-600'}`}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} until permanent deletion
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 sm:self-center">
                  <button
                    onClick={() => setRecoverTarget(o)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Recover
                  </button>
                  <button
                    onClick={() => setPermanentTarget(o)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-bold hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Delete Forever
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {permanentTarget && (
        <PermanentDeleteModal
          obituary={permanentTarget}
          onClose={() => setPermanentTarget(null)}
          onConfirm={handlePermanentDelete}
        />
      )}
      {recoverTarget && (
        <RecoverConfirmModal
          obituary={recoverTarget}
          onClose={() => setRecoverTarget(null)}
          onConfirm={handleRecover}
        />
      )}
    </div>
  )
}

// ── Obituaries Tab ────────────────────────────────────────────
type ObituaryView = 'active' | 'deleted'

export function ObituariesTab() {
  const supabase = createClient()
  const [rows, setRows]             = useState<Obituary[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Obituary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [view, setView]             = useState<ObituaryView>('active')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Obituary | null>(null)

  // Approve & Publish 2-step modal
  const [approveTarget, setApproveTarget] = useState<Obituary | null>(null)

  // Edit fields
  const [editFirst,   setEditFirst]   = useState('')
  const [editMiddle,  setEditMiddle]  = useState('')
  const [editLast,    setEditLast]    = useState('')
  const [editBirth,   setEditBirth]   = useState('')
  const [editDeath,   setEditDeath]   = useState('')
  const [editAge,     setEditAge]     = useState('')
  const [editVenue,   setEditVenue]   = useState('')
  const [editContact, setEditContact] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchActive = async () => {
    const { data } = await supabase
      .from('obituaries')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchActive() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (o: Obituary) => {
    setSelected(o)
    const parts = o.full_name.trim().split(' ')
    setEditFirst(parts[0] ?? '')
    setEditLast(parts.length > 1 ? parts[parts.length - 1] : '')
    setEditMiddle(parts.length > 2 ? parts.slice(1, -1).join(' ') : '')
    setEditBirth(o.birth_date ?? '')
    setEditDeath(o.death_date ?? '')
    setEditAge(o.age ? String(o.age) : '')
    setEditVenue(o.venue_address ?? '')
    setEditContact(o.contact_number ?? '')
  }

  const saveEdit = async () => {
    if (!selected) return
    setSaving(true)
    const fullName = [editFirst.trim(), editMiddle.trim(), editLast.trim()].filter(Boolean).join(' ')
    const updates = {
      full_name:      fullName,
      birth_date:     editBirth || null,
      death_date:     editDeath || null,
      age:            editAge ? Number(editAge) : null,
      venue_address:  editVenue || null,
      contact_number: editContact || null,
    }
    await supabase.from('obituaries').update(updates).eq('id', selected.id)
    setRows(r => r.map(x => x.id === selected.id ? { ...x, ...updates } : x))
    setSelected(prev => prev ? { ...prev, ...updates } : null)
    setSaving(false)
  }

  const approveAndPublish = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'
    const obit = rows.find(r => r.id === id)

    await supabase.from('obituaries').update({ is_approved: true, is_published: true }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_approved: true, is_published: true } : x))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_approved: true, is_published: true } : null)
    setApproveTarget(null)

    await logActivity({
      category: 'log', event_type: 'obituary_published',
      entity_table: 'obituaries', entity_id: id,
      actor_id: user?.id, actor_name: actorName,
      message: `${actorName} approved and published obituary for ${obit?.full_name ?? 'unknown'}`,
      metadata: { full_name: obit?.full_name },
    })
  }

  const unpublish = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'
    const obit = rows.find(r => r.id === id)

    await supabase.from('obituaries').update({ is_published: false }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: false } : x))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_published: false } : null)

    await logActivity({
      category: 'log', event_type: 'obituary_unpublished',
      entity_table: 'obituaries', entity_id: id,
      actor_id: user?.id, actor_name: actorName,
      message: `${actorName} unpublished obituary for ${obit?.full_name ?? 'unknown'}`,
      metadata: { full_name: obit?.full_name },
    })
  }

  const handleSoftDelete = async (reason: string, comment: string) => {
    if (!deleteTarget) return
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'

    await supabase.from('obituaries').update({
      deleted_at:     new Date().toISOString(),
      deleted_by:     user?.id ?? null,
      delete_reason:  reason,
      delete_comment: comment || null,
      is_published:   false,
    }).eq('id', deleteTarget.id)

    await logActivity({
      category:     'log',
      event_type:   'obituary_deleted',
      entity_table: 'obituaries',
      entity_id:    deleteTarget.id,
      actor_id:     user?.id,
      actor_name:   actorName,
      message:      `${actorName} deleted obituary for ${deleteTarget.full_name} (Reason: ${reason})`,
      metadata:     { full_name: deleteTarget.full_name, reason, comment: comment || null },
    })

    if (selected?.id === deleteTarget.id) setSelected(null)
    setRows(r => r.filter(x => x.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const getPhotoUrl = (path: string) => {
    if (!path || path === 'obituaries/placeholder.png') return null
    return supabase.storage.from('obituaries').getPublicUrl(path).data.publicUrl
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Obituaries"
          sub={`${rows.length} active · ${rows.filter(r => r.is_published).length} published`}
        />
        {view === 'active' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Create Tarp
          </button>
        )}
      </div>

      {/* Sub-tab toggle */}
      <FilterPills<ObituaryView>
        options={[
          { value: 'active',  label: 'Active' },
          { value: 'deleted', label: 'Recently Deleted' },
        ]}
        active={view}
        onChange={v => { setView(v); setSelected(null) }}
      />

      {/* Create modal */}
      {showCreateModal && (
        <CreateTarpModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { fetchActive() }}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          obituary={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleSoftDelete}
        />
      )}

      {/* Approve & Publish 2-step modal */}
      {approveTarget && (
        <ApprovePublishModal
          obituary={approveTarget}
          onClose={() => setApproveTarget(null)}
          onConfirm={() => approveAndPublish(approveTarget.id)}
        />
      )}

      {/* ── Active view ── */}
      {view === 'active' && (
        <>
          {rows.length === 0 ? (
            <EmptyState message="No obituary records yet." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rows.map(o => {
                const parts  = o.full_name.trim().split(' ')
                const first  = parts[0] ?? ''
                const last   = parts.slice(-1)[0] ?? ''
                const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : ''
                return (
                  <div
                    key={o.id}
                    className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                      selected?.id === o.id ? 'border-primary shadow-md' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="p-3 bg-muted/20 border-b border-border">
                      <TarpPreview
                        firstName={first} middleName={middle} lastName={last}
                        birthDate={o.birth_date ?? ''} deathDate={o.death_date ?? ''}
                        age={o.age ?? ''} photoUrl={getPhotoUrl(o.image_path)}
                        venueAddress={o.venue_address ?? ''} contactNumber={o.contact_number ?? ''}
                        showDownload
                      />
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{o.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {o.submitter_name ?? ''}{o.submitter_email ? ` · ${o.submitter_email}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Badge label={o.is_published ? 'Published' : o.is_approved ? 'Approved' : 'Pending'} variant={o.is_published ? 'green' : o.is_approved ? 'blue' : 'amber'} />
                        <button
                          onClick={() => openEdit(o)}
                          className="h-7 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => o.is_published ? unpublish(o.id) : setApproveTarget(o)}
                          className={`h-7 px-3 rounded-lg text-[10px] font-bold border transition-all ${
                            o.is_published
                              ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500'
                              : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                          }`}
                        >
                          {o.is_published ? 'Unpublish' : 'Approve & Publish'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(o)}
                          className="h-7 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Edit panel */}
          {selected && (
            <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Edit Obituary — Live Preview</h3>
                <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'First Name',  value: editFirst,  set: setEditFirst,  placeholder: 'e.g. Juan' },
                      { label: 'Middle Name', value: editMiddle, set: setEditMiddle, placeholder: 'optional' },
                      { label: 'Last Name',   value: editLast,   set: setEditLast,   placeholder: 'e.g. Dela Cruz' },
                    ].map(f => (
                      <div key={f.label} className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                        <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className={inputCls} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Birth Date', value: editBirth, set: setEditBirth, type: 'date' },
                      { label: 'Death Date', value: editDeath, set: setEditDeath, type: 'date' },
                      { label: 'Age',        value: editAge,   set: setEditAge,   type: 'number' },
                    ].map(f => (
                      <div key={f.label} className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                        <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} className={inputCls} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venue / Address</label>
                    <input value={editVenue} onChange={e => setEditVenue(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Number</label>
                    <input value={editContact} onChange={e => setEditContact(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={saveEdit} disabled={saving} className="flex-1 h-10 font-bold rounded-xl">
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <button
                      onClick={() => selected.is_published ? unpublish(selected.id) : setApproveTarget(selected)}
                      className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-all ${
                        selected.is_published
                          ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500'
                          : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                      }`}
                    >
                      {selected.is_published ? 'Unpublish' : 'Approve & Publish'}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(selected)}
                      className="h-10 px-3 rounded-xl text-sm font-bold border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="px-6 py-5 bg-muted/10 flex flex-col gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Tarp Preview</p>
                  <TarpPreview
                    firstName={editFirst || 'FIRST'} middleName={editMiddle}
                    lastName={editLast || 'LAST'} birthDate={editBirth}
                    deathDate={editDeath} age={editAge}
                    photoUrl={getPhotoUrl(selected.image_path)}
                    venueAddress={editVenue} contactNumber={editContact}
                    showDownload
                  />
                  <p className="text-[10px] text-muted-foreground">Updates as you type. Save to persist changes.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Recently Deleted view ── */}
      {view === 'deleted' && <RecentlyDeletedPane />}
    </div>
  )
}
