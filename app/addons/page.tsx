'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import {
  ShoppingCart, Plus, Minus, ArrowRight, Trash2, CheckCircle2,
  Lock, Package, ChevronLeft, X, AlertCircle, Clock,
  Flower2, Music, Bird, Lightbulb, Gift, Sparkles,
} from 'lucide-react'
import type { FuneralAddon, DocumentSubmission, AddonOrder, AddonOrderItem } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────
function fmtPeso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

// Placeholder icon per addon name
function AddonIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes('flower')) return <Flower2 className="h-8 w-8 text-rose-400" />
  if (lower.includes('music') || lower.includes('band')) return <Music className="h-8 w-8 text-violet-400" />
  if (lower.includes('dove')) return <Bird className="h-8 w-8 text-sky-400" />
  if (lower.includes('light')) return <Lightbulb className="h-8 w-8 text-amber-400" />
  if (lower.includes('token') || lower.includes('remembrance')) return <Gift className="h-8 w-8 text-pink-400" />
  return <Sparkles className="h-8 w-8 text-primary" />
}

// ── Cart item type ────────────────────────────────────────────
interface CartItem {
  addon: FuneralAddon
  qty: number
}

// ── Step indicator ────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2].map(s => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === s
              ? 'bg-primary text-primary-foreground shadow-sm'
              : step > s
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
          }`}>
            {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
          </div>
          <span className={`text-xs font-semibold hidden sm:block ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
            {s === 1 ? 'Choose Add-ons' : 'Review & Submit'}
          </span>
          {s < 2 && <div className="w-8 h-px bg-border mx-1 hidden sm:block" />}
        </div>
      ))}
    </div>
  )
}

