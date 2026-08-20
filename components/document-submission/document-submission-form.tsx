'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { UploadCloud, User, FileText, Info, ShieldCheck, Check } from 'lucide-react'
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

  // Auth pre-fill
  const [authReady,    setAuthReady]    = useState<boolean | null>(null)
  const [prefillName,  setPrefillName]  = useState('')
  const [prefillEmail, setPrefillEmail] = useState('')

  // Contact fields
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Urn selection — only relevant for cremation
  // null = not chosen yet, OWN_URN = own urn, or urn name
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim())  { setError('Full name is required.'); return }
    if (!email.trim()) { setError('Email address is required.'); return }
    if (!phone.trim()) { setError('Contact number is required.'); return }
    if (isCremation && urnChoice === null) { setError('Please select an urn option.'); return }
    if (!docDeath)     { setError('Death Certificate is required.'); return }
    if (!docBarangay)  { setError('Barangay Indigency is required.'); return }
    if (!docId)        { setError('Valid ID is required.'); return }

    setLoading(true)
    try {
      const [deathPath, barangayPath, idPath, medicoPath] = await Promise.all([
        uploadDoc(docDeath,    'death-cert'),
        uploadDoc(docBarangay, 'barangay-indigency'),
        uploadDoc(docId,       'valid-id'),
        docMedico ? uploadDoc(docMedico, 'medico-legal') : Promise.resolve(null),
      ])

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
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

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

      <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl text-sm">
        {loading ? 'Submitting…' : 'Submit for Review'}
      </Button>

    </form>
  )
}
