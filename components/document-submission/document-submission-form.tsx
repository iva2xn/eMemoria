'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { AuthGateModal } from '@/components/billing/auth-gate-modal'
import { UploadCloud, User, FileText, Info, ShieldCheck, Check, ChevronLeft, AlertTriangle, X, MapPin, Loader2 } from 'lucide-react'
import { useDraftForm } from '@/lib/hooks/use-draft-form'
import { ToastContainer, showToast } from '@/components/ui/toast-notification'
import { PhoneInput } from '@/components/ui/phone-input'
import { FALLBACK_URNS } from '@/lib/service-constants'

const inp = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

const SUFFIXES = ['No Suffix', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'Esq.', 'PhD', 'MD', 'RN']

// ── Step progress bar ─────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ['Fill in Details', 'Review & Submit']
  return (
    <div className="flex items-center gap-0 mb-2">
      {steps.map((label, i) => {
        const n       = i + 1
        const done    = step > n
        const active  = step === n
        const last    = i === steps.length - 1
        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done   ? 'bg-primary border-primary text-primary-foreground' :
                active ? 'bg-primary/10 border-primary text-primary' :
                         'bg-muted border-border text-muted-foreground'
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {!last && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className={lbl}>
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function DocUpload({
  label, required, hint, value, onChange,
}: {
  label: string; required?: boolean; hint?: string
  value: File | null; onChange: (f: File | null) => void
}) {
  const [fileError, setFileError] = useState<string | null>(null)

  // Clear inline error if parent clears the value (e.g. form reset)
  useEffect(() => {
    if (!value) setFileError(null)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFileError(null)

    if (!f) { onChange(null); return }

    // Validate file type
    const blockedImages = ['image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/ico', 'image/vnd.microsoft.icon']
    if (blockedImages.includes(f.type)) {
      const msg = `This type of image (${f.type.split('/')[1].toUpperCase()}) isn't accepted. Please upload a JPEG, PNG, or WebP photo instead.`
      setFileError(msg)
      showToast({ variant: 'error', title: 'File type not accepted', message: msg, duration: 6000 })
      e.target.value = ''
      onChange(null)
      return
    }
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      const msg = `Only photos (JPEG, PNG, WebP) and PDF files are accepted. Please try a different file.`
      setFileError(msg)
      showToast({ variant: 'error', title: 'Wrong file type', message: msg, duration: 6000 })
      e.target.value = ''
      onChange(null)
      return
    }

    // Validate file size (10 MB)
    if (f.size > 10 * 1024 * 1024) {
      const mb  = (f.size / 1024 / 1024).toFixed(1)
      const msg = `"${f.name}" is ${mb} MB. The maximum allowed size is 10 MB. Please compress or resize the file and try again.`
      setFileError(msg)
      showToast({ variant: 'error', title: 'File is too large', message: msg, duration: 7000 })
      e.target.value = ''
      onChange(null)
      return
    }

    onChange(f)
  }

  return (
    <Field label={label} required={required} hint={hint}>
      <div className={`relative border border-dashed rounded-xl p-4 text-center transition-all bg-background cursor-pointer group mt-1 ${
        fileError
          ? 'border-destructive bg-destructive/5 hover:border-destructive/80'
          : 'border-border hover:border-primary/50'
      }`}>
        <input type="file" accept="image/*,application/pdf" onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        <UploadCloud className={`h-5 w-5 mx-auto mb-1.5 transition-colors ${fileError ? 'text-destructive' : 'text-muted-foreground group-hover:text-primary'}`} />
        <p className={`text-xs font-semibold truncate px-2 ${fileError ? 'text-destructive' : 'text-foreground'}`}>
          {value ? value.name : 'Click or drag to upload'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, PDF · max 10 MB</p>
      </div>
      {/* Inline error — shown immediately on bad file selection */}
      {fileError && (
        <div className="mt-2 flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive font-semibold leading-snug">{fileError}</p>
        </div>
      )}
    </Field>
  )
}

// ── Urn picker ────────────────────────────────────────────────
const OWN_URN = '__own__'

function UrnPicker({ value, onChange }: {
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      {/* Own urn option */}
      <button
        type="button"
        onClick={() => onChange(OWN_URN)}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
          value === OWN_URN
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 bg-card'
        }`}
      >
        <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
          value === OWN_URN ? 'border-primary bg-primary' : 'border-border'
        }`}>
          {value === OWN_URN && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Use my own urn</p>
          <p className="text-xs text-muted-foreground">No additional urn fee — bring your own.</p>
        </div>
      </button>

      {/* Available urns grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FALLBACK_URNS.map(urn => (
          <button
            key={urn.name}
            type="button"
            onClick={() => onChange(urn.name)}
            className={`flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all ${
              value === urn.name
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 bg-card'
            }`}
          >
            <div className="relative w-full aspect-square bg-muted/30">
              <Image src={urn.image} alt={urn.name} fill className="object-contain p-3" />
              {value === urn.name && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="px-3 pb-3 pt-2">
              <p className="text-xs font-bold text-foreground leading-tight">{urn.name}</p>
              <p className="text-xs font-semibold text-primary mt-0.5">
                +₱{urn.price.toLocaleString('en-PH')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Review Step helpers ───────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 text-xs border-b border-border/40 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

// Shows a thumbnail for image files; filename only for PDFs.
// Clicking the thumbnail opens a full-screen lightbox.
function FilePreviewThumb({ file, label }: { file: File; label: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [lightbox,  setLightbox]  = useState(false)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  return (
    <>
      <div className="flex items-center gap-3">
        {isImage && objectUrl ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="shrink-0 h-12 w-12 rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            title="Click to view full size"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={objectUrl} alt={label} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="shrink-0 h-12 w-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
          {isImage && (
            <p className="text-[10px] text-primary mt-0.5 cursor-pointer hover:underline" onClick={() => setLightbox(true)}>
              Click thumbnail to preview
            </p>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && objectUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-semibold flex items-center gap-1"
            >
              <X className="h-4 w-4" /> Close
            </button>
            <p className="text-white/60 text-[11px] mb-2 font-medium">{label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrl}
              alt={label}
              className="w-full rounded-xl shadow-2xl max-h-[80vh] object-contain bg-black"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Shows a large card preview for the review step (bigger than the small thumb)
function DocReviewCard({ file, label }: { file: File; label: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [lightbox,  setLightbox]  = useState(false)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  return (
    <>
      {lightbox && objectUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[300] flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
            <p className="text-white/70 text-sm font-semibold">{label}</p>
            <button onClick={() => setLightbox(false)} className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={() => setLightbox(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={objectUrl} alt={label} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
          </div>
          <p className="text-center text-white/30 text-[10px] pb-3 shrink-0">Click outside to close</p>
        </div>,
        document.body
      )}

      <div className="bg-muted/30 border border-border/60 rounded-xl overflow-hidden">
        <div className="relative bg-muted/20 aspect-[4/3]">
          {isImage && objectUrl ? (
            <button
              type="button"
              className="absolute inset-0 w-full h-full group"
              onClick={() => setLightbox(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={objectUrl} alt={label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <X className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground font-medium truncate px-4">{file.name}</p>
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          {isImage && objectUrl && (
            <button type="button" onClick={() => setLightbox(true)} className="text-[10px] font-semibold text-primary hover:underline shrink-0">View</button>
          )}
        </div>
      </div>
    </>
  )
}

function DocReviewRow({ label, file }: { label: string; file: File | null }) {
  if (!file) return null
  return <DocReviewCard file={file} label={label} />
}

type DocumentSubmissionFormProps = {
  productType:  string
  productRef:   string
  productLabel: string
  productPrice: number
}

export function DocumentSubmissionForm({ productType, productRef, productLabel, productPrice }: DocumentSubmissionFormProps) {
  const supabase = createClient()
  const router   = useRouter()

  const isCremation = productType === 'cremation'

  // ── Step state: 1 = fill, 2 = review ─────────────────────
  const [step, setStep] = useState<1 | 2>(1)

  // Auth pre-fill
  const [authReady,    setAuthReady]    = useState<boolean | null>(null)
  const [prefillName,  setPrefillName]  = useState('')
  const [prefillEmail, setPrefillEmail] = useState('')

  // Contact fields
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Deceased information
  const [deceasedFirstName,     setDeceasedFirstName]     = useState('')
  const [deceasedMiddleInitial, setDeceasedMiddleInitial] = useState('')
  const [deceasedLastName,      setDeceasedLastName]      = useState('')
  const [deceasedSuffix,        setDeceasedSuffix]        = useState('No Suffix')
  const [placeOfDeath,          setPlaceOfDeath]          = useState('')
  const [gpsLoading,            setGpsLoading]            = useState(false)
  const [gpsError,              setGpsError]              = useState('')

  // Senior/PWD
  const [isSeniorPwd,       setIsSeniorPwd]       = useState(false)
  const [docSeniorPwdProof, setDocSeniorPwdProof] = useState<File | null>(null)

  // Urn selection — only relevant for cremation
  const [urnChoice, setUrnChoice] = useState<string | null>(null)

  // Document files
  const [docDeath,    setDocDeath]    = useState<File | null>(null)
  const [docBarangay, setDocBarangay] = useState<File | null>(null)
  const [docId,       setDocId]       = useState<File | null>(null)
  const [docMedico,   setDocMedico]   = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthReady(false); return }
      const { data: profile } = await supabase
        .from('profiles').select('name, email, phone').eq('id', user.id).single()
      if (profile) {
        setPrefillName(profile.name ?? '')
        setPrefillEmail(profile.email ?? '')
        if (profile.phone) setPhone(profile.phone)
      }
      setAuthReady(true)
    })
  }, [supabase])

  useEffect(() => { if (prefillName)  setName(prefillName)  }, [prefillName])
  useEffect(() => { if (prefillEmail) setEmail(prefillEmail) }, [prefillEmail])

  const { clearDraft } = useDraftForm(
    `doc-submission-draft-${productRef || productType}`,
    { name, email, phone },
    (saved) => {
      if (saved.name  && !prefillName)  setName(saved.name)
      if (saved.email && !prefillEmail) setEmail(saved.email)
      if (saved.phone) setPhone(saved.phone)
    },
  )

  const uploadDoc = async (file: File, label: string): Promise<string> => {
    const ext  = file.name.split('.').pop()
    const path = `docs/${Date.now()}-${label}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('document-submissions')
      .upload(path, file, { upsert: false })
    if (uploadErr) throw new Error(`${label} upload failed: ${uploadErr.message}`)
    return path
  }

  // Derived urn price
  const selectedUrn   = isCremation && urnChoice && urnChoice !== OWN_URN
    ? FALLBACK_URNS.find(u => u.name === urnChoice) ?? null
    : null
  const urnPrice      = selectedUrn?.price ?? 0
  const totalPrice    = productPrice + urnPrice

  // ── GPS locate ───────────────────────────────────────────────
  const handleLocate = () => {
    if (!navigator.geolocation) { setGpsError('Location not supported on this device.'); return }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          const addr = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          setPlaceOfDeath(addr)
        } catch {
          setPlaceOfDeath(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        } finally {
          setGpsLoading(false)
        }
      },
      () => { setGpsError('Could not get your location. Please type it manually.'); setGpsLoading(false) },
      { timeout: 10000 }
    )
  }

  // ── Step 1 validation → advance to review ────────────────
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      showToast({ variant: 'error', title: 'Name is required', message: 'Please enter your full name before continuing.' }); return
    }
    if (!email.trim()) {
      showToast({ variant: 'error', title: 'Email is required', message: 'Please enter your email address so we can send you updates.' }); return
    }
    if (!phone.trim()) {
      showToast({ variant: 'error', title: 'Contact number is required', message: 'Please enter your phone number before continuing.' }); return
    }
    if (!deceasedFirstName.trim()) {
      showToast({ variant: 'error', title: "Deceased's first name is required", message: "Please enter the first name of the deceased person." }); return
    }
    if (!deceasedLastName.trim()) {
      showToast({ variant: 'error', title: "Deceased's last name is required", message: "Please enter the last name of the deceased person." }); return
    }
    if (!placeOfDeath.trim()) {
      showToast({ variant: 'error', title: 'Place of death is required', message: 'Please enter or locate the place where the deceased passed away.' }); return
    }
    if (isCremation && urnChoice === null) {
      showToast({ variant: 'error', title: 'Please choose an urn', message: 'Select an urn option before proceeding. You can also choose to bring your own.' }); return
    }
    if (!docDeath) {
      showToast({ variant: 'error', title: 'Death Certificate is required', message: 'Please upload a copy of the Death Certificate before continuing.' }); return
    }
    if (!docId) {
      showToast({ variant: 'error', title: 'Valid ID is required', message: 'Please upload a valid government-issued ID of the closest relative or family member.' }); return
    }
    if (isSeniorPwd && !docSeniorPwdProof) {
      showToast({ variant: 'error', title: 'Senior/PWD proof is required', message: 'You checked the Senior/PWD option — please upload the required ID or proof document.' }); return
    }

    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Final submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    if (!docDeath || !docId) {
      setError('Please go back and upload all required documents.')
      setStep(1)
      return
    }

    setLoading(true)
    try {
      const uploads: Promise<string | null>[] = [
        uploadDoc(docDeath,    'death-cert'),
        docBarangay ? uploadDoc(docBarangay, 'barangay-indigency') : Promise.resolve(null),
        uploadDoc(docId,       'valid-id'),
        docMedico        ? uploadDoc(docMedico,        'medico-legal')   : Promise.resolve(null),
        docSeniorPwdProof ? uploadDoc(docSeniorPwdProof, 'senior-pwd-proof') : Promise.resolve(null),
      ]
      const [deathPath, barangayPath, idPath, medicoPath, seniorPwdProofPath] = await Promise.all(uploads)

      const { data: { user } } = await supabase.auth.getUser()

      // Build ref + label with urn info baked in
      const urnLabel = urnChoice === OWN_URN
        ? 'Own urn'
        : urnChoice ?? ''
      const finalRef = isCremation
        ? [productRef, urnLabel].filter(Boolean).join(' · ') || null
        : productRef || null
      const finalLabel = isCremation && urnChoice
        ? `${productLabel}${urnChoice === OWN_URN ? ' (Own urn)' : ` + ${urnChoice}`}`
        : productLabel || null
      const finalPrice = isCremation ? totalPrice : productPrice

      const { data: submission, error: insertErr } = await supabase
        .from('document_submissions')
        .insert({
          user_id:                user?.id ?? null,
          guest_name:             user ? null : name.trim(),
          guest_email:            user ? null : email.trim(),
          guest_phone:            user ? null : phone.trim(),
          product_type:           productType,
          product_ref:            finalRef,
          product_label:          finalLabel,
          product_price:          finalPrice || null,
          doc_death_certificate:  deathPath,
          doc_barangay_indigency: barangayPath,
          doc_valid_id:           idPath,
          doc_medico_legal:       medicoPath,
          doc_senior_pwd_proof:   seniorPwdProofPath,
          senior_pwd_discount:    isSeniorPwd,
          status:                 'pending_review',
          deceased_first_name:    deceasedFirstName.trim()     || null,
          deceased_middle_initial: deceasedMiddleInitial.trim() || null,
          deceased_last_name:     deceasedLastName.trim()      || null,
          deceased_suffix:        deceasedSuffix === 'No Suffix' ? null : deceasedSuffix,
          place_of_death:         placeOfDeath.trim()          || null,
        })
        .select('id')
        .single()

      if (insertErr) throw new Error(insertErr.message)

      if (user && phone.trim()) {
        await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id)
      }

      clearDraft()
      router.push(`/document-submission/status?id=${submission.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2: Review ────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="space-y-6">
        <ToastContainer />
        {/* Step indicator */}
        <StepIndicator step={2} />

        {/* Back button */}
        <button
          onClick={() => { setStep(1); setError('') }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Edit Details
        </button>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-primary leading-relaxed font-medium">
            Please review your submission carefully. Once submitted, you cannot edit these details.
          </p>
        </div>

        {error && <AlertBanner variant="error" message={error} />}

        {/* Contact review */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Contact Information</p>
          </div>
          <div className="divide-y divide-border/40">
            <ReviewRow label="Full Name"       value={name} />
            <ReviewRow label="Email"           value={email} />
            <ReviewRow label="Contact Number"  value={phone} />
          </div>
        </div>

        {/* Deceased info review */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Deceased Information</p>
          </div>
          <div className="divide-y divide-border/40">
            <ReviewRow label="Full Name" value={[deceasedFirstName, deceasedMiddleInitial, deceasedLastName, deceasedSuffix !== 'No Suffix' ? deceasedSuffix : ''].filter(Boolean).join(' ')} />
            <ReviewRow label="Place of Death" value={placeOfDeath} />
          </div>
        </div>

        {/* Package / pricing review */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Package Details</p>
          </div>
          <div className="divide-y divide-border/40">
            <ReviewRow label="Service" value={productLabel || productType} />
            {isCremation && urnChoice && (
              <ReviewRow
                label="Urn"
                value={urnChoice === OWN_URN ? 'Own urn (no fee)' : `${urnChoice} (+₱${urnPrice.toLocaleString('en-PH')})`}
              />
            )}
            {totalPrice > 0 && (
              <ReviewRow
                label="Total"
                value={<span className="text-primary font-bold">₱{totalPrice.toLocaleString('en-PH')}</span>}
              />
            )}
            <ReviewRow
              label="Senior/PWD"
              value={isSeniorPwd ? <span className="text-primary font-bold">Yes — proof attached</span> : 'No'}
            />
          </div>
        </div>

        {/* Documents review */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Uploaded Documents</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <DocReviewRow label="Death Certificate"                                file={docDeath} />
            <DocReviewRow label="Valid ID — Closest Relative"                      file={docId} />
            <DocReviewRow label="Barangay Indigency"                               file={docBarangay} />
            <DocReviewRow label="Medico Legal Certificate"                         file={docMedico} />
            {isSeniorPwd && <DocReviewRow label="Senior/PWD Proof"                 file={docSeniorPwdProof} />}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-xl font-semibold"
            onClick={() => { setStep(1); setError('') }}
          >
            ← Edit
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="flex-1 h-12 font-bold rounded-xl text-sm"
            onClick={handleSubmit}
          >
            {loading ? 'Submitting…' : 'Confirm & Submit'}
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP 1: Form ──────────────────────────────────────────
  return (
    <form onSubmit={handleReview} className="space-y-6">
      <ToastContainer />

      {/* Auth gate — show modal if not logged in */}
      {authReady === false && <AuthGateModal returnUrl={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/document-submission'} />}

      {/* Step indicator */}
      <StepIndicator step={1} />

      {/* Package summary */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5 w-full">
          <p className="font-bold text-primary text-sm">{productLabel || productType}</p>
          {productPrice > 0 && (
            <p className="text-muted-foreground">
              Reservation fee:{' '}
              <span className="font-semibold text-foreground">₱{productPrice.toLocaleString('en-PH')}</span>
            </p>
          )}
          {isCremation && urnChoice && urnChoice !== OWN_URN && selectedUrn && (
            <p className="text-muted-foreground">
              Urn ({urnChoice}):{' '}
              <span className="font-semibold text-foreground">+₱{urnPrice.toLocaleString('en-PH')}</span>
            </p>
          )}
          {isCremation && urnChoice && (
            <p className="font-bold text-primary pt-0.5">
              Total: ₱{totalPrice.toLocaleString('en-PH')}
            </p>
          )}
          <p className="text-muted-foreground pt-1">
            Upload the required documents below. Staff will review within the day and email you once approved.
          </p>
        </div>
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {/* Contact Info */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
          </div>
          {authReady === true && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" /> Pre-filled from your account
            </span>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input type="text" placeholder=""
                value={name} onChange={e => setName(e.target.value)} className={inp} />
            </Field>
            <Field label="Contact Number" required>
              <PhoneInput value={phone} onChange={setPhone} className={inp} required />
            </Field>
          </div>
          <Field label="Email Address" required hint="Approval/rejection notification will be sent here.">
            <input type="email" placeholder=""
              value={email} onChange={e => setEmail(e.target.value)}
              readOnly={authReady === true}
              className={`${inp} ${authReady === true ? 'bg-muted/30 cursor-not-allowed text-muted-foreground' : ''}`} />
          </Field>

        </div>
      </div>

      {/* Deceased Information */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Deceased Information</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                First Name <span className="text-primary">*</span>
              </label>
              <input type="text" value={deceasedFirstName}
                onChange={e => setDeceasedFirstName(e.target.value)}
                className={inp} maxLength={50} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Middle Initial</label>
              <input type="text" value={deceasedMiddleInitial}
                onChange={e => setDeceasedMiddleInitial(e.target.value)}
                className={inp} maxLength={10} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                Last Name <span className="text-primary">*</span>
              </label>
              <input type="text" value={deceasedLastName}
                onChange={e => setDeceasedLastName(e.target.value)}
                className={inp} maxLength={50} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Suffix</label>
              <div className="relative">
                <select
                  value={deceasedSuffix}
                  onChange={e => setDeceasedSuffix(e.target.value)}
                  className={`${inp} appearance-none pr-8 cursor-pointer`}
                >
                  {SUFFIXES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
              </div>
            </div>
          </div>

          {/* Place of Death */}
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
              Place of Death <span className="text-primary">*</span>
            </label>
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
            {gpsError && (
              <p className="text-[11px] text-destructive mt-1 font-medium">{gpsError}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Used for wake schedule planning.</p>
          </div>
        </div>
      </div>

      {/* Urn Selection — cremation only */}
      {isCremation && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Urn Selection <span className="text-primary text-xs">*</span></h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Choose an urn or indicate you&apos;ll bring your own. Urn price is added to the ₱25,000 reservation.
              </p>
            </div>
          </div>
          <div className="px-6 py-5">
            <UrnPicker value={urnChoice} onChange={setUrnChoice} />
          </div>
        </div>
      )}

      {/* Document Uploads */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Required Documents</h3>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <p className="text-[11px] text-muted-foreground bg-muted/50 border border-border rounded-xl px-3 py-2">
              Files cannot be saved between sessions — please re-upload your documents.
            </p>
          </div>
          <DocUpload label="Death Certificate" required
            hint="Official PSA or local civil registry copy"
            value={docDeath} onChange={setDocDeath} />
          <DocUpload label="Valid ID of the Closest Relative / Family Member" required
            hint="Any government-issued ID of the closest relative or family member"
            value={docId} onChange={setDocId} />
          <DocUpload label="Barangay Indigency"
            hint="Issued by the barangay of the deceased (optional)"
            value={docBarangay} onChange={setDocBarangay} />
          <DocUpload label="Medico Legal Certificate"
            hint="Required only if death was non-natural (accident, etc.)"
            value={docMedico} onChange={setDocMedico} />
        </div>
      </div>

      {/* Senior Citizen / PWD Eligibility */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <div className="mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={isSeniorPwd}
              onChange={e => { setIsSeniorPwd(e.target.checked); if (!e.target.checked) setDocSeniorPwdProof(null) }}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Senior Citizen / PWD</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Check this if the deceased or the next of kin is a Senior Citizen or Person with Disability (PWD). A valid proof document is required.
            </p>
          </div>
        </label>

        {isSeniorPwd && (
          <DocUpload
            label="Senior / PWD Proof"
            required
            hint="Upload a Senior Citizen ID, PWD ID, or equivalent government-issued document"
            value={docSeniorPwdProof}
            onChange={setDocSeniorPwdProof}
          />
        )}
      </div>

      <Button type="submit" className="w-full h-12 font-bold rounded-xl text-sm">
        Review Submission →
      </Button>

    </form>
  )
}
