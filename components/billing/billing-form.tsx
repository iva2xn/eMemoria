'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { ObituaryModal } from './obituary-modal'
import { WakeScheduleModal } from './wake-schedule-modal'
import { AuthGateModal } from './auth-gate-modal'
import { PaymentSidebar } from './payment-sidebar'
import { UploadCloud, Info, User, FileText, ShieldCheck, ChevronLeft, AlertTriangle, X } from 'lucide-react'
import { useDraftForm } from '@/lib/hooks/use-draft-form'
import { PhoneInput } from '@/components/ui/phone-input'

const METHODS = [
  { id: 'gcash',    label: 'GCash' },
  { id: 'bdo_bank', label: 'BDO Bank' },
  { id: 'cash',     label: 'Cash (Counter)' },
] as const
type MethodId = typeof METHODS[number]['id']

const inp = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-primary ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

// ── Reference number rules per method ─────────────────────────
// GCash:    numbers only (no spaces, no letters)
// BDO Bank: capital letters and numbers only
// Cash:     capital letters and numbers only, OPTIONAL
function validateRefNum(method: MethodId, value: string): string {
  if (method === 'cash') {
    // Optional — if provided, must be capital letters + numbers
    if (value && !/^[A-Z0-9]+$/.test(value)) {
      return 'OR Number must contain only capital letters and numbers (e.g. OR12345).'
    }
    return ''
  }
  if (method === 'gcash') {
    if (!value) return 'GCash reference number is required.'
    if (!/^\d+$/.test(value)) return 'GCash reference number must contain numbers only.'
    return ''
  }
  if (method === 'bdo_bank') {
    if (!value) return 'BDO reference number is required.'
    if (!/^[A-Z0-9]+$/.test(value)) return 'BDO reference number must contain capital letters and numbers only (e.g. TXN123ABC).'
    return ''
  }
  return ''
}

// Enforce input rules live while typing
function filterRefInput(method: MethodId, raw: string): string {
  if (method === 'gcash')    return raw.replace(/\D/g, '')                    // digits only
  if (method === 'bdo_bank') return raw.replace(/[^A-Z0-9]/g, '').toUpperCase() // caps + digits
  if (method === 'cash')     return raw.replace(/[^A-Z0-9]/g, '').toUpperCase() // caps + digits
  return raw
}

type PaymentInfo = {
  gcash_name: string; gcash_number: string; gcash_qr_path: string | null
  [key: string]: string | null
}

// Props passed down from billing/page.tsx — all logic lives there
type BillingFormProps = {
  preProduct: string; preSlot: string; preLevel: string
  prePrice: number;   preLabel: string
  isColumbarium: boolean; isUrn: boolean; isPackage: boolean
  reservationFee: number; SERVICE_FEE: number
  authReady: boolean | null; returnUrl: string
  prefillName: string; prefillEmail: string; prefillPhone: string
  onSubmit: (fields: {
    name: string; email: string; phone: string
    method: string; refNum: string; amount: string
    notes: string; file: File | null; includeServiceFee: boolean
  }) => Promise<'obituary' | void>
}

// ── Review row helper ─────────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 text-xs border-b border-border/40 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

// Shows a thumbnail for image files; icon+filename for PDFs.
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

