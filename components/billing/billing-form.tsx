'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { ObituaryModal } from './obituary-modal'
import { AuthGateModal } from './auth-gate-modal'
import { PaymentSidebar } from './payment-sidebar'
import { UploadCloud, Info, User, FileText, ShieldCheck } from 'lucide-react'

const METHODS = [
  { id: 'gcash',    label: 'GCash' },
  { id: 'bdo_bank', label: 'BDO Bank' },
  { id: 'bpi_bank', label: 'BPI Bank' },
  { id: 'cash',     label: 'Cash (Counter)' },
] as const
type MethodId = typeof METHODS[number]['id']

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

type PaymentInfo = {
  gcash_name: string; gcash_number: string; gcash_qr_path: string | null
  [key: string]: string | null
}

export function BillingForm() {
  const params   = useSearchParams()
  const supabase = createClient()
  const router   = useRouter()

  // URL params
  const preProduct = params.get('product') ?? ''
  const preSlot    = params.get('slot')    ?? ''
  const preLevel   = params.get('level')   ?? ''
  const prePrice   = Number(params.get('price') ?? 0)
  const preLabel   = params.get('label')   ?? ''

  const isColumbarium  = preProduct === 'columbarium'
  const isUrn          = preProduct === 'urn'
  const isPackage      = preProduct === 'package'
  const reservationFee = isColumbarium && prePrice ? Math.round(prePrice * 0.10) : 0
  const SERVICE_FEE    = 25000

  const [includeServiceFee, setIncludeServiceFee] = useState(isUrn)
  const urnTotal      = isUrn ? prePrice + (includeServiceFee ? SERVICE_FEE : 0) : 0
  const defaultAmount = isColumbarium
    ? String(reservationFee)
    : isUrn ? String(urnTotal) : prePrice ? String(prePrice) : ''

  // Form state — declared before useEffect so init() can reference setters
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [method,   setMethod]   = useState<MethodId>('gcash')
  const [refNum,   setRefNum]   = useState('')
  const [amount,   setAmount]   = useState(defaultAmount)
  const [notes,    setNotes]    = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showObituaryModal, setShowObituaryModal] = useState(false)

  // Auth gate: null = loading, false = not logged in, true = logged in
  const [authReady,    setAuthReady]    = useState<boolean | null>(null)
  const [returnUrl,    setReturnUrl]    = useState('')
  const [paymentInfo,  setPaymentInfo]  = useState<PaymentInfo | null>(null)

  useEffect(() => {
    setReturnUrl(window.location.pathname + window.location.search)

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAuthReady(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name ?? '')
        setEmail(profile.email ?? '')
      }
      setAuthReady(true)
    }
    init()

    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => setPaymentInfo(data ?? null))
  }, [supabase])

  useEffect(() => {
    if (isUrn) setAmount(String(prePrice + (includeServiceFee ? SERVICE_FEE : 0)))
  }, [includeServiceFee, isUrn, prePrice])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setFileName(f.name) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim())  { setError('Full name is required.'); return }
    if (!email.trim()) { setError('Email address is required.'); return }
    if (!phone.trim()) { setError('Contact number is required.'); return }
    if (method !== 'cash' && !refNum.trim()) { setError('Reference number is required for this payment method.'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid payment amount.'); return }

    setLoading(true)

    let receiptPath: string | null = null
    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('payments').upload(path, file, { upsert: false })
      if (uploadErr) { setError('Receipt upload failed: ' + uploadErr.message); setLoading(false); return }
      receiptPath = path
    }

    const { data: { user } } = await supabase.auth.getUser()

    const notesArr = [
      preLevel ? `Level: ${preLevel}` : '',
      isColumbarium && prePrice ? `Full price: ₱${prePrice.toLocaleString('en-PH')}` : '',
      isColumbarium && reservationFee ? `Reservation fee (10%): ₱${reservationFee.toLocaleString('en-PH')}` : '',
      isUrn && includeServiceFee ? `Includes ₱25,000 cremation service fee` : '',
      isUrn && !includeServiceFee ? `Urn only (service fee waived)` : '',
      notes.trim(),
    ].filter(Boolean).join(' · ') || null

    const payload = {
      user_id:           user?.id ?? null,
      guest_name:        user ? null : name.trim(),
      guest_email:       user ? null : email.trim(),
      guest_phone:       user ? null : phone.trim(),
      product_type:      preProduct || 'general',
      product_ref:       preSlot || preLabel || null,
      method,
      reference_number:  refNum.trim() || null,
      amount:            Number(amount),
      receipt_file_path: receiptPath,
      notes:             notesArr,
      status:            'pending',
    }

    const { error: insertErr } = await supabase.from('payments').insert(payload)
    if (insertErr) { setError(insertErr.message); setLoading(false); return }

    const shouldBook = !isUrn || includeServiceFee
    if (shouldBook) {
      const packageName = isColumbarium
        ? `Columbarium Slot — ${preSlot || preLabel}`
        : isUrn
          ? `Cremation Service + ${preLabel}`
          : preLabel || preProduct

      await supabase.from('bookings').insert({
        user_id:      user?.id ?? null,
        guest_name:   user ? null : name.trim(),
        guest_email:  user ? null : email.trim(),
        guest_phone:  user ? null : phone.trim(),
        package_name: packageName,
        price:        Number(amount),
        status:       'pending',
        notes:        notesArr,
      })
    }

    setLoading(false)
    if (isPackage) {
      setShowObituaryModal(true)
    } else {
      router.push('/?payment=success')
    }
  }

  return (
    <>
      {authReady === false && <AuthGateModal returnUrl={returnUrl} />}

      {showObituaryModal && (
        <ObituaryModal
          submitterName={name}
          submitterEmail={email}
          submitterPhone={phone}
          onDone={() => router.push('/?payment=success')}
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
                        ? <>Full price: <span className="font-semibold text-foreground">₱{prePrice.toLocaleString('en-PH')}</span> · 10% reservation fee: <span className="font-bold text-primary">₱{reservationFee.toLocaleString('en-PH')}</span></>
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

            <form onSubmit={handleSubmit} className="space-y-8">

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
                      <input type="text" placeholder="Juan Dela Cruz" value={name} onChange={e => setName(e.target.value)} className={inp} />
                    </Field>
                    <Field label="Contact Number" required>
                      <input type="tel" placeholder="+63 9XX XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} className={inp} />
                    </Field>
                  </div>
                  <Field label="Email Address" required>
                    <input type="email" placeholder="juan@example.com" value={email} onChange={e => setEmail(e.target.value)}
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
                    <Field label={method === 'cash' ? 'OR Number / Notes' : 'Reference Number'} required={method !== 'cash'}>
                      <input type="text"
                        placeholder={
                          method === 'gcash'    ? '13-digit GCash reference' :
                          method === 'bdo_bank' ? 'BDO transaction reference' :
                          method === 'bpi_bank' ? 'BPI transaction reference' :
                          'Receipt / OR number (optional)'
                        }
                        value={refNum} onChange={e => setRefNum(e.target.value)} className={inp} />
                    </Field>
                    <Field label={isColumbarium ? 'Amount (₱) — 10% reservation fee' : 'Amount (₱)'} required>
                      <input type="number" placeholder="e.g. 2500" min="1"
                        value={amount} onChange={e => setAmount(e.target.value)}
                        readOnly={isColumbarium || isUrn}
                        className={`${inp} ${(isColumbarium || isUrn) ? 'bg-muted/30 cursor-not-allowed font-bold text-primary' : ''}`} />
                    </Field>
                  </div>

                  <Field label="Payment Proof (PNG / JPG)">
                    <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-5 text-center transition-all bg-background cursor-pointer group mt-1.5">
                      <input type="file" accept="image/*,application/pdf" onChange={handleFile}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
                      <p className="text-xs font-semibold text-foreground truncate px-4">
                        {fileName || 'Click or drag to upload receipt'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, PDF · max 5 MB</p>
                    </div>
                  </Field>

                  <Field label="Additional Notes">
                    <textarea rows={3} placeholder="Any special instructions or context…"
                      value={notes} onChange={e => setNotes(e.target.value)}
                      className="w-full p-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all resize-none placeholder:text-muted-foreground/50" />
                  </Field>

                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl text-sm">
                {loading ? 'Submitting…' : 'Submit Payment'}
              </Button>

            </form>
          </div>

          {/* RIGHT: SIDEBAR */}
          <PaymentSidebar paymentInfo={paymentInfo} />

        </div>
      </section>
    </>
  )
}
