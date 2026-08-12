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
const DOT = {
  position: 'absolute' as const,
  width: 4, height: 4,
  borderRadius: '50%',
  background: '#a98844',
  boxShadow: '31px 0 0 #a98844',
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
      {/* Wall container — cement background */}
      <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 0,
        background: '#d4d4d4',
        padding: '10px 12px',
        borderRadius: 6,
        border: '4px solid #a0a0a0',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
        minWidth: LABEL_W + 12 * 53 + 32,
      }}>
        {rowGroups.map(({ row, slots: rowSlots }) => (
          <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: row < 6 ? 8 : 0 }}>
            {/* Row label — white bg so it reads over cement */}
            <div style={{
              width: LABEL_W, minWidth: LABEL_W, flexShrink: 0,
              background: 'var(--color-card)',
              borderRadius: 4, padding: '4px 10px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-foreground)', whiteSpace: 'nowrap', margin: 0 }}>{ROW_LABELS[row]}</p>
              <p style={{ fontSize: 10, color: 'var(--color-muted-foreground)', margin: 0 }}>{formatPrice(ROW_PRICES[row])}</p>
            </div>

            {/* Slots */}
            {rowSlots.map(slot => {
              const isSelected = selectedId === slot.id

              /* ── AVAILABLE — dark open cavity ── */
              if (slot.status === 'available') {
                return (
                  <button
                    key={slot.id}
                    onClick={() => onSlotClick(slot)}
                    aria-label={`Slot ${slot.slot_code} — available`}
                    style={{
                      width: 45, height: 45, flexShrink: 0,
                      borderRadius: 2, boxSizing: 'border-box',
                      backgroundColor: '#2a2a2a',
                      border: isSelected ? '3px solid #fff' : '3px solid #8e9091',
                      boxShadow: isSelected
                        ? '0 4px 10px rgba(76,175,80,0.6)'
                        : 'inset 0 8px 15px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      transform: isSelected ? 'scale(1.08)' : undefined,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.transform = 'scale(1.08)'
                      el.style.borderColor = '#4CAF50'
                      el.style.boxShadow = '0 4px 10px rgba(76,175,80,0.4)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      if (!isSelected) {
                        el.style.transform = ''
                        el.style.borderColor = '#8e9091'
                        el.style.boxShadow = 'inset 0 8px 15px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.5)'
                      }
                    }}
                  />
                )
              }

              /* ── OCCUPIED — granite slab + CSS cross ── */
              if (slot.status === 'occupied') {
                return (
                  <button
                    key={slot.id}
                    onClick={() => onSlotClick(slot)}
                    aria-label={`Slot ${slot.slot_code} — occupied`}
                    style={{
                      position: 'relative',
                      width: 45, height: 45, flexShrink: 0,
                      borderRadius: 2, boxSizing: 'border-box',
                      backgroundColor: '#5a5c5d',
                      backgroundImage: [
                        'linear-gradient(#d4af37, #d4af37)',
                        'linear-gradient(#d4af37, #d4af37)',
                        'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
                      ].join(', '),
                      backgroundSize: '4px 24px, 18px 4px, 100% 100%',
                      backgroundPosition: 'center 9px, center 15px, center center',
                      backgroundRepeat: 'no-repeat',
                      border: isSelected ? '2px solid #fff' : '1px solid #4a4a4a',
                      boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ ...DOT, top: 4, left: 4 }} />
                    <span style={{ ...DOT, bottom: 4, left: 4 }} />
                  </button>
                )
              }

              /* ── RESERVED — granite slab + RSV plaque ── */
              return (
                <button
                  key={slot.id}
                  onClick={() => onSlotClick(slot)}
                  aria-label={`Slot ${slot.slot_code} — reserved`}
                  style={{
                    position: 'relative',
                    width: 45, height: 45, flexShrink: 0,
                    borderRadius: 2, boxSizing: 'border-box',
                    background: 'linear-gradient(145deg, #7a7c7e, #5a5c5d)',
                    border: isSelected ? '2px solid #fff' : '1px solid #4a4a4a',
                    boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ ...DOT, top: 4, left: 4 }} />
                  <span style={{ ...DOT, bottom: 4, left: 4 }} />
                  <span style={{
                    position: 'relative', zIndex: 2,
                    background: 'linear-gradient(145deg, #d4af37, #aa8222)',
                    color: '#333', fontSize: 8, fontWeight: 800,
                    padding: '2px 4px', borderRadius: 1,
                    border: '1px solid #7a6015', textTransform: 'uppercase',
                    letterSpacing: 0.3, lineHeight: 1.2,
                  }}>RSV</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
