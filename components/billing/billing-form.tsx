'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { ToastContainer, showToast } from '@/components/ui/toast-notification'
import { Button } from '@/components/ui/button'
import { ObituaryModal } from './obituary-modal'
import { WakeSchedulePreferenceModal } from './wake-schedule-preference-modal'
import { AuthGateModal } from './auth-gate-modal'
import { PaymentSidebar } from './payment-sidebar'
import {
  UploadCloud, Info, User, FileText, ShieldCheck,
  ChevronLeft, AlertTriangle, X, ZoomIn,
} from 'lucide-react'
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

// ── Reference number formatting ────────────────────────────────
// GCash:    XXXX XXX XXXXXX  (13 digits, spaces at pos 4 and 7)
// BDO Bank: AA-XXXXXXXX-XXXXXXXX  (2 letters, dash, 8 digits, dash, 8 digits)

function formatGcash(raw: string): string {
  // Keep only digits, max 13
  const digits = raw.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 4)  return digits
  if (digits.length <= 7)  return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

function formatBdo(raw: string): string {
  // Strip everything except letters+digits for parsing
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  // First 2 chars = letters only
  const letters = cleaned.slice(0, 2).replace(/[^A-Z]/g, '')
  // Next 16 chars = digits only
  const digits  = cleaned.slice(2).replace(/\D/g, '').slice(0, 16)

  if (!letters && !digits) return ''
  if (letters.length < 2 || digits.length === 0) return letters
  if (digits.length <= 8)  return `${letters}-${digits}`
  return `${letters}-${digits.slice(0, 8)}-${digits.slice(8)}`
}

// Strip formatting to get raw value for DB
function stripGcash(formatted: string): string { return formatted.replace(/\s/g, '') }
function stripBdo(formatted: string):   string { return formatted.replace(/-/g, '') }

function validateRefNum(method: MethodId, formatted: string): string {
  const raw = method === 'gcash' ? stripGcash(formatted) : stripBdo(formatted)
  if (method === 'cash') {
    if (formatted && !/^[A-Z0-9]+$/.test(formatted)) {
      return 'OR Number can only have capital letters and numbers (example: OR12345).'
    }
    return ''
  }
  if (method === 'gcash') {
    if (!raw) return 'GCash reference number is required.'
    if (raw.length !== 13) return `GCash reference number must be exactly 13 digits. You entered ${raw.length}.`
    return ''
  }
  if (method === 'bdo_bank') {
    if (!raw) return 'BDO reference number is required.'
    const letters = raw.slice(0, 2)
    const digits  = raw.slice(2)
    if (!/^[A-Z]{2}$/.test(letters)) return 'The first 2 characters of the BDO reference must be letters (example: BN).'
    if (!/^\d{16}$/.test(digits))    return `BDO reference must have exactly 16 digits after the letters. You entered ${digits.length}.`
    return ''
  }
  return ''
}

type PaymentInfo = {
  gcash_name: string; gcash_number: string; gcash_qr_path: string | null
  [key: string]: string | null
}

type BillingFormProps = {
  preProduct: string; preSlot: string; preLevel: string
  prePrice: number;   preLabel: string
  isColumbarium: boolean; isUrn: boolean; isPackage: boolean; isWakeExtension: boolean
  reservationFee: number; SERVICE_FEE: number
  authReady: boolean | null; returnUrl: string
  prefillName: string; prefillEmail: string; prefillPhone: string
  seniorPwdDiscount?: boolean
  documentSubmissionId?: string | null
  onSubmit: (fields: {
    name: string; email: string; phone: string
    method: string; refNum: string; amount: string
    notes: string; file: File | null; includeServiceFee: boolean
  }) => Promise<'obituary' | void>
}

// ── Review row ─────────────────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 text-xs border-b border-border/40 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

// ── Lightbox ───────────────────────────────────────────────────
function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/70 text-sm font-semibold">{label}</p>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <p className="text-center text-white/30 text-[10px] pb-3 shrink-0">Click outside the image to close</p>
    </div>,
    document.body
  )
}

