'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { HeroHeader } from '@/components/header'
import { UploadCloud, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAYMENT_METHODS = ['GCash', 'BDO Bank Transfer', 'BPI Bank Transfer', 'Cash (Counter)']

// Products — only columbarium for now
const PRODUCTS = [
  { id: 'columbarium', label: 'Columbarium Slot Reservation' },
]

const inputCls = "w-full h-11 px-4 rounded-xl bg-background border border-[var(--brand-cream-border)] text-sm text-[var(--surface-text-dark)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300"
const labelCls = "text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)]"

function BillingForm() {
  const params = useSearchParams()

  // Read pre-fill params from columbarium
  const preProduct = params.get('product') ?? ''
  const preSlot    = params.get('slot')    ?? ''
  const preLevel   = params.get('level')   ?? ''
  const prePrice   = Number(params.get('price') ?? 0)
  const reservationFee = prePrice ? Math.round(prePrice * 0.10) : 0

  const isFromColumbarium = preProduct === 'columbarium' && !!preSlot

  const [product, setProduct]     = useState(isFromColumbarium ? 'columbarium' : '')
  const [slotRef, setSlotRef]     = useState(preSlot)
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [method, setMethod]       = useState(PAYMENT_METHODS[0])
  const [reference, setReference] = useState('')
  const [amount, setAmount]       = useState(reservationFee ? String(reservationFee) : '')
  const [notes, setNotes]         = useState(
    isFromColumbarium
      ? `Columbarium slot reservation — Slot ${preSlot}, ${preLevel}. 10% reservation fee of ₱${reservationFee.toLocaleString('en-PH')}.`
      : ''
  )
  const [fileName, setFileName]   = useState('')
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  // If navigated here from columbarium, lock the product/slot/amount
  const isLocked = isFromColumbarium

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) setFileName(e.target.files[0].name)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name || !email || !reference || !amount) {
      setError('Please fill in all required fields.')
      return
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid payment amount.')
      return
    }
    setSuccess(true)
    setName(''); setEmail(''); setReference(''); setNotes(''); setFileName('')
    if (!isLocked) { setAmount(''); setProduct(''); setSlotRef('') }
  }

  return (
    <section className="py-12 max-w-5xl mx-auto px-4 md:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">

        {/* ── FORM ── */}
        <div className="bg-card border border-[var(--brand-cream-border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--brand-cream-border)]">
            <h2 className="font-serif text-lg font-semibold text-[var(--brand-green)]">Submit Payment</h2>
            <p className="text-xs text-[var(--surface-muted)] mt-0.5">Fill in your payment details and attach proof of transaction.</p>
          </div>

          <div className="px-6 py-6">
            {error && (
              <div className="mb-5 p-3.5 bg-red-500/5 text-red-600 border border-red-500/10 rounded-xl flex items-center gap-2.5 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="mb-5 p-3.5 bg-[var(--brand-green)]/5 text-[var(--brand-green)] border border-[var(--brand-green)]/15 rounded-xl flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-gold)]" />
                Payment submitted successfully. Our team will verify and confirm shortly.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Pre-fill notice from columbarium */}
              {isFromColumbarium && (
                <div className="p-4 rounded-xl bg-[var(--brand-green)]/5 border border-[var(--brand-green)]/15 flex items-start gap-3 text-xs text-[var(--surface-muted)]">
                  <Info className="h-4 w-4 text-[var(--brand-green)] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[var(--brand-green)] mb-0.5">Columbarium Reservation</p>
                    <p>Slot <span className="font-mono font-bold text-[var(--surface-text-dark)]">{preSlot}</span> — {preLevel}</p>
                    <p className="mt-0.5">Full price: <span className="font-semibold text-[var(--surface-text-dark)]">₱{prePrice.toLocaleString('en-PH')}</span> · 10% reservation fee: <span className="font-bold text-[var(--brand-green)]">₱{reservationFee.toLocaleString('en-PH')}</span></p>
                  </div>
                </div>
              )}

              {/* Product / Package selector */}
              <div className="space-y-1.5">
                <label className={labelCls}>Product / Package <span className="text-[var(--brand-gold)]">*</span></label>
                {isLocked ? (
                  <div className={`${inputCls} flex items-center bg-muted/30 cursor-not-allowed text-[var(--surface-muted)]`}>
                    Columbarium Slot Reservation — {preSlot}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={product}
                      onChange={e => setProduct(e.target.value)}
                      className={`${inputCls} appearance-none`}
                      required
                    >
                      <option value="">— Select a product —</option>
                      {PRODUCTS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--surface-muted)]">
                      <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Slot reference (only for columbarium) */}
              {(product === 'columbarium' || isLocked) && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Slot Reference</label>
                  <input
                    type="text"
                    value={slotRef}
                    onChange={e => setSlotRef(e.target.value)}
                    placeholder="e.g. R2C05"
                    className={`${inputCls} ${isLocked ? 'bg-muted/30 cursor-not-allowed' : ''}`}
                    readOnly={isLocked}
                  />
                </div>
              )}

              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Full Name <span className="text-[var(--brand-gold)]">*</span></label>
                  <input type="text" placeholder="Juan Dela Cruz" value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Email Address <span className="text-[var(--brand-gold)]">*</span></label>
                  <input type="email" placeholder="juan@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className={labelCls}>Payment Method <span className="text-[var(--brand-gold)]">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150 ${
                        method === m
                          ? 'bg-[var(--brand-green)] text-[rgb(240,248,255)] border-[var(--brand-green)]'
                          : 'bg-background border-[var(--brand-cream-border)] text-[var(--surface-muted)] hover:border-[var(--brand-green)]/40 hover:text-[var(--brand-green)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference + Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Reference Number <span className="text-[var(--brand-gold)]">*</span></label>
                  <input
                    type="text"
                    placeholder={method === 'GCash' ? '13-digit GCash ref' : method.includes('Bank') ? 'Bank transaction ref' : 'Receipt / OR number'}
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Payment Amount (₱) <span className="text-[var(--brand-gold)]">*</span>
                    {isLocked && <span className="ml-1 text-[var(--brand-gold)] normal-case font-normal">(10% reservation fee)</span>}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={`${inputCls} ${isLocked ? 'bg-muted/30 cursor-not-allowed font-bold text-[var(--brand-green)]' : ''}`}
                    readOnly={isLocked}
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Proof upload */}
              <div className="space-y-1.5">
                <label className={labelCls}>Payment Proof (PNG / JPG)</label>
                <div className="relative border border-dashed border-[var(--brand-gold)]/30 hover:border-[var(--brand-gold)]/60 rounded-xl p-5 text-center transition-all duration-200 bg-background cursor-pointer group">
                  <input type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <UploadCloud className="h-7 w-7 text-[var(--brand-gold)]/50 group-hover:text-[var(--brand-gold)] mx-auto mb-1.5 transition-colors" />
                  <p className="text-xs font-semibold text-[var(--surface-text-dark)] truncate px-4">
                    {fileName || 'Click or drag to upload receipt'}
                  </p>
                  <p className="text-[10px] text-[var(--surface-muted)] mt-1">JPEG, PNG up to 5MB</p>
                </div>
              </div>

              {/* Additional notes */}
              <div className="space-y-1.5">
                <label className={labelCls}>Additional Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any additional context, booking reference, or special instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-4 rounded-xl bg-background border border-[var(--brand-cream-border)] text-sm text-[var(--surface-text-dark)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300 resize-none"
                />
              </div>

              <Button type="submit" className="w-full h-11 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 text-[rgb(240,248,255)] font-bold rounded-xl shadow-sm">
                Submit Payment
              </Button>
            </form>
          </div>
        </div>

        {/* ── PAYMENT CHANNELS SIDEBAR ── */}
        <div className="space-y-4">

          {/* GCash QR placeholder */}
          <div className="bg-card border border-[var(--brand-cream-border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--brand-cream-border)]">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brand-green)]">GCash QR</span>
            </div>
            <div className="p-5 flex flex-col items-center gap-3">
              <div className="w-36 h-36 rounded-xl border-2 border-dashed border-[var(--brand-green)]/20 bg-muted/30 flex items-center justify-center">
                <span className="text-xs font-bold font-mono text-[var(--surface-muted)]">QR dito.</span>
              </div>
              <p className="text-[11px] text-[var(--surface-muted)] text-center leading-relaxed">
                Scan with GCash app.<br />Upload screenshot as proof.
              </p>
            </div>
          </div>

          {/* Bank accounts */}
          <div className="bg-card border border-[var(--brand-cream-border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--brand-cream-border)]">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brand-green)]">Bank Accounts</span>
            </div>
            <div className="px-5 py-4 space-y-4 text-xs">
              <div>
                <p className="font-bold text-[var(--surface-text-dark)]">BDO Savings</p>
                <p className="font-mono text-[var(--brand-green)] font-semibold mt-0.5">00123-456-789</p>
              </div>
              <div className="border-t border-[var(--brand-cream-border)] pt-3">
                <p className="font-bold text-[var(--surface-text-dark)]">BPI Checking</p>
                <p className="font-mono text-[var(--brand-green)] font-semibold mt-0.5">9876-5432-10</p>
              </div>
              <p className="text-[10px] italic text-[var(--surface-muted)] border-t border-[var(--brand-cream-border)] pt-3">
                Account Holder: Marcelo P. Gayeta Funeral Services
              </p>
            </div>
          </div>

          {/* Contact note */}
          <div className="bg-[var(--brand-green)]/5 border border-[var(--brand-green)]/15 rounded-2xl px-5 py-4 text-xs text-[var(--surface-muted)] leading-relaxed">
            <p className="font-bold text-[var(--brand-green)] mb-1">Need help?</p>
            For payment concerns, email us at{' '}
            <a href="mailto:mgayetafuneralhome@gmail.com" className="font-semibold text-[var(--brand-green)] underline underline-offset-2">
              mgayetafuneralhome@gmail.com
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}

export default function BillingPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">
        <section className="py-10 bg-gradient-to-b from-[var(--brand-green)]/5 to-background border-b border-border/40 text-center">
          <div className="mx-auto max-w-4xl px-6">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-[var(--brand-green)] tracking-tight">
              Billing &amp; Payments
            </h1>
          </div>
        </section>
        <Suspense fallback={<div className="py-20 text-center text-sm text-[var(--surface-muted)]">Loading...</div>}>
          <BillingForm />
        </Suspense>
      </main>
    </>
  )
}
