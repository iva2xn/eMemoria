'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { UploadCloud, User, FileText, Info, ShieldCheck } from 'lucide-react'

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
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group mt-1">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={e => onChange(e.target.files?.[0] ?? null)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mx-auto mb-1.5 transition-colors" />
        <p className="text-xs font-semibold text-foreground truncate px-2">
          {value ? value.name : 'Click or drag to upload'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, PDF · max 10 MB</p>
      </div>
    </Field>
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

  // Auth pre-fill
  const [authReady,    setAuthReady]    = useState<boolean | null>(null)
  const [prefillName,  setPrefillName]  = useState('')
  const [prefillEmail, setPrefillEmail] = useState('')

  // Contact fields
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

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
        .from('profiles').select('name, email').eq('id', user.id).single()
      if (profile) { setPrefillName(profile.name ?? ''); setPrefillEmail(profile.email ?? '') }
      setAuthReady(true)
    })
  }, [supabase])

  useEffect(() => { if (prefillName)  setName(prefillName)  }, [prefillName])
  useEffect(() => { if (prefillEmail) setEmail(prefillEmail) }, [prefillEmail])

  // Upload a single document file to the 'document-submissions' bucket
  const uploadDoc = async (file: File, label: string): Promise<string> => {
    const ext  = file.name.split('.').pop()
    const path = `docs/${Date.now()}-${label}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('document-submissions')
      .upload(path, file, { upsert: false })
    if (uploadErr) throw new Error(`${label} upload failed: ${uploadErr.message}`)
    return path
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim())  { setError('Full name is required.'); return }
    if (!email.trim()) { setError('Email address is required.'); return }
    if (!phone.trim()) { setError('Contact number is required.'); return }
    if (!docDeath)     { setError('Death Certificate is required.'); return }
    if (!docBarangay)  { setError('Barangay Indigency is required.'); return }
    if (!docId)        { setError('Valid ID is required.'); return }

    setLoading(true)
    try {
      // Upload all documents in parallel
      const [deathPath, barangayPath, idPath, medicoPath] = await Promise.all([
        uploadDoc(docDeath,    'death-cert'),
        uploadDoc(docBarangay, 'barangay-indigency'),
        uploadDoc(docId,       'valid-id'),
        docMedico ? uploadDoc(docMedico, 'medico-legal') : Promise.resolve(null),
      ])

      const { data: { user } } = await supabase.auth.getUser()

      const { data: submission, error: insertErr } = await supabase
        .from('document_submissions')
        .insert({
          user_id:               user?.id ?? null,
          guest_name:            user ? null : name.trim(),
          guest_email:           user ? null : email.trim(),
          guest_phone:           user ? null : phone.trim(),
          product_type:          productType,
          product_ref:           productRef || null,
          product_label:         productLabel || null,
          product_price:         productPrice || null,
          doc_death_certificate: deathPath,
          doc_barangay_indigency: barangayPath,
          doc_valid_id:          idPath,
          doc_medico_legal:      medicoPath,
          status:                'pending_review',
        })
        .select('id')
        .single()

      if (insertErr) throw new Error(insertErr.message)

      // Redirect to status page
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
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-primary text-sm">{productLabel || productType}</p>
          {productPrice > 0 && (
            <p className="text-muted-foreground">
              Price: <span className="font-semibold text-foreground">
                ₱{productPrice.toLocaleString('en-PH')}
              </span>
            </p>
          )}
          <p className="text-muted-foreground pt-1">
            Please upload the required documents below. Our staff will review them within the day.
            You will receive an email notification once your submission is approved.
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
              <input type="tel" placeholder="+63 9XX XXX XXXX"
                value={phone} onChange={e => setPhone(e.target.value)} className={inp} />
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

      {/* Document Uploads */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Required Documents</h3>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <DocUpload
            label="Death Certificate" required
            hint="Official PSA or local civil registry copy"
            value={docDeath} onChange={setDocDeath}
          />
          <DocUpload
            label="Barangay Indigency" required
            hint="Issued by the barangay of the deceased"
            value={docBarangay} onChange={setDocBarangay}
          />
          <DocUpload
            label="Valid ID" required
            hint="Any government-issued ID of the next of kin"
            value={docId} onChange={setDocId}
          />
          <DocUpload
            label="Medico Legal Certificate"
            hint="Required only if death was non-natural (accident, etc.)"
            value={docMedico} onChange={setDocMedico}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl text-sm">
        {loading ? 'Submitting…' : 'Submit for Review'}
      </Button>

    </form>
  )
}
