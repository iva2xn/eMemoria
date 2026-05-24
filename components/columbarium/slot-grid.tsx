// Pure display — renders the columbarium grid table.
// All state lives in the page; this just renders and fires callbacks.

import type { ColumbariumSlot } from '@/lib/supabase/types'

export const ROW_LABELS: Record<number, string> = {
  1: 'Top Level',
  2: 'Eye Level (Upper)',
  3: 'Eye Level (Lower)',
  4: 'Upper Bottom',
  5: 'Lower Bottom',
  6: 'Ground Level',
}

export const ROW_PRICES: Record<number, number> = {
  1: 25000, 2: 35000, 3: 25000, 4: 20000, 5: 20000, 6: 20000,
}

export function formatPrice(p: number) {
  return '₱' + p.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

const LABEL_W = 140

function slotColor(status: string) {
  return status === 'available'
    ? 'bg-[#4CAF50] hover:bg-[#43a047] cursor-pointer'
    : status === 'reserved'
      ? 'bg-[#FFC107] hover:bg-[#ffb300] cursor-pointer'
      : 'bg-[#F44336] cursor-default'
}

interface SlotGridProps {
  slots: ColumbariumSlot[]
  selectedId: string | null
  onSlotClick: (slot: ColumbariumSlot) => void
}

export function SlotGrid({ slots, selectedId, onSlotClick }: SlotGridProps) {
  const rowGroups = Array.from({ length: 6 }, (_, i) => ({
    row: i + 1,
    slots: slots.filter(s => s.row_number === i + 1),
  }))

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0" style={{ minWidth: LABEL_W + 12 * 44 + 32 }}>
        <tbody>
          {rowGroups.map(({ row, slots: rowSlots }) => {
            const isLast = row === 6
            return (
              <tr key={row}>
                <td
                  style={{ position: 'sticky', left: 0, zIndex: 10, width: LABEL_W, minWidth: LABEL_W, background: 'var(--color-card)' }}
                  className={`px-4 py-3 align-middle border-r border-border ${!isLast ? 'border-b border-border' : ''}`}
                >
                  <p className="text-[11px] font-bold text-foreground leading-tight whitespace-nowrap">{ROW_LABELS[row]}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5 whitespace-nowrap">{formatPrice(ROW_PRICES[row])}</p>
                </td>
                {rowSlots.map(slot => (
                  <td key={slot.id} className={`p-1 ${!isLast ? 'border-b border-border' : ''}`}>
                    <button
                      disabled={slot.status === 'occupied'}
                      onClick={() => onSlotClick(slot)}
                      className={`w-10 h-10 rounded border border-[#2c312c]/20 transition-all duration-150 flex items-center justify-center ${slotColor(slot.status)} ${selectedId === slot.id ? 'ring-2 ring-black ring-offset-1' : ''}`}
                      aria-label={`Slot ${slot.slot_code} — ${slot.status}`}
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
