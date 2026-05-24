'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { BillingForm } from '@/components/billing/billing-form'

function BillingContent() {
  const supabase = createClient()
  const router   = useRouter()
  const params   = useSearchParams()

  // ── URL params ──────────────────────────────────────────────────────────────
  // eto yung chinecheck natin para makapag pre-fill tayo sa check-out form.
  // nakalagay yung data nung products sa services/cremation /traditional na ginagamit natin for pre-fill.
  const preProduct = params.get('product') ?? ''
  const preSlot    = params.get('slot')    ?? ''
  const preLevel   = params.get('level')   ?? ''
  const prePrice   = Number(params.get('price') ?? 0)
  const preLabel   = params.get('label')   ?? ''

  const isColumbarium  = preProduct === 'columbarium'
  const isUrn          = preProduct === 'urn'
  const isPackage      = preProduct === 'package'
  const reservationFee = isColumbarium && prePrice ? Math.round(prePrice * 0.10) : 0
  const SERVICE_FEE    = 25_000

  // ── Auth + profile pre-fill ─────────────────────────────────────────────────
  // pre-fill logic null = loading, false = guest, true = authenticated
  const [authReady,   setAuthReady]   = useState<boolean | null>(null)
  const [prefillName, setPrefillName] = useState('')
  const [prefillEmail, setPrefillEmail] = useState('')
  const [returnUrl,   setReturnUrl]   = useState('')

  useEffect(() => {
    setReturnUrl(window.location.pathname + window.location.search)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthReady(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()

      if (profile) {
        setPrefillName(profile.name  ?? '')
        setPrefillEmail(profile.email ?? '')
      }
      setAuthReady(true)
    })
  }, [supabase])

  // ── Submit handler ──────────────────────────────────────────────────────────
  // Uploads receipt → inserts payment → conditionally inserts booking → redirects
  const handleSubmit = async (fields: {
    name: string; email: string; phone: string
    method: string; refNum: string; amount: string
    notes: string; file: File | null
    includeServiceFee: boolean
  }) => {
    const { name, email, phone, method, refNum, amount, notes, file, includeServiceFee } = fields

    let receiptPath: string | null = null
    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('payments')
        .upload(path, file, { upsert: false })
      if (uploadErr) throw new Error('Receipt upload failed: ' + uploadErr.message)
      receiptPath = path
    }

    const { data: { user } } = await supabase.auth.getUser()

    const notesArr = [
      preLevel ? `Level: ${preLevel}` : '',
      isColumbarium && prePrice ? `Full price: ₱${prePrice.toLocaleString('en-PH')}` : '',
      isColumbarium && reservationFee ? `Reservation fee (10%): ₱${reservationFee.toLocaleString('en-PH')}` : '',
      isUrn && includeServiceFee  ? `Includes ₱25,000 cremation service fee` : '',
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
    if (insertErr) throw new Error(insertErr.message)

    // Create a booking for everything pero hindi to nagseset ng booking if urn-only (no service fee)
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

    // (Traditional burial) Package purchases open the tarp creator modal before redirecting
    if (isPackage) return 'obituary'
    router.push('/?payment=success')
  }

  return (
    <BillingForm
      // Yung context neto is galing sa kung anong product ba yung nagsend sayo sa billing page for pre-fill
      preProduct={preProduct}
      preSlot={preSlot}
      preLevel={preLevel}
      prePrice={prePrice}
      preLabel={preLabel}
      isColumbarium={isColumbarium}
      isUrn={isUrn}
      isPackage={isPackage}
      reservationFee={reservationFee}
      SERVICE_FEE={SERVICE_FEE}
      // Auth state
      authReady={authReady}
      returnUrl={returnUrl}
      prefillName={prefillName}
      prefillEmail={prefillEmail}
      // Submit handler
      onSubmit={handleSubmit}
    />
  )
}

export default function BillingPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

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
          <BillingContent />
        </Suspense>

      </main>
    </>
  )
}