// ── Large proof-of-payment preview card (review step) ─────────
function ProofPreviewCard({ file, label }: { file: File; label: string }) {
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
      {lightbox && objectUrl && <Lightbox url={objectUrl} label={label} onClose={() => setLightbox(false)} />}

      <div className="bg-muted/30 border border-border/60 rounded-xl overflow-hidden">
        {/* Large preview area */}
        <div className="relative bg-muted/20 aspect-[16/9]">
          {isImage && objectUrl ? (
            <button
              type="button"
              className="absolute inset-0 w-full h-full group"
              onClick={() => setLightbox(true)}
              title="Click to view full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={objectUrl} alt={label} className="w-full h-full object-contain bg-muted/10" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </button>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground truncate px-4">{file.name}</p>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-[10px] text-muted-foreground">{file.name}</p>
            {isImage && objectUrl && (
              <button
                onClick={() => setLightbox(true)}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                View full size
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Small file thumb (upload area) ────────────────────────────
function FileThumb({ file }: { file: File }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  if (isImage && objectUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={objectUrl} alt={file.name} className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" />
    )
  }
  return (
    <div className="h-10 w-10 rounded-lg border border-border bg-muted/30 flex items-center justify-center shrink-0">
      <FileText className="h-5 w-5 text-muted-foreground" />
    </div>
  )
}

export function BillingForm({
  preProduct, preSlot, preLevel, prePrice, preLabel,
  isColumbarium, isUrn, isPackage, isWakeExtension, reservationFee, SERVICE_FEE,
  authReady, returnUrl, prefillName, prefillEmail, prefillPhone,
  seniorPwdDiscount,
  documentSubmissionId,
  onSubmit,
}: BillingFormProps) {
  const supabase = createClient()

  const [includeServiceFee, setIncludeServiceFee] = useState(isUrn)

  const discountAmount  = seniorPwdDiscount && prePrice > 0 ? Math.round(prePrice * 0.2 * 100) / 100 : 0
  const discountedBase  = prePrice - discountAmount

  const defaultAmount = isColumbarium
    ? String(discountedBase)
    : isUrn ? String(discountedBase + (isUrn ? SERVICE_FEE : 0)) : discountedBase > 0 ? String(discountedBase) : ''

  const [step, setStep] = useState<1 | 2>(1)

  const [name,     setName]     = useState(prefillName)
  const [email,    setEmail]    = useState(prefillEmail)
  const [phone,    setPhone]    = useState(prefillPhone)
  const [method,   setMethod]   = useState<MethodId>('gcash')
  // Formatted ref nums (with spaces/dashes)
  const [refNum,   setRefNum]   = useState('')
  const [amount,   setAmount]   = useState(defaultAmount)

  // Per-method proof + notes — so switching methods keeps separate values
  const [proofByMethod,  setProofByMethod]  = useState<Partial<Record<MethodId, File | null>>>({})
  const [notesByMethod,  setNotesByMethod]  = useState<Partial<Record<MethodId, string>>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentFile  = proofByMethod[method]  ?? null
  const currentNotes = notesByMethod[method]  ?? ''

  const setCurrentFile  = (f: File | null) => setProofByMethod(p => ({ ...p, [method]: f }))
  const setCurrentNotes = (n: string)       => setNotesByMethod(p => ({ ...p, [method]: n }))

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showObituaryModal,    setShowObituaryModal]    = useState(false)
  const [showWakeModal,        setShowWakeModal]         = useState(false)
  const [obituaryDeceasedName, setObituaryDeceasedName] = useState('')
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)

  useEffect(() => { if (prefillName)  setName(prefillName)  }, [prefillName])
  useEffect(() => { if (prefillEmail) setEmail(prefillEmail) }, [prefillEmail])
  useEffect(() => { if (prefillPhone) setPhone(prefillPhone) }, [prefillPhone])

  const { clearDraft } = useDraftForm(
    `billing-draft-${preProduct}-${preSlot || 'noslot'}`,
    { name, email, phone, method, refNum, amount, notes: currentNotes },
    (saved) => {
      if (saved.name   && !prefillName)  setName(saved.name)
      if (saved.email  && !prefillEmail) setEmail(saved.email)
      if (saved.phone)  setPhone(saved.phone)
      if (saved.method && METHODS.find(m => m.id === saved.method)) setMethod(saved.method as MethodId)
      if (saved.refNum) setRefNum(saved.refNum)
    },
  )

  useEffect(() => {
    if (isUrn) setAmount(String(discountedBase + (includeServiceFee ? SERVICE_FEE : 0)))
  }, [includeServiceFee, isUrn, discountedBase, SERVICE_FEE])

  // Clear ref num when method changes
  useEffect(() => { setRefNum('') }, [method])

  useEffect(() => {
    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => setPaymentInfo(data ?? null))
  }, [supabase])

  // ── Reference number input handler ────────────────────────
  const handleRefInput = (raw: string) => {
    if (method === 'gcash')    setRefNum(formatGcash(raw))
    else if (method === 'bdo_bank') setRefNum(formatBdo(raw))
    else setRefNum(raw.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 50))
  }

  // ── File pick with instant toast feedback ─────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = '' // reset so same file can be re-selected

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const blockedImages = ['image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml']

    if (blockedImages.includes(f.type)) {
      showToast({
        variant: 'error',
        title: 'File type not accepted',
        message: `"${f.type.split('/')[1].toUpperCase()}" files can't be uploaded. Please use a JPEG, PNG, or PDF instead.`,
        duration: 6000,
      })
      return
    }
    if (!allowedTypes.includes(f.type) && !f.type.startsWith('image/')) {
      showToast({
        variant: 'error',
        title: 'Wrong file type',
        message: `Only photos (JPEG, PNG) and PDF files are accepted as proof of payment. Please try again.`,
        duration: 6000,
      })
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      const mb = (f.size / 1024 / 1024).toFixed(1)
      showToast({
        variant: 'error',
        title: 'File is too large',
        message: `Your file is ${mb} MB. The maximum allowed size is 10 MB. Please compress or resize it and try again.`,
        duration: 7000,
      })
      return
    }
    setCurrentFile(f)
  }

  // ── Step 1 validate ───────────────────────────────────────
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      showToast({ variant: 'error', title: 'Name is required', message: 'Please enter your full name before continuing.' })
      return
    }
    if (!email.trim()) {
      showToast({ variant: 'error', title: 'Email is required', message: 'Please enter your email address so we can confirm your payment.' })
      return
    }
    if (!phone.trim()) {
      showToast({ variant: 'error', title: 'Contact number is required', message: 'Please enter your phone number before continuing.' })
      return
    }

    const refErr = validateRefNum(method, refNum)
    if (refErr) {
      showToast({ variant: 'error', title: 'Check your reference number', message: refErr })
      return
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showToast({ variant: 'error', title: 'Invalid amount', message: 'The payment amount looks incorrect. Please reload the page and try again.' })
      return
    }
    if (!currentFile) {
      showToast({ variant: 'error', title: 'Proof of payment is required', message: 'Please upload a screenshot or photo of your payment receipt before proceeding.' })
      return
    }

    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Final submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      // Strip formatting from ref num before sending to DB
      const rawRef = method === 'gcash'
        ? stripGcash(refNum)
        : method === 'bdo_bank'
        ? stripBdo(refNum)
        : refNum

      const result = await onSubmit({
        name, email, phone, method,
        refNum:  rawRef,
        amount,
        notes:   currentNotes,
        file:    currentFile,
        includeServiceFee,
      })
      if (result === 'obituary') setShowObituaryModal(true)
      else {
        // Non-package payments → show wake preference modal too (if it's a traditional package)
        clearDraft()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
      showToast({
        variant: 'error',
        title: 'Submission failed',
        message: 'We couldn\'t process your payment right now. Please check your connection and try again.',
        duration: 7000,
      })
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const methodLabel = (m: MethodId) => METHODS.find(x => x.id === m)?.label ?? m

  // Raw ref number for display
  const rawRefDisplay = method === 'gcash' ? stripGcash(refNum) : method === 'bdo_bank' ? stripBdo(refNum) : refNum

  // ── Price breakdown helper ─────────────────────────────────
  function PriceBreakdown() {
    const rows: { label: string; value: string; highlight?: boolean; strike?: boolean }[] = []

    if (isColumbarium && prePrice > 0) {
      rows.push({ label: 'Slot price', value: `₱${prePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      if (seniorPwdDiscount && discountAmount > 0) {
        rows.push({ label: 'Senior/PWD discount (20%)', value: `− ₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      }
    } else if (isUrn) {
      rows.push({ label: 'Urn price', value: `₱${prePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      if (seniorPwdDiscount && discountAmount > 0) {
        rows.push({ label: 'Senior/PWD discount (20%)', value: `− ₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      }
      if (includeServiceFee) {
        rows.push({ label: 'Cremation service fee', value: `₱${SERVICE_FEE.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      }
    } else if (prePrice > 0) {
      rows.push({ label: preLabel || 'Service', value: `₱${prePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      if (seniorPwdDiscount && discountAmount > 0) {
        rows.push({ label: 'Senior/PWD discount (20%)', value: `− ₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` })
      }
    }

    if (rows.length === 0) return null

    const total = Number(amount)

    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/30 border-b border-border px-4 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Price Breakdown</p>
        </div>
        <div className="divide-y divide-border/40">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between px-4 py-2 text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className={`font-semibold ${r.label.includes('discount') ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-t border-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Total to Pay</span>
          <span className="text-sm font-bold text-primary">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    )
  }

  // ── STEP 2: Review ─────────────────────────────────────────
  if (step === 2) {
    return (
      <>
        <ToastContainer />
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
          <WakeSchedulePreferenceModal
            deceasedName={obituaryDeceasedName || 'Deceased'}
            documentSubmissionId={documentSubmissionId}
            onDone={() => { clearDraft(); window.location.href = '/?payment=success' }}
          />
        )}

        <section className="py-10 max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
            <div className="space-y-6">

              <button
                onClick={() => { setStep(1); setError('') }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Edit Payment Details
              </button>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary leading-relaxed font-medium">
                  Please review your payment details carefully before confirming.
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
                      value={
                        isColumbarium
                          ? `Columbarium Slot — ${preSlot || preLabel}`
                          : isWakeExtension
                          ? preLabel || 'Wake Date Extension'
                          : preLabel || preProduct
                      }
                    />
                  )}
                  <ReviewRow label="Payment Method" value={methodLabel(method)} />
                  {rawRefDisplay && (
                    <ReviewRow label="Reference Number" value={<span className="font-mono">{refNum}</span>} />
                  )}
                  {!rawRefDisplay && method === 'cash' && (
                    <ReviewRow label="Reference Number" value={<span className="text-muted-foreground italic">Not provided (Cash)</span>} />
                  )}
                  <ReviewRow
                    label="Amount"
                    value={
                      <span className="text-primary font-bold">
                        ₱{Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    }
                  />
                  {currentNotes && <ReviewRow label="Notes" value={currentNotes} />}
                </div>

                {/* Price breakdown */}
                {Number(amount) > 0 && (
                  <div className="px-4 py-4 border-t border-border/40 space-y-3">
                    <PriceBreakdown />
                  </div>
                )}

                {/* Large proof of payment preview */}
                {currentFile && (
                  <div className="border-t border-border/40 px-4 py-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proof of Payment</p>
                    <ProofPreviewCard file={currentFile} label="Proof of Payment" />
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

            <PaymentSidebar paymentInfo={paymentInfo} method={method} />
          </div>
        </section>
      </>
    )
  }

  // ── STEP 1: Form ──────────────────────────────────────────
  return (
    <>
      <ToastContainer />
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
        <WakeSchedulePreferenceModal
          deceasedName={obituaryDeceasedName || 'Deceased'}
          documentSubmissionId={documentSubmissionId}
          onDone={() => { clearDraft(); window.location.href = '/?payment=success' }}
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
                    {isColumbarium
                      ? 'Columbarium Slot Reservation'
                      : isWakeExtension
                      ? 'Wake Date Extension Payment'
                      : preLabel || preProduct}
                  </p>
                  {preSlot  && <p className="text-muted-foreground">Slot: <span className="font-mono font-bold text-foreground">{preSlot}</span></p>}
                  {preLevel && <p className="text-muted-foreground">Level: <span className="font-semibold text-foreground">{preLevel}</span></p>}
                  {isWakeExtension && preLabel && (
                    <p className="text-muted-foreground">Details: <span className="font-semibold text-foreground">{preLabel}</span></p>
                  )}
                  {/* Price breakdown in banner */}
                  {prePrice > 0 && (
                    <div className="pt-2 space-y-1 border-t border-primary/10 mt-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {isColumbarium ? 'Slot price' : isUrn ? 'Urn price' : 'Service price'}
                        </span>
                        <span className={`font-semibold ${seniorPwdDiscount && discountAmount > 0 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          ₱{prePrice.toLocaleString('en-PH')}
                        </span>
                      </div>
                      {seniorPwdDiscount && discountAmount > 0 && (
                        <>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Senior/PWD discount (20%)</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">− ₱{discountAmount.toLocaleString('en-PH')}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">After discount</span>
                            <span className="font-bold text-primary">₱{discountedBase.toLocaleString('en-PH')}</span>
                          </div>
                        </>
                      )}
                      {isUrn && includeServiceFee && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Cremation service fee</span>
                          <span className="font-semibold text-foreground">₱{SERVICE_FEE.toLocaleString('en-PH')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11px] font-bold border-t border-primary/10 pt-1 mt-1">
                        <span className="text-primary">Total to pay</span>
                        <span className="text-primary">₱{Number(amount || 0).toLocaleString('en-PH')}</span>
                      </div>
                    </div>
                  )}
                  {isUrn && (
                    <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                      <div
                        onClick={() => setIncludeServiceFee(v => !v)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${includeServiceFee ? 'bg-primary' : 'bg-border'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeServiceFee ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        Include ₱25,000 cremation service fee
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

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
                      <input type="text" placeholder="" value={name} onChange={e => setName(e.target.value)} className={inp} maxLength={100} />
                    </Field>
                    <Field label="Contact Number" required>
                      <PhoneInput value={phone} onChange={setPhone} className={inp} required />
                    </Field>
                  </div>
                  <Field label="Email Address" required>
                    <input type="email" placeholder="" value={email} onChange={e => setEmail(e.target.value)}
                      readOnly={authReady === true}
                      className={`${inp} ${authReady === true ? 'bg-muted/30 cursor-not-allowed text-muted-foreground' : ''}`} />
                  </Field>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Payment Details</h3>
                </div>
                <div className="px-6 py-5 space-y-5">

                  {/* Method selector */}
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
                    {/* Reference Number */}
                    <Field
                      label={method === 'cash' ? 'OR Number (optional)' : 'Reference Number'}
                      required={method !== 'cash'}
                      hint={
                        method === 'gcash'
                          ? 'Format: XXXX XXX XXXXXX · 13 digits only'
                          : method === 'bdo_bank'
                          ? 'Format: AA-XXXXXXXX-XXXXXXXX · 2 letters + 16 digits'
                          : 'Capital letters and numbers only (optional)'
                      }
                    >
                      <input
                        type="text"
                        placeholder={
                          method === 'gcash'    ? '1045 386 793862' :
                          method === 'bdo_bank' ? 'BN-20251001-57580325' :
                          'OR12345 (optional)'
                        }
                        value={refNum}
                        onChange={e => handleRefInput(e.target.value)}
                        className={inp}
                        inputMode={method === 'gcash' ? 'numeric' : 'text'}
                        required={method !== 'cash'}
                        autoComplete="off"
                      />
                      {/* Live digit counter for GCash */}
                      {method === 'gcash' && (
                        <p className={`text-[10px] mt-1 font-medium ${
                          stripGcash(refNum).length === 13
                            ? 'text-primary'
                            : stripGcash(refNum).length > 0
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/50'
                        }`}>
                          {stripGcash(refNum).length}/13 digits
                        </p>
                      )}
                      {/* BDO format feedback */}
                      {method === 'bdo_bank' && refNum.length > 0 && (() => {
                        const raw = stripBdo(refNum)
                        const lettersOk = /^[A-Z]{2}/.test(raw)
                        const digitsOk  = raw.length >= 2 && /^\d{16}$/.test(raw.slice(2))
                        return (
                          <p className={`text-[10px] mt-1 font-medium ${
                            lettersOk && digitsOk ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {lettersOk && digitsOk
                              ? '✓ Format looks correct'
                              : `2 letters + 16 digits · ${raw.slice(2).length}/16 digits entered`
                            }
                          </p>
                        )
                      })()}
                    </Field>

                    {/* Amount (read-only) */}
                    <Field label="Amount (₱)" required>
                      <input type="number" min="1"
                        value={amount}
                        readOnly
                        className={`${inp} bg-muted/30 cursor-not-allowed font-bold text-primary`} />
                    </Field>
                  </div>

                  {/* Proof of payment upload — per method */}
                  <Field label="Proof of Payment" required hint="Upload your receipt screenshot or photo (JPEG, PNG, PDF · max 10 MB)">
                    <div
                      className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-5 text-center transition-all bg-background cursor-pointer group mt-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFile}
                        className="hidden"
                      />
                      {currentFile ? (
                        <div className="flex items-center gap-3 justify-center">
                          <FileThumb file={currentFile} />
                          <div className="text-left min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">{currentFile.name}</p>
                            <p className="text-[10px] text-primary mt-0.5">Click to change</p>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setCurrentFile(null) }}
                            className="h-6 w-6 rounded-full bg-muted hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-auto shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
                          <p className="text-xs font-semibold text-foreground">Click or drag to upload receipt</p>
                          <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, PDF · max 10 MB</p>
                        </>
                      )}
                    </div>
                  </Field>

                  {/* Additional notes — per method */}
                  <Field label="Additional Notes (optional)">
                    <textarea
                      rows={3}
                      placeholder="Any special instructions or context…"
                      value={currentNotes}
                      onChange={e => setCurrentNotes(e.target.value)}
                      maxLength={500}
                      className="w-full p-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all resize-none placeholder:text-muted-foreground/50"
                    />
                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">{currentNotes.length}/500</p>
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