// ── Addon card (Step 1) ───────────────────────────────────────
function AddonCard({
  addon,
  qty,
  existingQtyOrdered,  // qty already in an approved/pending/paid order
  onChange,
}: {
  addon: FuneralAddon
  qty: number
  existingQtyOrdered: number
  onChange: (delta: number) => void
}) {
  const remainingMax = Math.max(0, addon.max_qty - existingQtyOrdered)
  const isMaxed = qty >= remainingMax
  const isDisabledItem = remainingMax === 0

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${
      qty > 0 ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'border-border hover:border-border/80'
    } ${isDisabledItem ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted/30 flex items-center justify-center">
        {addon.image_path && !addon.image_path.startsWith('/addons/') ? (
          <Image
            src={addon.image_path}
            alt={addon.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-6">
            <AddonIcon name={addon.name} />
          </div>
        )}
        {qty > 0 && (
          <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
            {qty}
          </div>
        )}
        {isDisabledItem && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-muted rounded-full">Max Reached</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2">
        <div>
          <p className="text-xs font-bold text-foreground leading-tight">{addon.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{addon.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-primary">{fmtPeso(addon.price)}</p>
          {addon.max_qty <= 2 && (
            <span className="text-[9px] text-muted-foreground font-semibold bg-muted px-1.5 py-0.5 rounded-full">
              Max {addon.max_qty === 99 ? '∞' : addon.max_qty}
            </span>
          )}
        </div>

        {/* Qty stepper */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(-1)}
            disabled={qty === 0}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="flex-1 text-center text-sm font-bold text-foreground">{qty}</span>
          <button
            onClick={() => onChange(1)}
            disabled={isMaxed}
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Summary view (Step 2) ─────────────────────────────────────
function SummaryStep({
  cartItems,
  serviceLabel,
  onRemove,
  onBack,
  onSubmit,
  submitting,
}: {
  cartItems: CartItem[]
  serviceLabel: string
  onRemove: (addonId: string) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const total = cartItems.reduce((s, i) => s + i.addon.price * i.qty, 0)

  return (
    <div className="space-y-4">

      {/* Service context */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-primary">Add-ons for</p>
          <p className="text-sm font-semibold text-foreground">{serviceLabel}</p>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/60">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Order Summary</p>
        </div>
        <div className="divide-y divide-border/50">
          {cartItems.map(item => (
            <div key={item.addon.id} className="flex items-start gap-3 px-5 py-3.5">
              {/* Icon */}
              <div className="h-10 w-10 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                {item.addon.image_path && !item.addon.image_path.startsWith('/addons/') ? (
                  <div className="relative h-full w-full rounded-xl overflow-hidden">
                    <Image src={item.addon.image_path} alt={item.addon.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <AddonIcon name={item.addon.name} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">{item.addon.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {fmtPeso(item.addon.price)} × {item.qty}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm font-bold text-primary">{fmtPeso(item.addon.price * item.qty)}</p>
                <button
                  onClick={() => onRemove(item.addon.id)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="px-5 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Amount</p>
            <p className="text-[9px] text-muted-foreground">No discounts applied</p>
          </div>
          <p className="text-xl font-bold text-foreground">{fmtPeso(total)}</p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Pending Admin Approval</p>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 leading-relaxed mt-0.5">
            Your add-on order will be reviewed by our staff. Once approved, you will be notified and can proceed with payment.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 h-12 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-2 flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit for Approval <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="py-20 text-center space-y-5">
      <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Order Submitted!</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Your add-on order has been submitted for review. Our staff will get back to you shortly.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/payments"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
        >
          View My Payments <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          My Bookings
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
type ViewStep = 'select' | 'summary' | 'done'

export default function AddonsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [step,         setStep]         = useState<ViewStep>('select')
  const [addons,       setAddons]       = useState<FuneralAddon[]>([])
  const [cart,         setCart]         = useState<Record<string, number>>({})  // addonId -> qty
  const [submission,   setSubmission]   = useState<DocumentSubmission | null>(null)
  const [existingQtys, setExistingQtys] = useState<Record<string, number>>({})  // addonId -> total already ordered
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')
  const [accessError,  setAccessError]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login?next=/addons'); return }

    // 1. Find an active traditional service (approved doc submission, not buried yet)
    //    "Active" = has a payment approved for a 'package' type product, and wake hasn't ended
    const { data: subs } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('product_type', 'package')
      .order('created_at', { ascending: false })
      .limit(5)

    if (!subs || subs.length === 0) {
      setAccessError('no_traditional_service')
      setLoading(false)
      return
    }

    // Check if any of those have an approved payment
    const subIds = subs.map(s => s.id)
    const { data: approvedPayments } = await supabase
      .from('payments')
      .select('document_submission_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .in('document_submission_id', subIds)

    if (!approvedPayments || approvedPayments.length === 0) {
      setAccessError('no_approved_payment')
      setLoading(false)
      return
    }

    const paidSubIds = new Set(approvedPayments.map(p => p.document_submission_id))

    // Check if the wake has already ended (buried) — look for wake with wake_end_date in the past
    const activeSub = subs.find(s => paidSubIds.has(s.id))
    if (!activeSub) {
      setAccessError('no_approved_payment')
      setLoading(false)
      return
    }

    // Check if the associated wake is still active (not ended)
    const { data: wakeData } = await supabase
      .from('wakes')
      .select('id, wake_end_date')
      .eq('booking_id', activeSub.id)
      .maybeSingle()

    if (wakeData?.wake_end_date) {
      const endDate = new Date(wakeData.wake_end_date)
      const now = new Date()
      // Grace period of 1 day after burial for last-minute add-ons
      if (endDate < new Date(now.getTime() - 86400000)) {
        setAccessError('already_buried')
        setLoading(false)
        return
      }
    }

    setSubmission(activeSub as DocumentSubmission)

    // 2. Load addon catalog
    const { data: addonData } = await supabase
      .from('funeral_addons')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    setAddons((addonData ?? []) as FuneralAddon[])

    // 3. Load existing approved/pending/paid orders for this client to check max limits
    const { data: existingOrders } = await supabase
      .from('addon_orders')
      .select('id, status, addon_order_items(addon_id, quantity)')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'paid'])

    const qtys: Record<string, number> = {}
    if (existingOrders) {
      for (const order of existingOrders as Array<{ id: string; status: string; addon_order_items: Array<{ addon_id: string; quantity: number }> }>) {
        for (const item of order.addon_order_items ?? []) {
          qtys[item.addon_id] = (qtys[item.addon_id] ?? 0) + item.quantity
        }
      }
    }
    setExistingQtys(qtys)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  const handleQtyChange = (addonId: string, delta: number) => {
    setCart(prev => {
      const newQty = Math.max(0, (prev[addonId] ?? 0) + delta)
      if (newQty === 0) {
        const next = { ...prev }
        delete next[addonId]
        return next
      }
      return { ...prev, [addonId]: newQty }
    })
  }

  const cartItems: CartItem[] = addons
    .filter(a => (cart[a.id] ?? 0) > 0)
    .map(a => ({ addon: a, qty: cart[a.id]! }))

  const cartTotal = cartItems.reduce((s, i) => s + i.addon.price * i.qty, 0)
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0)

  const handleRemoveFromSummary = (addonId: string) => {
    setCart(prev => {
      const next = { ...prev }
      delete next[addonId]
      return next
    })
    if (cartItems.length <= 1) setStep('select')
  }

  const handleSubmit = async () => {
    if (!submission || cartItems.length === 0) return
    setSubmitting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const total = cartItems.reduce((s, i) => s + i.addon.price * i.qty, 0)

      // Create the order
      const { data: order, error: orderErr } = await supabase
        .from('addon_orders')
        .insert({
          user_id: user.id,
          document_submission_id: submission.id,
          total_amount: total,
          status: 'pending',
        })
        .select()
        .single()

      if (orderErr || !order) throw new Error(orderErr?.message ?? 'Failed to create order')

      // Insert line items
      const items = cartItems.map(item => ({
        order_id: (order as AddonOrder).id,
        addon_id: item.addon.id,
        quantity: item.qty,
        unit_price: item.addon.price,
      }))

      const { error: itemsErr } = await supabase
        .from('addon_order_items')
        .insert(items)

      if (itemsErr) throw new Error(itemsErr.message)

      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Access error screens ──────────────────────────────────────
  if (!loading && accessError) {
    const msgs: Record<string, { title: string; body: string; cta?: { label: string; href: string } }> = {
      no_traditional_service: {
        title: 'Traditional Service Required',
        body:  'Add-ons are only available for clients who have availed a Traditional Burial service. Please book a Traditional service first.',
        cta:   { label: 'View Services', href: '/services/traditional' },
      },
      no_approved_payment: {
        title: 'Payment Not Yet Approved',
        body:  'Your Traditional service payment has not been approved yet. Please wait for approval before ordering add-ons.',
        cta:   { label: 'View My Payments', href: '/payments' },
      },
      already_buried: {
        title: 'Service Already Completed',
        body:  'This service has already been completed (burial date has passed). Add-ons can only be ordered during an active wake.',
        cta:   { label: 'Back to Bookings', href: '/bookings' },
      },
    }
    const msg = msgs[accessError] ?? msgs['no_traditional_service']
    return (
      <ClientLayout>
        <main className="flex-1 bg-background">
          <div className="max-w-lg mx-auto px-5 py-24 text-center space-y-5">
            <div className="h-14 w-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{msg.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{msg.body}</p>
            {msg.cta && (
              <Link
                href={msg.cta.href}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                {msg.cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </main>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <main className="flex-1 bg-background">

        {/* Hero */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10">
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Traditional Funeral Service</p>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="h-7 w-7 text-primary" />
              Add-ons
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Personalize the service with optional add-ons for your loved one's farewell.
            </p>
            {submission && (
              <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{submission.product_label ?? submission.product_ref ?? 'Traditional Service'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : step === 'done' ? (
            <SuccessScreen />
          ) : (
            <div className="space-y-6">

              {/* Step header */}
              <div className="flex items-center justify-between">
                <StepIndicator step={step === 'select' ? 1 : 2} />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-destructive">{error}</p>
                </div>
              )}

              {step === 'select' && (
                <>
                  {/* Add-ons grid */}
                  {addons.length === 0 ? (
                    <div className="py-20 text-center text-sm text-muted-foreground italic">
                      No add-ons available at the moment.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {addons.map(addon => (
                        <AddonCard
                          key={addon.id}
                          addon={addon}
                          qty={cart[addon.id] ?? 0}
                          existingQtyOrdered={existingQtys[addon.id] ?? 0}
                          onChange={delta => handleQtyChange(addon.id, delta)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Checkout bottom bar */}
                  {cartCount > 0 && (
                    <div className="sticky bottom-4 left-0 right-0 z-30">
                      <div className="bg-card border border-border rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                              {cartCount}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</p>
                            <p className="text-[10px] text-muted-foreground">{fmtPeso(cartTotal)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setStep('summary')}
                          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
                        >
                          Checkout <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {step === 'summary' && (
                <SummaryStep
                  cartItems={cartItems}
                  serviceLabel={submission?.product_label ?? submission?.product_ref ?? 'Traditional Funeral Service'}
                  onRemove={handleRemoveFromSummary}
                  onBack={() => setStep('select')}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </ClientLayout>
  )
}
