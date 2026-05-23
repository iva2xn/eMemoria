'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { UploadCloud, Info, User, FileText, X, CheckCircle2, ScrollText } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────
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

// ── Obituary Modal — shown after package payment ─────────────
interface ObituaryModalProps {
  submitterName: string
  submitterEmail: string
  submitterPhone: string
  onDone: () => void
}

function ObituaryModal({ submitterName, submitterEmail, submitterPhone, onDone }: ObituaryModalProps) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [firstName,  setFirstName]  = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName,   setLastName]   = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [age,           setAge]           = useState('')
  const [venueAddress,  setVenueAddress]  = useState('')
  const [contactNumber, setContactNumber] = useState(submitterPhone)
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
    if (!firstName.trim())    { setError('First name of deceased is required.'); return }
    if (!lastName.trim())     { setError('Last name of deceased is required.'); return }
    if (!birthDate)           { setError('Date of birth is required.'); return }
    if (!deathDate)           { setError('Date of death is required.'); return }
    if (!age)                 { setError('Age is required.'); return }
    if (!venueAddress.trim()) { setError('Venue address is required.'); return }
    if (!contactNumber.trim()){ setError('Contact number is required.'); return }

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
      submitter_name:  submitterName,
      submitter_email: submitterEmail,
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
      {/* Scrollable centering wrapper — pointer-events only on the modal card */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Memorial Tarpaulin Details</h2>
          </div>
          <button onClick={onDone} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
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
              Our team will prepare the tarpaulin and reach out to you at <span className="font-semibold text-foreground">{submitterEmail}</span>.
            </p>
            <Button onClick={onDone} className="rounded-xl px-8 mt-2">Continue</Button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <p className="text-xs text-muted-foreground">
              Payment submitted. Please fill in the details below so we can prepare the memorial tarpaulin for your loved one.
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
                      onChange={e => setFirstName(e.target.value)} className={inp} required />
                  </Field>
                </div>
                <Field label="Middle Name (optional)">
                  <input type="text" placeholder="e.g. Santos" value={middleName}
                    onChange={e => setMiddleName(e.target.value)} className={inp} />
                </Field>
                <Field label="Last Name / Surname" required>
                  <input type="text" placeholder="e.g. Dela Cruz" value={lastName}
                    onChange={e => setLastName(e.target.value)} className={inp} required />
                </Field>
                <Field label="Date of Birth" required>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} required />
                </Field>
                <Field label="Date of Death" required>
                  <input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className={inp} required />
                </Field>
                <Field label="Age" required>
                  <input type="number" placeholder="e.g. 72" min="0" max="150" value={age}
                    onChange={e => setAge(e.target.value)} className={inp} required />
                </Field>
                <Field label="Contact Number" required>
                  <input type="tel" placeholder="e.g. 0916 797 8416" value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)} className={inp} required />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Venue / Wake Address" required>
                    <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress}
                      onChange={e => setVenueAddress(e.target.value)} className={inp} required />
                  </Field>
                </div>
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
                <Button type="button" variant="ghost" onClick={onDone} className="flex-1 h-11 rounded-xl">
                  Skip for now
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

