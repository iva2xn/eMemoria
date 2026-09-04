'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { AuthGateModal } from '@/components/billing/auth-gate-modal'
import { UploadCloud, User, FileText, Info, ShieldCheck, Check, ChevronLeft, AlertTriangle, X } from 'lucide-react'
import { useDraftForm } from '@/lib/hooks/use-draft-form'
import { PhoneInput } from '@/components/ui/phone-input'
import { URNS } from '@/app/services/cremation/page'

const inp = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > 10 * 1024 * 1024) {
      alert(`"${f.name}" exceeds the 10 MB limit. Please choose a smaller file.`)
      e.target.value = ''
      onChange(null)
      return
    }
    onChange(f)
  }

  return (
    <Field label={label} required={required} hint={hint}>
      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group mt-1">
        <input type="file" accept="image/*,application/pdf" onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mx-auto mb-1.5 transition-colors" />
        <p className="text-xs font-semibold text-foreground truncate px-2">
          {value ? value.name : 'Click or drag to upload'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, PDF · max 10 MB</p>
      </div>
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
        {URNS.map(urn => (
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

function DocReviewRow({ label, file }: { label: string; file: File | null }) {
  if (!file) return null
  return (
    <div className="px-4 py-3 border-b border-border/40 last:border-0 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <FilePreviewThumb file={file} label={label} />
    </div>
  )
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
    ? URNS.find(u => u.name === urnChoice) ?? null
    : null
  const urnPrice      = selectedUrn?.price ?? 0
  const totalPrice    = productPrice + urnPrice

  // ── Step 1 validation → advance to review ────────────────
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim())  { setError('Full name is required.'); return }
    if (!email.trim()) { setError('Email address is required.'); return }
    if (!phone.trim()) { setError('Contact number is required.'); return }
    if (isCremation && urnChoice === null) { setError('Please select an urn option.'); return }
    if (!docDeath)     { setError('Death Certificate is required.'); return }
    if (!docBarangay)  { setError('Barangay Indigency is required.'); return }
    if (!docId)        { setError('Valid ID is required.'); return }
    if (isSeniorPwd && !docSeniorPwdProof) { setError('Senior/PWD proof is required when the discount is selected.'); return }

    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Final submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    if (!docDeath || !docBarangay || !docId) {
      setError('Please go back and upload all required documents.')
      setStep(1)
      return
    }

    setLoading(true)
    try {
      const uploads: Promise<string | null>[] = [
        uploadDoc(docDeath,    'death-cert'),
        uploadDoc(docBarangay, 'barangay-indigency'),
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
              label="Senior/PWD Discount"
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
          <div className="divide-y divide-border/40">
            <DocReviewRow label="Death Certificate"       file={docDeath} />
            <DocReviewRow label="Barangay Indigency"      file={docBarangay} />
            <DocReviewRow label="Valid ID"                file={docId} />
            <DocReviewRow label="Medico Legal"            file={docMedico} />
            {isSeniorPwd && <DocReviewRow label="Senior/PWD Proof" file={docSeniorPwdProof} />}
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

      {/* Auth gate — show modal if not logged in */}
      {authReady === false && <AuthGateModal returnUrl={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/document-submission'} />}

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
              <input type="text" placeholder="Juan Dela Cruz"
                value={name} onChange={e => setName(e.target.value)} className={inp} />
            </Field>
            <Field label="Contact Number" required>
              <PhoneInput value={phone} onChange={setPhone} className={inp} required />
            </Field>
          </div>
          <Field label="Email Address" required hint="Approval/rejection notification will be sent here.">
            <input type="email" placeholder="juan@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              readOnly={authReady === true}
              className={`${inp} ${authReady === true ? 'bg-muted/30 cursor-not-allowed text-muted-foreground' : ''}`} />
          </Field>

          {/* Senior/PWD discount */}
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
                <p className="text-sm font-bold text-foreground">Senior Citizen / PWD Discount</p>
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
          <DocUpload label="Barangay Indigency" required
            hint="Issued by the barangay of the deceased"
            value={docBarangay} onChange={setDocBarangay} />
          <DocUpload label="Valid ID of the Next of Kin" required
            hint="Any government-issued ID of the next of kin"
            value={docId} onChange={setDocId} />
          <DocUpload label="Medico Legal Certificate"
            hint="Required only if death was non-natural (accident, etc.)"
            value={docMedico} onChange={setDocMedico} />
        </div>
      </div>

      <Button type="submit" className="w-full h-12 font-bold rounded-xl text-sm">
        Review Submission →
      </Button>

    </form>
  )
}
