'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type React from 'react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader, EmptyState, Spinner, inputCls } from './admin-primitives'
import { AlertBanner } from '@/components/ui/alert-banner'
import {
  X, Check, AlertTriangle, ChevronLeft,
  ChevronDown, ChevronUp, UserPlus, Landmark,
  Info, Banknote, BookOpen, Wrench, Tag,
} from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { ColumbariumSlot, SlotStatus } from '@/lib/supabase/types'

// ── Constants ─────────────────────────────────────────────────
const ROW_LABELS: Record<number, string> = {
  1: 'Top Level',
  2: 'Eye Level (Upper)',
  3: 'Eye Level (Lower)',
  4: 'Upper Bottom',
  5: 'Lower Bottom',
  6: 'Ground Level',
}

const ROW_PRICES: Record<number, number> = {
  1: 25000, 2: 35000, 3: 25000, 4: 20000, 5: 20000, 6: 20000,
}

function fmtAmt(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

// Helper to get current user info
async function getActorInfo() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const actorName = user
    ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
    : 'Staff'
  return { user, actorName }
}

// ── Niche slot visuals ────────────────────────────────────────
const DOT: React.CSSProperties = {
  position: 'absolute',
  width: 4, height: 4,
  borderRadius: '50%',
  background: '#a98844',
  boxShadow: '31px 0 0 #a98844',
}

function NicheSlot({ slot, isSelected, onClick }: {
  slot: ColumbariumSlot; isSelected: boolean; onClick: () => void
}) {
  const base: React.CSSProperties = {
    width: 45, height: 45,
    borderRadius: 2,
    position: 'relative',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    outline: isSelected ? '3px solid #fff' : 'none',
    outlineOffset: 1,
    zIndex: isSelected ? 10 : undefined,
  }

  if (slot.status === 'available') {
    return (
      <button
        onClick={onClick}
        title={`${slot.slot_code} · Available · ${fmtAmt(Number(slot.price))}`}
        style={{
          ...base,
          backgroundColor: '#2a2a2a',
          border: '3px solid #8e9091',
          boxShadow: 'inset 0 8px 15px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.transform = 'scale(1.08)'
          el.style.borderColor = '#4CAF50'
          el.style.boxShadow = '0 4px 10px rgba(76,175,80,0.4)'
          el.style.zIndex = '10'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.transform = ''
          el.style.borderColor = '#8e9091'
          el.style.boxShadow = 'inset 0 8px 15px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.5)'
          el.style.zIndex = ''
        }}
      />
    )
  }

  if (slot.status === 'occupied') {
    return (
      <button
        onClick={onClick}
        title={`${slot.slot_code} · Occupied${slot.occupant_name ? ` · ${slot.occupant_name}` : ''}`}
        style={{
          ...base,
          cursor: 'default',
          backgroundColor: '#5a5c5d',
          backgroundImage: [
            'linear-gradient(#d4af37, #d4af37)',
            'linear-gradient(#d4af37, #d4af37)',
            'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
          ].join(', '),
          backgroundSize: '4px 24px, 18px 4px, 100% 100%',
          backgroundPosition: 'center 9px, center 15px, center center',
          backgroundRepeat: 'no-repeat',
          border: '1px solid #4a4a4a',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ ...DOT, top: 4, left: 4 }} />
        <span style={{ ...DOT, bottom: 4, left: 4 }} />
      </button>
    )
  }

  // Reserved
  return (
    <button
      onClick={onClick}
      title={`${slot.slot_code} · Reserved`}
      style={{
        ...base,
        cursor: 'default',
        background: 'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
        border: '1px solid #4a4a4a',
        boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ ...DOT, top: 4, left: 4 }} />
      <span style={{ ...DOT, bottom: 4, left: 4 }} />
      <span style={{
        background: 'linear-gradient(145deg, #d4af37, #aa8222)',
        color: '#333',
        fontSize: 8, fontWeight: 700,
        padding: '2px 4px', borderRadius: 1,
        border: '1px solid #7a6015',
        textTransform: 'uppercase',
        zIndex: 2, lineHeight: 1.2,
        letterSpacing: 0.3,
        position: 'relative',
      }}>RSV</span>
    </button>
  )
}