// ── Main form ────────────────────────────────────────────────
function BillingForm() {
  const params     = useSearchParams()
  const supabase   = createClient()
  const router     = useRouter()

  // Load payment info for sidebar
  const [paymentInfo, setPaymentInfo] = useState<{
    gcash_name: string; gcash_number: string; gcash_qr_path: string | null
    bank1_name: string; bank1_account_name: string; bank1_account_number: string
    bank2_name: string; bank2_account_name: string; bank2_account_number: string
    bank3_name: string; bank3_account_name: string; bank3_account_number: string
    bank4_name: string; bank4_account_name: string; bank4_account_number: string
  } | null>(null)

  useEffect(() => {
    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => setPaymentInfo(data ?? null))
  }, [supabase])

  // Pre-filled from URL params (set by columbarium / service pages)
  const preProduct = params.get('product') ?? ''
  const preSlot    = params.get('slot')    ?? ''
  const preLevel   = params.get('level')   ?? ''
  const prePrice   = Number(params.get('price') ?? 0)
  const preLabel   = params.get('label')   ?? ''

  // Reservation fee ONLY for columbarium (10%)
  const isColumbarium  = preProduct === 'columbarium'
  const isUrn          = preProduct === 'urn'
  const reservationFee = isColumbarium && prePrice ? Math.round(prePrice * 0.10) : 0

  // Urns: default amount = urn price + 25k service fee (user can opt out)
  const SERVICE_FEE = 25000
  const [includeServiceFee, setIncludeServiceFee] = useState(isUrn)
  const urnTotal = isUrn ? prePrice + (includeServiceFee ? SERVICE_FEE : 0) : 0

  const defaultAmount = isColumbarium
    ? String(reservationFee)
    : isUrn
      ? String(urnTotal)
      : prePrice
        ? String(prePrice)
        : ''

  const isLocked = isColumbarium || (!isUrn && !!prePrice) // eslint-disable-line @typescript-eslint/no-unused-vars

  // Contact info — typed by user
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')

  // Payment details
  const [method,  setMethod]  = useState<MethodId>('gcash')
  const [refNum,  setRefNum]  = useState('')
  const [amount,  setAmount]  = useState(defaultAmount)
  const [notes,   setNotes]   = useState('')

  // Keep amount in sync when urn service fee toggle changes
  useEffect(() => {
    if (isUrn) setAmount(String(prePrice + (includeServiceFee ? SERVICE_FEE : 0)))
  }, [includeServiceFee, isUrn, prePrice])

  // Receipt file
  const [file,     setFile]    = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  // UI state
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  // After payment succeeds for a package, show obituary modal
  const [showObituaryModal, setShowObituaryModal] = useState(false)
  const isPackage = preProduct === 'package'

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

    // Upload receipt if provided
    let receiptPath: string | null = null
    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('payments')
        .upload(path, file, { upsert: false })
      if (uploadErr) {
        setError('Receipt upload failed: ' + uploadErr.message)
        setLoading(false)
        return
      }
      receiptPath = path
    }

    // Check if user is logged in — attach user_id if so
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      user_id:          user?.id ?? null,
      guest_name:       user ? null : name.trim(),
      guest_email:      user ? null : email.trim(),
      guest_phone:      user ? null : phone.trim(),
      product_type:     preProduct || 'general',
      product_ref:      preSlot    || preLabel || null,
      method:           method,
      reference_number: refNum.trim() || null,
      amount:           Number(amount),
      receipt_file_path: receiptPath,
      notes: [
        preLevel ? `Level: ${preLevel}` : '',
        isColumbarium && prePrice ? `Full price: ₱${prePrice.toLocaleString('en-PH')}` : '',
        isColumbarium && reservationFee ? `Reservation fee (10%): ₱${reservationFee.toLocaleString('en-PH')}` : '',
        isUrn && includeServiceFee ? `Includes ₱25,000 cremation service fee` : '',
        isUrn && !includeServiceFee ? `Urn only (service fee waived)` : '',
        notes.trim(),
      ].filter(Boolean).join(' · ') || null,
      status: 'pending',
    }

    const { error: insertErr } = await supabase.from('payments').insert(payload)

    if (insertErr) {
      setError(insertErr.message)
      setLoading(false)
      return
    }

    // Auto-create a booking for service purchases (not urn-only)
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
        notes:        payload.notes,
      })
    }

    setLoading(false)
    // If it's a package purchase, show obituary modal before redirecting
    if (isPackage) {
      setShowObituaryModal(true)
    } else {
      router.push('/?payment=success')
    }
  }

  return (
    <>
      {/* ── OBITUARY MODAL (package purchases only) ── */}
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

        {/* ── LEFT: FORM ── */}
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
                {/* Urn service fee toggle */}
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

            {/* ── SECTION 1: Contact Info ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" required>
                    <input type="text" placeholder="Juan Dela Cruz" value={name}
                      onChange={e => setName(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Contact Number" required>
                    <input type="tel" placeholder="+63 9XX XXX XXXX" value={phone}
                      onChange={e => setPhone(e.target.value)} className={inp} />
                  </Field>
                </div>
                <Field label="Email Address" required>
                  <input type="email" placeholder="juan@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} className={inp} />
                </Field>
              </div>
            </div>

            {/* ── SECTION 2: Payment Method ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Payment Details</h3>
              </div>
              <div className="px-6 py-5 space-y-5">

                {/* Method pills */}
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
                  <Field label={isColumbarium ? 'Amount (₱) — 10% reservation fee' : isUrn ? 'Amount (₱)' : 'Amount (₱)'} required>
                    <input type="number" placeholder="e.g. 2500" min="1"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      readOnly={isColumbarium || isUrn}
                      className={`${inp} ${(isColumbarium || isUrn) ? 'bg-muted/30 cursor-not-allowed font-bold text-primary' : ''}`} />
                  </Field>
                </div>

                {/* Receipt upload */}
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

                {/* Notes */}
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

        {/* ── RIGHT: SIDEBAR ── */}
        <div className="space-y-4 lg:sticky lg:top-24">

          {/* GCash */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">GCash</p>
            </div>
            <div className="p-5 flex flex-col items-center gap-3">
              {paymentInfo?.gcash_qr_path ? (
                <img
                  src={supabase.storage.from('payment-info').getPublicUrl(paymentInfo.gcash_qr_path).data.publicUrl}
                  alt="GCash QR Code"
                  className="w-36 h-36 rounded-xl object-contain border border-border bg-white"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-muted-foreground text-center leading-relaxed px-2">QR code<br/>not set yet</span>
                </div>
              )}
              {(paymentInfo?.gcash_name || paymentInfo?.gcash_number) && (
                <div className="text-center space-y-0.5">
                  {paymentInfo.gcash_name && <p className="text-xs font-bold text-foreground">{paymentInfo.gcash_name}</p>}
                  {paymentInfo.gcash_number && <p className="font-mono text-sm text-primary font-bold">{paymentInfo.gcash_number}</p>}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                Scan with GCash app then upload screenshot as proof.
              </p>
            </div>
          </div>

          {/* Bank accounts */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Bank Transfer</p>
            </div>
            <div className="px-5 py-4 space-y-4 text-xs">
              {paymentInfo ? (
                <>
                  {([1, 2, 3, 4] as const).map((n, i) => {
                    const bankName = (paymentInfo as Record<string, string>)[`bank${n}_name`]
                    const holder   = (paymentInfo as Record<string, string>)[`bank${n}_account_name`]
                    const acct     = (paymentInfo as Record<string, string>)[`bank${n}_account_number`]
                    if (!bankName && !acct) return null
                    return (
                      <div key={n} className={i > 0 ? 'border-t border-border pt-3' : ''}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{bankName}</p>
                        <p className="font-mono font-bold text-foreground mt-1">{acct}</p>
                        {holder && <p className="text-[10px] text-muted-foreground mt-0.5">{holder}</p>}
                      </div>
                    )
                  })}
                  {([1, 2, 3, 4] as const).every(n => !(paymentInfo as Record<string, string>)[`bank${n}_name`]) && (
                    <p className="text-[10px] text-muted-foreground italic">No bank accounts configured yet.</p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">Loading bank details…</p>
              )}
            </div>
          </div>

          {/* Help */}
          <div className="bg-muted/30 border border-border/60 rounded-2xl px-5 py-4 text-xs text-muted-foreground leading-relaxed space-y-1">
            <p className="font-bold text-foreground text-xs">Need help?</p>
            <p>Call us at <a href="tel:+639189019978" className="text-primary font-semibold hover:underline">+63 918 901 9978</a></p>
            <p>or email <a href="mailto:mgayetafuneralhome@gmail.com" className="text-primary font-semibold hover:underline">mgayetafuneralhome@gmail.com</a></p>
          </div>

        </div>
      </div>
    </section>
    </>
  )
}

// ── Page shell ───────────────────────────────────────────────
export default function BillingPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* Page header */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Secure Payment</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Payment Portal</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Submit your payment details and proof of transaction. Our team will verify and confirm within the day.
          </p>
        </div>

        <Suspense fallback={
          <div className="py-20 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }>
          <BillingForm />
        </Suspense>

      </main>
    </>
  )
}
