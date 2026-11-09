'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { BillingForm } from '@/components/billing/billing-form'

function BillingContent() {
  const supabase = createClient()
  const router   = useRouter()
  const params   = useSearchParams()

  // ── URL params ──────────────────────────────────────────────────────────────
  // eto yung chinecheck natin para makapag pre-fill tayo sa check-out form.
  // nakalagay yung data nung products sa services/cremation /traditional na ginagamit natin for pre-fill.
  const preProduct   = params.get('product')      ?? ''
  const preSlot      = params.get('slot')         ?? ''
  const preLevel     = params.get('level')        ?? ''
  const prePrice     = Number(params.get('price') ?? 0)
  const preLabel     = params.get('label')        ?? ''
  const documentSubmissionId = params.get('document_submission_id') ?? null   // set when coming from an approved document submission
  // senior_pwd=1 is set by admin when approving a document submission with discount
  const seniorPwdDiscount = params.get('senior_pwd') === '1'
  // addon_order_ids: comma-separated addon_order UUIDs to link to this payment
  const addonOrderIds = (params.get('addon_order_ids') ?? '').split(',').filter(Boolean)
  // addon_total: sum of approved unpaid addon orders included in prePrice
  const addonTotal = Number(params.get('addon_total') ?? 0)
  // wake extension params
  const wakeId              = params.get('wake_id') ?? null
  const extensionRequestId  = params.get('extension_request_id') ?? null

  const isColumbarium  = preProduct === 'columbarium'
  const isUrn          = preProduct === 'urn'
  const isPackage      = preProduct === 'package'
  const isWakeExtension = preProduct === 'wake_extension'
  // Columbarium online = full price (no reservation fee)
  const reservationFee = 0
  const SERVICE_FEE    = 25_000

  // ── Auth + profile pre-fill ─────────────────────────────────────────────────
  // pre-fill logic null = loading, false = guest, true = authenticated
  const [authReady,    setAuthReady]    = useState<boolean | null>(null)
  const [prefillName,  setPrefillName]  = useState('')
  const [prefillEmail, setPrefillEmail] = useState('')
  const [prefillPhone, setPrefillPhone] = useState('')
  const [returnUrl,    setReturnUrl]    = useState('')

   
  useEffect(() => {
    setReturnUrl(window.location.pathname + window.location.search)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthReady(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', user.id)
        .single()

      if (profile) {
        setPrefillName(profile.name   ?? '')
        setPrefillEmail(profile.email ?? '')
        setPrefillPhone(profile.phone ?? '')
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

    // If there are addon orders, fetch their line items so the receipt can show per-item breakdown
    let addonItemsJson = ''
    if (addonOrderIds.length > 0 && addonTotal > 0) {
      const { data: addonItems } = await supabase
        .from('addon_order_items')
        .select('quantity, unit_price, addon:funeral_addons(name)')
        .in('order_id', addonOrderIds)
      if (addonItems && addonItems.length > 0) {
        // Store compact JSON: [{n:"Flower Arrangement",q:2,p:1500},...]
        // Supabase returns joined rows as an array, so addon may be Array<{name}> or {name} or null
        type RawItem = { quantity: number; unit_price: number; addon: unknown }
        const items = (addonItems as RawItem[]).map(i => {
          const a = i.addon
          const name = Array.isArray(a) ? ((a[0] as { name?: string })?.name ?? 'Add-on')
            : (a as { name?: string } | null)?.name ?? 'Add-on'
          return { n: name, q: i.quantity, p: Number(i.unit_price) }
        })
        addonItemsJson = `ADDON_ITEMS:${JSON.stringify(items)}`
      }
    }

    const notesArr = [
      preLevel ? `Level: ${preLevel}` : '',
      isColumbarium && prePrice ? `Full price: ₱${prePrice.toLocaleString('en-PH')}` : '',
      isUrn && includeServiceFee  ? `Includes ₱25,000 cremation service fee` : '',
      isUrn && !includeServiceFee ? `Urn only (service fee waived)` : '',
      isWakeExtension ? `Wake date extension payment` : '',
      addonTotal > 0 ? `Add-ons total: ₱${addonTotal.toLocaleString('en-PH')}` : '',
      addonItemsJson,
      notes.trim(),
    ].filter(Boolean).join(' · ') || null

    const payload = {
      user_id:              user?.id ?? null,
      guest_name:           user ? null : name.trim(),
      guest_email:          user ? null : email.trim(),
      guest_phone:          user ? null : phone.trim(),
      product_type:         preProduct || 'general',
      product_ref:          preSlot || preLabel || null,
      method,
      reference_number:     refNum.trim() || null,
      amount:               Number(amount),
      receipt_file_path:    receiptPath,
      notes:                notesArr,
      status:               'pending',
      document_submission_id: documentSubmissionId,
      senior_pwd_discount:  seniorPwdDiscount,
      wake_id:              wakeId ?? null,
    }

    const { error: insertErr, data: newPayment } = await supabase.from('payments').insert(payload).select('id').single()
    if (insertErr) throw new Error(insertErr.message)

    // Link any approved addon orders to this payment
    if (addonOrderIds.length > 0 && newPayment) {
      await supabase
        .from('addon_orders')
        .update({ payment_id: newPayment.id, status: 'paid' })
        .in('id', addonOrderIds)
    }

    // Save phone to profile for future prefill
    if (user && phone.trim()) {
      await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id)
    }

    // Wake extension: no booking row needed; redirect to payments page
    if (isWakeExtension) {
      router.push('/payments?payment=success')
      return
    }

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
      isWakeExtension={isWakeExtension}
      reservationFee={reservationFee}
      SERVICE_FEE={SERVICE_FEE}
      // Auth state
      authReady={authReady}
      returnUrl={returnUrl}
      prefillName={prefillName}
      prefillEmail={prefillEmail}
      prefillPhone={prefillPhone}
      seniorPwdDiscount={seniorPwdDiscount}
      documentSubmissionId={documentSubmissionId}
      addonTotal={addonTotal}
      // Submit handler
      onSubmit={handleSubmit}
    />
  )
}

export default function BillingPage() {
  return (
    <ClientLayout>

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
    </ClientLayout>
  )
}