// ── 2-Step Status Change Modal ────────────────────────────────
function StatusChangeModal({
  slot,
  newStatus,
  onClose,
  onConfirm,
}: {
  slot: ColumbariumSlot
  newStatus: SlotStatus
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  const STATUS_STYLES: Record<SlotStatus, string> = {
    available: 'text-primary bg-primary/10 border-primary/25',
    reserved:  'text-muted-foreground bg-muted/40 border-border',
    occupied:  'text-destructive bg-destructive/10 border-destructive/25',
  }

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-bold text-sm text-foreground">Update Slot Status</p>
            <p className="text-[10px] text-muted-foreground">Step {step} of 2</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === 1 ? (
            <>
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">Slot</span>
                  <span className="font-mono font-bold text-foreground">{slot.slot_code}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">Level</span>
                  <span className="font-semibold text-foreground">{ROW_LABELS[slot.row_number]}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground font-semibold">Current</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[slot.status]}`}>
                    {slot.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">Change to</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[newStatus]}`}>
                    {newStatus}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Confirm Change
                </p>
                <p className="text-sm text-foreground">
                  Mark slot <span className="font-mono font-bold">{slot.slot_code}</span> as{' '}
                  <span className={`font-bold ${STATUS_STYLES[newStatus].split(' ')[0]}`}>{newStatus}</span>?
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Shared discount/price UI ──────────────────────────────────
function DiscountBlock({
  basePrice,
  seniorPwd,
  onToggle,
}: {
  basePrice: number
  seniorPwd: boolean
  onToggle: (v: boolean) => void
}) {
  const discount    = seniorPwd ? Math.round(basePrice * 0.2 * 100) / 100 : 0
  const finalAmount = basePrice - discount

  return (
    <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 space-y-2">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            checked={seniorPwd}
            onChange={e => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="h-5 w-5 rounded border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
            {seniorPwd && (
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Senior Citizen / PWD — 20% Discount</p>
          <p className="text-[10px] text-muted-foreground">Check if client has a valid Senior ID or PWD card</p>
        </div>
      </label>
      {seniorPwd && (
        <div className="bg-card border border-border/60 rounded-xl p-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Original</span>
            <span className="font-mono">{fmtAmt(basePrice)}</span>
          </div>
          <div className="flex justify-between text-primary">
            <span>20% Discount</span>
            <span className="font-mono">− {fmtAmt(discount)}</span>
          </div>
          <div className="flex justify-between font-bold text-primary border-t border-border/40 pt-1">
            <span>Amount Payable</span>
            <span className="font-mono">{fmtAmt(finalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalHeader({
  title, sub, onBack, onClose,
}: {
  title: string; sub: string; onBack?: () => void; onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <Banknote className="h-4 w-4 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

// ── ReserveWalkInModal ────────────────────────────────────────
function ReserveWalkInModal({
  slot,
  onClose,
  onSuccess,
}: {
  slot: ColumbariumSlot
  onClose: () => void
  onSuccess: (updatedSlot: ColumbariumSlot) => void
}) {
  const supabase = createClient()
  const [step,      setStep]      = useState<'form' | 'review'>('form')
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [seniorPwd, setSeniorPwd] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const basePrice   = ROW_PRICES[slot.row_number] ?? 0
  const discount    = seniorPwd ? Math.round(basePrice * 0.2 * 100) / 100 : 0
  const finalAmount = basePrice - discount

  const handleNext = () => {
    setError('')
    if (!name.trim())  { setError('Client name is required.');  return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    setStep('review')
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const { user, actorName } = await getActorInfo()
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('email', email).maybeSingle()

      const notes = seniorPwd
        ? `Senior/PWD 20% discount applied. Original: ${fmtAmt(basePrice)}`
        : null

      const { error: payErr, data: inserted } = await supabase.from('payments').insert({
        user_id:      profile?.id ?? null,
        guest_name:   profile ? null : name.trim(),
        guest_email:  profile ? null : (email.trim() || null),
        guest_phone:  phone.trim(),
        product_type: 'columbarium',
        product_ref:  slot.slot_code,
        method:       'cash',
        amount:       finalAmount,
        status:       'approved',
        notes,
        approved_by:  user?.id ?? null,
        approved_at:  new Date().toISOString(),
      }).select('id').single()

      if (payErr) { setError(payErr.message); setStep('form'); setLoading(false); return }

      const now = new Date().toISOString()
      const { error: slotErr, data: updatedSlot } = await supabase
        .from('columbarium_slots')
        .update({ status: 'reserved', reserved_at: now })
        .eq('id', slot.id)
        .select()
        .single()

      if (slotErr) { setError(slotErr.message); setStep('form'); setLoading(false); return }

      await logActivity({
        category:     'log',
        event_type:   'slot_reserved_walkin',
        entity_table: 'columbarium_slots',
        entity_id:    slot.id,
        actor_id:     user?.id,
        actor_name:   actorName,
        message:      `${actorName} recorded walk-in reservation for ${name} — slot ${slot.slot_code} — ${fmtAmt(finalAmount)}`,
        metadata: {
          client_name:  name,
          slot_code:    slot.slot_code,
          level:        ROW_LABELS[slot.row_number],
          amount:       finalAmount,
          senior_pwd:   seniorPwd,
          payment_id:   inserted?.id,
        },
      })

      setLoading(false)
      onSuccess(updatedSlot as ColumbariumSlot)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <ModalHeader
          title={step === 'form' ? 'Reserve Walk-in' : 'Review Reservation'}
          sub={step === 'form' ? 'Step 1 of 2 — Client details' : 'Step 2 of 2 — Confirm'}
          onBack={step === 'review' ? () => setStep('form') : undefined}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          {step === 'form' ? (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Client Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Juan Dela Cruz" className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="09XX XXX XXXX" className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address{' '}
                  <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="juan@example.com" className={inputCls}
                />
              </div>

              {/* Read-only slot info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Slot Code
                  </label>
                  <input
                    type="text" value={slot.slot_code} readOnly
                    className={`${inputCls} opacity-60 cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Level
                  </label>
                  <input
                    type="text" value={ROW_LABELS[slot.row_number]} readOnly
                    className={`${inputCls} opacity-60 cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Fixed price */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Fixed Price</p>
                <p className="text-lg font-bold text-primary">{fmtAmt(basePrice)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {ROW_LABELS[slot.row_number]} — price is fixed and non-editable
                </p>
              </div>

              <DiscountBlock
                basePrice={basePrice}
                seniorPwd={seniorPwd}
                onToggle={setSeniorPwd}
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Reservation Summary
                  </p>
                </div>
                <div className="divide-y divide-border/40">
                  <ReviewRow label="Client"    value={name} />
                  <ReviewRow label="Phone"     value={phone} />
                  {email && <ReviewRow label="Email" value={email} />}
                  <ReviewRow label="Slot Code" value={slot.slot_code} />
                  <ReviewRow label="Level"     value={ROW_LABELS[slot.row_number]} />
                  <ReviewRow label="Method"    value="Cash" />
                  {seniorPwd && (
                    <>
                      <div className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">Original Price</span>
                        <span className="font-mono text-muted-foreground line-through">{fmtAmt(basePrice)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-xs text-primary">
                        <span>Senior/PWD Discount (20%)</span>
                        <span className="font-mono">− {fmtAmt(discount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between px-4 py-3 text-sm font-bold bg-primary/[0.04]">
                    <span className="text-primary/70 uppercase tracking-wider text-[10px] font-black">
                      Amount Paid (Cash)
                    </span>
                    <span className="text-primary">{fmtAmt(finalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-muted/30 border border-border/60 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  This will record an approved cash payment and mark slot{' '}
                  <span className="font-mono font-bold">{slot.slot_code}</span> as{' '}
                  <span className="font-bold text-muted-foreground">Reserved</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
          {step === 'form' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Review →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('form')}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? 'Recording…' : 'Confirm & Reserve'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── OccupyWalkInModal ─────────────────────────────────────────
function OccupyWalkInModal({
  slot,
  onClose,
  onSuccess,
}: {
  slot: ColumbariumSlot
  onClose: () => void
  onSuccess: (updatedSlot: ColumbariumSlot) => void
}) {
  const supabase = createClient()
  const [step,          setStep]          = useState<'form' | 'review'>('form')
  const [name,          setName]          = useState('')
  const [phone,         setPhone]         = useState('')
  const [email,         setEmail]         = useState('')
  const [occupantName,  setOccupantName]  = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [seniorPwd,     setSeniorPwd]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  const basePrice   = ROW_PRICES[slot.row_number] ?? 0
  const discount    = seniorPwd ? Math.round(basePrice * 0.2 * 100) / 100 : 0
  const finalAmount = basePrice - discount

  const handleNext = () => {
    setError('')
    if (!name.trim())         { setError('Client name is required.');    return }
    if (!phone.trim())        { setError('Phone number is required.');   return }
    if (!occupantName.trim()) { setError('Occupant name is required.');  return }
    setStep('review')
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const { user, actorName } = await getActorInfo()
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('email', email).maybeSingle()

      const notes = seniorPwd
        ? `Senior/PWD 20% discount applied. Original: ${fmtAmt(basePrice)}`
        : null

      const { error: payErr, data: inserted } = await supabase.from('payments').insert({
        user_id:      profile?.id ?? null,
        guest_name:   profile ? null : name.trim(),
        guest_email:  profile ? null : (email.trim() || null),
        guest_phone:  phone.trim(),
        product_type: 'columbarium',
        product_ref:  slot.slot_code,
        method:       'cash',
        amount:       finalAmount,
        status:       'approved',
        notes,
        approved_by:  user?.id ?? null,
        approved_at:  new Date().toISOString(),
      }).select('id').single()

      if (payErr) { setError(payErr.message); setStep('form'); setLoading(false); return }

      const { error: slotErr, data: updatedSlot } = await supabase
        .from('columbarium_slots')
        .update({
          status:               'occupied',
          occupant_name:        occupantName.trim(),
          occupant_birth_date:  birthDate || null,
          occupant_death_date:  deathDate || null,
        })
        .eq('id', slot.id)
        .select()
        .single()

      if (slotErr) { setError(slotErr.message); setStep('form'); setLoading(false); return }

      await logActivity({
        category:     'log',
        event_type:   'slot_occupied_walkin',
        entity_table: 'columbarium_slots',
        entity_id:    slot.id,
        actor_id:     user?.id,
        actor_name:   actorName,
        message:      `${actorName} recorded walk-in occupation for ${name} — slot ${slot.slot_code} (${occupantName}) — ${fmtAmt(finalAmount)}`,
        metadata: {
          client_name:    name,
          slot_code:      slot.slot_code,
          level:          ROW_LABELS[slot.row_number],
          occupant_name:  occupantName,
          amount:         finalAmount,
          senior_pwd:     seniorPwd,
          payment_id:     inserted?.id,
        },
      })

      setLoading(false)
      onSuccess(updatedSlot as ColumbariumSlot)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <ModalHeader
          title={step === 'form' ? 'Mark as Occupied (Walk-in)' : 'Review Occupation'}
          sub={step === 'form' ? 'Step 1 of 2 — Client & occupant details' : 'Step 2 of 2 — Confirm'}
          onBack={step === 'review' ? () => setStep('form') : undefined}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          {step === 'form' ? (
            <>
              {/* Client info */}
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Client (Payer)
              </p>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Client Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Juan Dela Cruz" className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="09XX XXX XXXX" className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address{' '}
                  <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="juan@example.com" className={inputCls}
                />
              </div>

              {/* Read-only slot info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Slot Code
                  </label>
                  <input
                    type="text" value={slot.slot_code} readOnly
                    className={`${inputCls} opacity-60 cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Level
                  </label>
                  <input
                    type="text" value={ROW_LABELS[slot.row_number]} readOnly
                    className={`${inputCls} opacity-60 cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Occupant info */}
              <div className="h-px bg-border/50 my-1" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Occupant (Deceased)
              </p>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Occupant Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={occupantName} onChange={e => setOccupantName(e.target.value)}
                  placeholder="Full name of the deceased" className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Birth Date{' '}
                    <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Death Date{' '}
                    <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Fixed price */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Fixed Price</p>
                <p className="text-lg font-bold text-primary">{fmtAmt(basePrice)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {ROW_LABELS[slot.row_number]} — price is fixed and non-editable
                </p>
              </div>

              <DiscountBlock
                basePrice={basePrice}
                seniorPwd={seniorPwd}
                onToggle={setSeniorPwd}
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Occupation Summary
                  </p>
                </div>
                <div className="divide-y divide-border/40">
                  <ReviewRow label="Client"        value={name} />
                  <ReviewRow label="Phone"         value={phone} />
                  {email && <ReviewRow label="Email" value={email} />}
                  <ReviewRow label="Slot Code"     value={slot.slot_code} />
                  <ReviewRow label="Level"         value={ROW_LABELS[slot.row_number]} />
                  <ReviewRow label="Occupant"      value={occupantName} />
                  {birthDate && <ReviewRow label="Birth Date" value={birthDate} />}
                  {deathDate && <ReviewRow label="Death Date" value={deathDate} />}
                  <ReviewRow label="Method"        value="Cash" />
                  {seniorPwd && (
                    <>
                      <div className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">Original Price</span>
                        <span className="font-mono text-muted-foreground line-through">{fmtAmt(basePrice)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-xs text-primary">
                        <span>Senior/PWD Discount (20%)</span>
                        <span className="font-mono">− {fmtAmt(discount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between px-4 py-3 text-sm font-bold bg-primary/[0.04]">
                    <span className="text-primary/70 uppercase tracking-wider text-[10px] font-black">
                      Amount Paid (Cash)
                    </span>
                    <span className="text-primary">{fmtAmt(finalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-muted/30 border border-border/60 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  This will record an approved cash payment and mark slot{' '}
                  <span className="font-mono font-bold">{slot.slot_code}</span> as{' '}
                  <span className="font-bold text-destructive">Occupied</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
          {step === 'form' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Review →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('form')}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? 'Recording…' : 'Confirm & Occupy'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── SlotPanel — context-aware, mode-split ─────────────────────
type SlotPanelMode = 'view' | 'reserve' | 'occupy'

function SlotPanel({
  slot,
  onClose,
  onStatusChange,
  onSlotUpdated,
}: {
  slot: ColumbariumSlot
  onClose: () => void
  onStatusChange: (newStatus: SlotStatus) => void
  onSlotUpdated: (updated: ColumbariumSlot) => void
}) {
  const [mode, setMode] = useState<SlotPanelMode>('view')

  const STATUS_OPTS = [
    {
      value: 'available' as SlotStatus, label: 'Available',
      active: 'bg-primary text-primary-foreground border-primary',
      idle: 'border-primary/30 text-primary hover:bg-primary/10',
    },
    {
      value: 'reserved' as SlotStatus, label: 'Reserved',
      active: 'bg-muted-foreground text-background border-muted-foreground',
      idle: 'border-border text-muted-foreground hover:bg-muted/40',
    },
    {
      value: 'occupied' as SlotStatus, label: 'Occupied',
      active: 'bg-destructive text-destructive-foreground border-destructive',
      idle: 'border-destructive/30 text-destructive hover:bg-destructive/10',
    },
  ]

  // When a sub-modal is open, render it instead via portals — keep panel underneath
  if (mode === 'reserve') {
    return (
      <ReserveWalkInModal
        slot={slot}
        onClose={() => setMode('view')}
        onSuccess={updated => { onSlotUpdated(updated); onClose() }}
      />
    )
  }

  if (mode === 'occupy') {
    return (
      <OccupyWalkInModal
        slot={slot}
        onClose={() => setMode('view')}
        onSuccess={updated => { onSlotUpdated(updated); onClose() }}
      />
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-mono font-bold text-xl text-foreground">{slot.slot_code}</p>
            <p className="text-xs text-muted-foreground">{ROW_LABELS[slot.row_number]}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Slot info rows */}
          <div className="divide-y divide-border/50 text-sm">
            {[
              { label: 'Level',  value: ROW_LABELS[slot.row_number] },
              { label: 'Column', value: `${slot.col_number} of 12` },
              { label: 'Price',  value: fmtAmt(Number(slot.price)), bold: true },
              ...(slot.occupant_name
                ? [{ label: 'Occupant', value: slot.occupant_name }]
                : []),
              ...(slot.occupant_birth_date
                ? [{ label: 'Born', value: slot.occupant_birth_date }]
                : []),
              ...(slot.occupant_death_date
                ? [{ label: 'Died', value: slot.occupant_death_date }]
                : []),
              ...(slot.reserved_at
                ? [{ label: 'Reserved', value: new Date(slot.reserved_at).toLocaleString() }]
                : []),
            ].map(({ label, value, bold }) => (
              <div key={label} className="flex justify-between py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <span className={`text-sm ${bold ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Available slot: primary CTAs ── */}
          {slot.status === 'available' && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Walk-in Actions
              </p>
              <button
                onClick={() => setMode('reserve')}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Reserve (Walk-in)
              </button>
              <button
                onClick={() => setMode('occupy')}
              className="w-full h-10 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all flex items-center justify-center gap-2"
              >
                <Landmark className="h-4 w-4" />
                Mark as Occupied
              </button>
            </div>
          )}

          {/* ── Reserved slot: primary CTA ── */}
          {slot.status === 'reserved' && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Walk-in Actions
              </p>
              <button
                onClick={() => setMode('occupy')}
                className="w-full h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
              >
                <Landmark className="h-4 w-4" />
                Mark as Occupied (Walk-in)
              </button>
            </div>
          )}

          {/* ── Occupied slot: read-only badge ── */}
          {slot.status === 'occupied' && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <Info className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-foreground">
                This slot is <span className="font-bold text-destructive">Occupied</span>. Full payment has been received. Use status override below to correct if needed.
              </p>
            </div>
          )}

          {/* Status override */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Manual Status Override
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTS.map(opt => (
                <button
                  key={opt.value}
                  disabled={slot.status === opt.value}
                  onClick={() => onStatusChange(opt.value)}
                  className={`h-9 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    slot.status === opt.value
                      ? opt.active
                      : `bg-background ${opt.idle}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              A confirmation step will appear before any change is applied.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Legend — graphical mini-niches ───────────────────────────
function NicheLegend() {
  return (
    <div className="flex flex-wrap items-start gap-5 text-[11px] font-semibold text-muted-foreground">

      {/* Available */}
      <span className="flex items-center gap-2.5">
        <span
          style={{
            display: 'inline-block',
            width: 22, height: 22,
            borderRadius: 2,
            flexShrink: 0,
            backgroundColor: '#2a2a2a',
            border: '2px solid #8e9091',
            boxShadow: 'inset 0 5px 10px rgba(0,0,0,0.8), inset 0 1px 3px rgba(0,0,0,0.5)',
          }}
        />
        <span>
          <span className="block text-foreground">Available</span>
          <span className="block font-normal text-[10px]">Click to reserve or mark occupied</span>
        </span>
      </span>

      {/* Reserved */}
      <span className="flex items-center gap-2.5">
        <span
          style={{
            display: 'inline-flex',
            width: 22, height: 22,
            borderRadius: 2,
            flexShrink: 0,
            background: 'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
            border: '1px solid #4a4a4a',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Corner dots */}
          <span style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#a98844', boxShadow: '14px 0 0 #a98844', top: 3, left: 3 }} />
          <span style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#a98844', boxShadow: '14px 0 0 #a98844', bottom: 3, left: 3 }} />
          <span style={{
            background: 'linear-gradient(145deg, #d4af37, #aa8222)',
            color: '#333',
            fontSize: 6, fontWeight: 800,
            padding: '1px 3px', borderRadius: 1,
            border: '1px solid #7a6015',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            letterSpacing: 0.3,
            position: 'relative',
            zIndex: 2,
          }}>RSV</span>
        </span>
        <span>
          <span className="block text-foreground">Reserved</span>
          <span className="block font-normal text-[10px]">Walk-in reserved, awaiting full payment</span>
        </span>
      </span>

      {/* Occupied */}
      <span className="flex items-center gap-2.5">
        <span
          style={{
            display: 'inline-block',
            width: 22, height: 22,
            borderRadius: 2,
            flexShrink: 0,
            position: 'relative',
            backgroundColor: '#5a5c5d',
            backgroundImage: [
              'linear-gradient(#d4af37, #d4af37)',
              'linear-gradient(#d4af37, #d4af37)',
              'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
            ].join(', '),
            backgroundSize: '3px 14px, 11px 3px, 100% 100%',
            backgroundPosition: 'center 4px, center 9px, center center',
            backgroundRepeat: 'no-repeat',
            border: '1px solid #4a4a4a',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#a98844', boxShadow: '14px 0 0 #a98844', top: 3, left: 3 }} />
          <span style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#a98844', boxShadow: '14px 0 0 #a98844', bottom: 3, left: 3 }} />
        </span>
        <span>
          <span className="block text-foreground">Occupied</span>
          <span className="block font-normal text-[10px]">Full payment received</span>
        </span>
      </span>
    </div>
  )
}

// ── Staff Operations Guide ─────────────────────────────────────
const GUIDE_STEPS = [
  {
    icon: UserPlus,
    title: 'Walk-in Reservation',
    desc: 'Click any available (dark) slot → "Reserve (Walk-in)" → fill client details → confirm. Slot auto-updates to Reserved.',
  },
  {
    icon: Landmark,
    title: 'Walk-in Occupation (Full Payment)',
    desc: 'Click any available or reserved slot → "Mark as Occupied" → fill client + occupant details → confirm. Slot auto-updates to Occupied.',
  },
  {
    icon: Wrench,
    title: 'Status Manual Override',
    desc: 'Use the status buttons in the slot panel to manually change any slot status without recording a payment (e.g. cancellations, corrections).',
  },
  {
    icon: Tag,
    title: 'Pricing',
    desc: 'Prices are fixed per level and cannot be edited here. Senior/PWD 20% discount is available.',
  },
]

function StaffGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Staff Operations Guide</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="border-t border-border/60 divide-y divide-border/40">
          {GUIDE_STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={idx} className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {idx + 1}. {step.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Pricing legend card ───────────────────────────────────────
function PricingCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level Pricing</p>
      </div>
      <div className="divide-y divide-border/40">
        {Object.entries(ROW_LABELS).map(([row, label]) => (
          <div key={row} className="flex items-center justify-between px-5 py-2.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-bold text-foreground font-mono">{fmtAmt(ROW_PRICES[Number(row)])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export function ColumbariumTab() {
  const supabase = createClient()
  const [rows,    setRows]    = useState<ColumbariumSlot[]>([])
  const [loading, setLoading] = useState(true)

  const [selected,      setSelected]      = useState<ColumbariumSlot | null>(null)
  const [pendingStatus, setPendingStatus] = useState<SlotStatus | null>(null)

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('columbarium_slots')
      .select('*')
      .order('row_number')
      .order('col_number')
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSlots() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the status override (no payment recorded)
  const applyStatusChange = async () => {
    if (!selected || !pendingStatus) return
    const { user, actorName } = await getActorInfo()

    const { error } = await supabase
      .from('columbarium_slots')
      .update({ status: pendingStatus })
      .eq('id', selected.id)

    if (!error) {
      const updated = { ...selected, status: pendingStatus }
      setRows(r => r.map(s => s.id === selected.id ? updated : s))
      setSelected(updated)
      await logActivity({
        category:     'log',
        event_type:   `slot_${pendingStatus}`,
        entity_table: 'columbarium_slots',
        entity_id:    selected.id,
        actor_id:     user?.id,
        actor_name:   actorName,
        message:      `${actorName} marked slot ${selected.slot_code} as ${pendingStatus}`,
        metadata:     { slot_code: selected.slot_code, status: pendingStatus },
      })
    }
    setPendingStatus(null)
  }

  const counts = {
    available: rows.filter(s => s.status === 'available').length,
    reserved:  rows.filter(s => s.status === 'reserved').length,
    occupied:  rows.filter(s => s.status === 'occupied').length,
  }
  const rowGroups = Array.from({ length: 6 }, (_, i) => ({
    row: i + 1,
    slots: rows.filter(s => s.row_number === i + 1),
  }))

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {/* Header — no top-level cash button */}
      <SectionHeader
        title="Columbarium"
        sub={`${rows.length} total · ${counts.available} available · ${counts.reserved} reserved · ${counts.occupied} occupied`}
      />

      {/* Staff guide (collapsed by default) */}
      <StaffGuide />

      {/* Level pricing */}
      <PricingCard />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Available', count: counts.available, color: 'text-primary',   bg: 'bg-primary/10' },
          { label: 'Reserved',  count: counts.reserved,  color: 'text-muted-foreground', bg: 'bg-muted/20' },
          { label: 'Occupied',  count: counts.occupied,  color: 'text-destructive',   bg: 'bg-destructive/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Graphical legend */}
      <NicheLegend />

      {/* Grid */}
      {rows.length === 0 ? (
        <EmptyState message="No slots found. Run migration to seed the grid." />
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="border-separate border-spacing-0"
              style={{ minWidth: 160 + 12 * 53 }}
            >
              <tbody>
                {rowGroups.map(({ row, slots }) => (
                  <tr key={row}>
                    <td
                      style={{
                        position: 'sticky', left: 0, zIndex: 10,
                        width: 148, minWidth: 148,
                        background: 'var(--color-card)',
                      }}
                      className={`px-4 py-2 align-middle border-r border-border ${row < 6 ? 'border-b border-border/30' : ''}`}
                    >
                      <p className="text-[11px] font-bold text-foreground whitespace-nowrap">
                        {ROW_LABELS[row]}
                      </p>
                      <p className="text-[10px] text-primary font-semibold mt-0.5">
                        {fmtAmt(ROW_PRICES[row])}
                      </p>
                    </td>
                    <td colSpan={12} className="p-0">
                      <div
                        className="flex gap-[6px] px-[10px] py-[8px]"
                        style={{ background: '#c8c8c8', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)' }}
                      >
                        {slots.map(slot => (
                          <NicheSlot
                            key={slot.id}
                            slot={slot}
                            isSelected={selected?.id === slot.id}
                            onClick={() => setSelected(s => s?.id === slot.id ? null : slot)}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slot detail panel (with sub-modal support) */}
      {selected && !pendingStatus && (
        <SlotPanel
          slot={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(newStatus) => setPendingStatus(newStatus)}
          onSlotUpdated={(updated) => {
            setRows(r => r.map(s => s.id === updated.id ? updated : s))
            setSelected(null)
          }}
        />
      )}

      {/* 2-step status override confirm */}
      {selected && pendingStatus && (
        <StatusChangeModal
          slot={selected}
          newStatus={pendingStatus}
          onClose={() => setPendingStatus(null)}
          onConfirm={applyStatusChange}
        />
      )}
    </div>
  )
}