export function BillingForm({
  preProduct, preSlot, preLevel, prePrice, preLabel,
  isColumbarium, isUrn, isPackage, reservationFee, SERVICE_FEE,
  authReady, returnUrl, prefillName, prefillEmail, prefillPhone,
  onSubmit,
}: BillingFormProps) {
  const supabase = createClient()

  const [includeServiceFee, setIncludeServiceFee] = useState(isUrn)
  const defaultAmount = isColumbarium
    ? String(prePrice)
    : isUrn ? String(prePrice + (isUrn ? SERVICE_FEE : 0)) : prePrice ? String(prePrice) : ''

  // ── Step: 1 = fill, 2 = review ───────────────────────────
  const [step, setStep] = useState<1 | 2>(1)

  // Local form state
  const [name,     setName]     = useState(prefillName)
  const [email,    setEmail]    = useState(prefillEmail)
  const [phone,    setPhone]    = useState(prefillPhone)
  const [method,   setMethod]   = useState<MethodId>('gcash')
  const [refNum,   setRefNum]   = useState('')
  const [amount,   setAmount]   = useState(defaultAmount)
  const [notes,    setNotes]    = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [refError, setRefError] = useState('')
  const [showObituaryModal,    setShowObituaryModal]    = useState(false)
  const [showWakeModal,        setShowWakeModal]         = useState(false)
  const [obituaryDeceasedName, setObituaryDeceasedName] = useState('')
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)

  // Sync prefill when auth resolves
  useEffect(() => { if (prefillName)  setName(prefillName)  }, [prefillName])
  useEffect(() => { if (prefillEmail) setEmail(prefillEmail) }, [prefillEmail])
  useEffect(() => { if (prefillPhone) setPhone(prefillPhone) }, [prefillPhone])

  // Draft persistence
  const { clearDraft } = useDraftForm(
    `billing-draft-${preProduct}-${preSlot || 'noslot'}`,
    { name, email, phone, method, refNum, amount, notes },
    (saved) => {
      if (saved.name   && !prefillName)  setName(saved.name)
      if (saved.email  && !prefillEmail) setEmail(saved.email)
      if (saved.phone)  setPhone(saved.phone)
      if (saved.method && METHODS.find(m => m.id === saved.method)) setMethod(saved.method as MethodId)
      if (saved.refNum) setRefNum(saved.refNum)
      if (saved.notes)  setNotes(saved.notes)
    },
  )

  // Keep amount in sync when urn service-fee toggle changes
  useEffect(() => {
    if (isUrn) setAmount(String(prePrice + (includeServiceFee ? SERVICE_FEE : 0)))
  }, [includeServiceFee, isUrn, prePrice, SERVICE_FEE])

  // Clear ref num when method changes (avoids mismatched format)
  useEffect(() => { setRefNum(''); setRefError('') }, [method])

  // Fetch payment info for the sidebar
  useEffect(() => {
    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => setPaymentInfo(data ?? null))
  }, [supabase])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`"${f.name}" exceeds the 10 MB limit. Please choose a smaller file.`)
        e.target.value = ''
        return
      }
      setFile(f); setFileName(f.name)
    }
  }

  // ── Step 1 validate → go to review ───────────────────────
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRefError('')

    if (!name.trim())  { setError('Full name is required.'); return }
    if (!email.trim()) { setError('Email address is required.'); return }
    if (!phone.trim()) { setError('Contact number is required.'); return }

    const refErr = validateRefNum(method, refNum)
    if (refErr) { setRefError(refErr); return }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid payment amount.'); return }
    if (!file) { setError('Payment proof is required. Please upload your receipt.'); return }

    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Final submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await onSubmit({ name, email, phone, method, refNum, amount, notes, file, includeServiceFee })
      if (result === 'obituary') setShowObituaryModal(true)
      else clearDraft()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const methodLabel = (m: MethodId) => METHODS.find(x => x.id === m)?.label ?? m

  // ── STEP 2: Review ────────────────────────────────────────
  if (step === 2) {
    return (
      <>
        {authReady === false && <AuthGateModal returnUrl={returnUrl} />}

        {showObituaryModal && (
          <ObituaryModal
            submitterName={name}
            submitterEmail={email}
            submitterPhone={phone}
            onDeceasedName={n => setObituaryDeceasedName(n)}
            onDone={() => { setShowObituaryModal(false); setShowWakeModal(true) }}
          />
        )}

        {showWakeModal && (
          <WakeScheduleModal
            deceasedName={obituaryDeceasedName || 'Deceased'}
            onDone={() => { window.location.href = '/?payment=success' }}
          />
        )}

        <section className="py-10 max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
            <div className="space-y-6">

              {/* Back */}
              <button
                onClick={() => { setStep(1); setError('') }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Edit Payment Details
              </button>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary leading-relaxed font-medium">
                  Please review your payment details carefully before confirming submission.
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
                  <ReviewRow label="Full Name"      value={name} />
                  <ReviewRow label="Email"          value={email} />
                  <ReviewRow label="Contact Number" value={phone} />
                </div>
              </div>

              {/* Payment review */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Payment Details</p>
                </div>
                <div className="divide-y divide-border/40">
                  {!!preProduct && (
                    <ReviewRow
                      label="Service"
                      value={isColumbarium ? `Columbarium Slot — ${preSlot || preLabel}` : preLabel || preProduct}
                    />
                  )}
                  <ReviewRow label="Payment Method"   value={methodLabel(method)} />
                  {refNum && (
                    <ReviewRow label="Reference Number" value={<span className="font-mono">{refNum}</span>} />
                  )}
                  {!refNum && method === 'cash' && (
                    <ReviewRow label="Reference Number" value={<span className="text-muted-foreground italic">Not provided (Cash)</span>} />
                  )}
                  <ReviewRow
                    label="Amount"
                    value={<span className="text-primary font-bold">₱{Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>}
                  />
                  {notes && <ReviewRow label="Notes" value={notes} />}
                </div>
                {/* Payment proof preview */}
                {file && (
                  <div className="border-t border-border/40">
                    <DocReviewRow label="Payment Proof" file={file} />
                  </div>
                )}
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
                  {loading ? 'Submitting…' : 'Confirm & Submit Payment'}
                </Button>
              </div>

            </div>

            {/* RIGHT: SIDEBAR */}
            <PaymentSidebar paymentInfo={paymentInfo} method={method} />
          </div>
        </section>
      </>
    )
  }

  // ── STEP 1: Form ──────────────────────────────────────────
  return (
    <>
      {authReady === false && <AuthGateModal returnUrl={returnUrl} />}

      {showObituaryModal && (
        <ObituaryModal
          submitterName={name}
          submitterEmail={email}
          submitterPhone={phone}
          onDeceasedName={n => setObituaryDeceasedName(n)}
          onDone={() => { setShowObituaryModal(false); setShowWakeModal(true) }}
        />
      )}

      {showWakeModal && (
        <WakeScheduleModal
          deceasedName={obituaryDeceasedName || 'Deceased'}
          onDone={() => { window.location.href = '/?payment=success' }}
        />
      )}

      <section className="py-10 max-w-5xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">

          {/* LEFT: FORM */}
          <div className="space-y-6">

            {/* Product summary banner */}
            {!!preProduct && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs w-full">
                  <p className="font-bold text-primary text-sm">
                    {isColumbarium ? 'Columbarium Slot Reservation' : preLabel || preProduct}
                  </p>
                  {preSlot  && <p className="text-muted-foreground">Slot: <span className="font-mono font-bold text-foreground">{preSlot}</span></p>}
                  {preLevel && <p className="text-muted-foreground">Level: <span className="font-semibold text-foreground">{preLevel}</span></p>}
                  {prePrice > 0 && (
                    <p className="text-muted-foreground">
                      {isColumbarium
                        ? <>Price: <span className="font-bold text-primary">₱{prePrice.toLocaleString('en-PH')}</span> (full price — online payment)</>
                        : <>Price: <span className="font-semibold text-foreground">₱{prePrice.toLocaleString('en-PH')}</span></>
                      }
                    </p>
                  )}
                  {isUrn && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <div
                        onClick={() => setIncludeServiceFee(v => !v)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${includeServiceFee ? 'bg-primary' : 'bg-border'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeServiceFee ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        Include ₱25,000 cremation service fee
                        {includeServiceFee
                          ? <span className="text-primary font-bold ml-1">— Total: ₱{(prePrice + SERVICE_FEE).toLocaleString('en-PH')}</span>
                          : <span className="text-muted-foreground ml-1">(urn only: ₱{prePrice.toLocaleString('en-PH')})</span>
                        }
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {error && <AlertBanner variant="error" message={error} />}

            <form onSubmit={handleReview} className="space-y-8">

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
                      <input type="text" placeholder="Juan Dela Cruz" value={name} onChange={e => setName(e.target.value)} className={inp} maxLength={100} />
                    </Field>
                    <Field label="Contact Number" required>
                      <PhoneInput value={phone} onChange={setPhone} className={inp} required />
                    </Field>
                  </div>
                  <Field label="Email Address" required>
                    <input type="email" placeholder="juan@example.com" value={email} onChange={e => setEmail(e.target.value)}
                      readOnly={authReady === true}
                      className={`${inp} ${authReady === true ? 'bg-muted/30 cursor-not-allowed text-muted-foreground' : ''}`} />
                  </Field>
                </div>
              </div>

              {/* Inline ref number error — shown just above Payment Details */}
              {refError && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/20 text-xs text-destructive font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {refError}
                </div>
              )}

              {/* Payment Details */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Payment Details</h3>
                </div>
                <div className="px-6 py-5 space-y-5">

                  <Field label="Payment Method" required>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {METHODS.map(m => (
                        <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            method === m.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                          }`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label={method === 'cash' ? 'OR Number (optional)' : 'Reference Number'}
                      required={method !== 'cash'}
                      hint={
                        method === 'gcash'
                          ? 'GCash: Numbers only (e.g. 1234567890123)'
                          : method === 'bdo_bank'
                          ? 'BDO: Capital letters and numbers only (e.g. TXN123ABC)'
                          : 'Cash: Capital letters and numbers only, optional (e.g. OR12345)'
                      }
                    >
                      <input
                        type="text"
                        placeholder={
                          method === 'gcash'    ? '1234567890123' :
                          method === 'bdo_bank' ? 'TXN123ABC' :
                          'OR12345 (optional)'
                        }
                        value={refNum}
                        onChange={e => setRefNum(filterRefInput(method, e.target.value))}
                        className={inp}
                        inputMode={method === 'gcash' ? 'numeric' : 'text'}
                        maxLength={method === 'gcash' ? 20 : 50}
                        required={method !== 'cash'}
                      />
                    </Field>
                    <Field label="Amount (₱)" required>
                      <input type="number" placeholder="e.g. 2500" min="1"
                        value={amount}
                        readOnly
                        className={`${inp} bg-muted/30 cursor-not-allowed font-bold text-primary`} />
                    </Field>
                  </div>

                  <Field label="Payment Proof (PNG / JPG / PDF)" required>
                    <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-5 text-center transition-all bg-background cursor-pointer group mt-1.5">
                      <input type="file" accept="image/*,application/pdf" onChange={handleFile}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
                      <p className="text-xs font-semibold text-foreground truncate px-4">
                        {fileName || 'Click or drag to upload receipt'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, PDF · max 10 MB</p>
                    </div>
                  </Field>

                  <Field label="Additional Notes (optional)">
                    <textarea rows={3} placeholder="Any special instructions or context…"
                      value={notes} onChange={e => setNotes(e.target.value)}
                      maxLength={500}
                      className="w-full p-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all resize-none placeholder:text-muted-foreground/50" />
                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">{notes.length}/500</p>
                  </Field>

                </div>
              </div>

              <Button type="submit" className="w-full h-12 font-bold rounded-xl text-sm">
                Review Payment →
              </Button>

            </form>
          </div>

          {/* RIGHT: SIDEBAR */}
          <PaymentSidebar paymentInfo={paymentInfo} method={method} />

        </div>
      </section>
    </>
  )
}
