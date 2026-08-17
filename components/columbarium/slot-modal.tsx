// Slot detail modal — shown when a user clicks a slot on the public page.
// Price is fixed per level and non-editable — it is displayed for information
// only, and the billing page enforces it server-side.

import { X, ArrowRight, Phone, Lock } from 'lucide-react'
import { ROW_LABELS, ROW_PRICES, formatPrice } from './slot-grid'
import type { ColumbariumSlot } from '@/lib/supabase/types'

interface SlotModalProps {
  slot: ColumbariumSlot
  onClose: () => void
}

export function SlotModal({ slot, onClose }: SlotModalProps) {
  // Always use the canonical row price — ignore any value from the DB row
  // to prevent a stale/manual price from being shown to the client.
  const fixedPrice = ROW_PRICES[slot.row_number] ?? Number(slot.price)
  const reservationFee = Math.round(fixedPrice * 0.1)

  return (
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
            <p className="font-mono font-bold text-lg text-foreground">{slot.slot_code}</p>
            <p className="text-[11px] text-muted-foreground">{ROW_LABELS[slot.row_number]}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
            slot.status === 'available'
              ? 'bg-primary/10 border-primary/25 text-primary'
              : slot.status === 'reserved'
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-700'
              : 'bg-rose-400/10 border-rose-400/25 text-rose-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              slot.status === 'available' ? 'bg-primary'
              : slot.status === 'reserved' ? 'bg-amber-400'
              : 'bg-rose-400'
            }`} />
            {slot.status}
          </span>

          {/* Details */}
          <div className="divide-y divide-border text-xs">
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Level</span>
              <span className="font-medium text-foreground">{ROW_LABELS[slot.row_number]}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Column</span>
              <span className="font-mono font-medium text-foreground">{slot.col_number} of 12</span>
            </div>

            {/* Fixed price — marked with a lock icon to signal non-editable */}
            <div className="flex justify-between py-2.5 items-center">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                Full Price <Lock className="h-2.5 w-2.5 opacity-50" />
              </span>
              <span className="font-serif font-bold text-base text-foreground">{formatPrice(fixedPrice)}</span>
            </div>
            <div className="flex justify-between py-2.5 items-center">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                Reservation Fee <Lock className="h-2.5 w-2.5 opacity-50" />
              </span>
              <span className="font-bold text-primary">{formatPrice(reservationFee)}</span>
            </div>

            {slot.occupant_name && (
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Occupant</span>
                <span className="font-medium text-foreground">{slot.occupant_name}</span>
              </div>
            )}
          </div>

          {/* Fixed-price note */}
          {slot.status === 'available' && (
            <p className="text-[10px] text-muted-foreground bg-muted/40 border border-border/60 rounded-xl px-3 py-2 leading-relaxed">
              Prices are fixed per level and cannot be changed. A <span className="font-semibold text-foreground">10% reservation fee</span> is collected upfront.
            </p>
          )}

          {/* Status messages + CTAs */}
          {slot.status === 'occupied' && (
            <p className="text-[11px] text-rose-600 bg-rose-400/8 border border-rose-400/20 rounded-xl p-3 font-medium">
              This slot is currently occupied and unavailable.
            </p>
          )}
          {slot.status === 'reserved' && (
            <p className="text-[11px] text-amber-700 bg-amber-400/8 border border-amber-400/20 rounded-xl p-3 font-medium">
              This slot is reserved and pending confirmation.
            </p>
          )}
          {slot.status === 'available' && (
            <div className="space-y-2 pt-1">
              <a
                href={`/billing?product=columbarium&slot=${slot.slot_code}&level=${encodeURIComponent(ROW_LABELS[slot.row_number])}&price=${fixedPrice}`}
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
              >
                Reserve — {formatPrice(reservationFee)} <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={`/contact?slot=${slot.slot_code}&action=inquire`}
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-primary/25 hover:border-primary/50 hover:bg-primary/5 text-primary text-sm font-bold transition-colors"
              >
                <Phone className="h-3.5 w-3.5" /> Inquire
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
