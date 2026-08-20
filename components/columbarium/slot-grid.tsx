// Pure display — renders the columbarium grid.
// Uses CSS custom properties so it automatically adapts to light/dark mode.

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

// ── Individual slot visuals ───────────────────────────────────
interface SlotCellProps {
  slot: ColumbariumSlot
  isSelected: boolean
  onSlotClick: (slot: ColumbariumSlot) => void
}

function SlotCell({ slot, isSelected, onSlotClick }: SlotCellProps) {
  const base: React.CSSProperties = {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 3,
    boxSizing: 'border-box',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.15s, box-shadow 0.15s',
  }

  if (slot.status === 'available') {
    return (
      <button
        onClick={() => onSlotClick(slot)}
        aria-label={`Slot ${slot.slot_code} — available`}
        title={`${slot.slot_code} · Available · ${formatPrice(ROW_PRICES[slot.row_number])}`}
        style={{
          ...base,
          backgroundColor: 'color-mix(in srgb, var(--color-background) 60%, #111 40%)',
          border: isSelected
            ? '2px solid var(--color-primary)'
            : '2px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
          boxShadow: isSelected
            ? '0 0 0 2px color-mix(in srgb, var(--color-primary) 30%, transparent), inset 0 6px 12px rgba(0,0,0,0.5)'
            : 'inset 0 6px 12px rgba(0,0,0,0.5)',
          transform: isSelected ? 'scale(1.08)' : undefined,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.transform = 'scale(1.08)'
          el.style.borderColor = 'var(--color-primary)'
          el.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          if (!isSelected) {
            el.style.transform = ''
            el.style.borderColor = 'color-mix(in srgb, var(--color-border) 80%, transparent)'
            el.style.boxShadow = 'inset 0 6px 12px rgba(0,0,0,0.5)'
          }
        }}
      />
    )
  }

  if (slot.status === 'occupied') {
    return (
      <button
        onClick={() => onSlotClick(slot)}
        aria-label={`Slot ${slot.slot_code} — occupied`}
        title={`${slot.slot_code} · Occupied${slot.occupant_name ? ` · ${slot.occupant_name}` : ''}`}
        style={{
          ...base,
          // Granite slab look
          backgroundColor: '#5a5c5d',
          backgroundImage: [
            // Vertical bar of cross
            'linear-gradient(#d4af37, #d4af37)',
            // Horizontal bar of cross
            'linear-gradient(#d4af37, #d4af37)',
            // Base granite gradient
            'linear-gradient(145deg, #7a7c7e, #4a4c4d)',
          ].join(', '),
          backgroundSize: '3px 22px, 16px 3px, 100% 100%',
          backgroundPosition: 'center 8px, center 14px, center',
          backgroundRepeat: 'no-repeat',
          border: isSelected ? '2px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.4)',
          boxShadow: '1px 2px 4px rgba(0,0,0,0.35)',
        }}
      />
    )
  }

  // Reserved
  return (
    <button
      onClick={() => onSlotClick(slot)}
      aria-label={`Slot ${slot.slot_code} — reserved`}
      title={`${slot.slot_code} · Reserved`}
      style={{
        ...base,
        background: 'linear-gradient(145deg, #7a7c7e, #4a4c4d)',
        border: isSelected ? '2px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.4)',
        boxShadow: '1px 2px 4px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Gold RSV plaque */}
      <span style={{
        background: 'linear-gradient(145deg, #d4af37, #aa8222)',
        color: '#2a1a00',
        fontSize: 7,
        fontWeight: 800,
        padding: '2px 4px',
        borderRadius: 2,
        border: '1px solid #7a6015',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: 1.2,
        userSelect: 'none',
      }}>RSV</span>
    </button>
  )
}

// ── Legend ────────────────────────────────────────────────────
export function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-muted-foreground">

      {/* Available — empty dark cavity */}
      <span className="flex items-center gap-2">
        <span style={{
          display: 'inline-block',
          width: 22, height: 22,
          borderRadius: 3,
          flexShrink: 0,
          backgroundColor: 'color-mix(in srgb, var(--color-background) 60%, #111 40%)',
          border: '2px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
          boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.5)',
        }} />
        Available
      </span>

      {/* Occupied — granite with cross */}
      <span className="flex items-center gap-2">
        <span style={{
          display: 'inline-block',
          width: 22, height: 22,
          borderRadius: 3,
          flexShrink: 0,
          backgroundColor: '#5a5c5d',
          backgroundImage: [
            'linear-gradient(#d4af37, #d4af37)',
            'linear-gradient(#d4af37, #d4af37)',
            'linear-gradient(145deg, #7a7c7e, #4a4c4d)',
          ].join(', '),
          backgroundSize: '2px 14px, 10px 2px, 100% 100%',
          backgroundPosition: 'center 4px, center 8px, center',
          backgroundRepeat: 'no-repeat',
          border: '1px solid rgba(0,0,0,0.4)',
          boxShadow: '1px 2px 4px rgba(0,0,0,0.35)',
        }} />
        Occupied
      </span>

      {/* Reserved — granite + RSV badge */}
      <span className="flex items-center gap-2">
        <span style={{
          display: 'inline-flex',
          width: 22, height: 22,
          borderRadius: 3,
          flexShrink: 0,
          background: 'linear-gradient(145deg, #7a7c7e, #4a4c4d)',
          border: '1px solid rgba(0,0,0,0.4)',
          boxShadow: '1px 2px 4px rgba(0,0,0,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            background: 'linear-gradient(145deg, #d4af37, #aa8222)',
            color: '#2a1a00',
            fontSize: 5,
            fontWeight: 800,
            padding: '1px 2px',
            borderRadius: 1,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            lineHeight: 1.2,
            userSelect: 'none',
          }}>RSV</span>
        </span>
        Reserved
      </span>

    </div>
  )
}

// ── Main grid ─────────────────────────────────────────────────
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
    <div className="flex flex-col items-center gap-4 px-4 pb-4">
      {/* Cement wall container — uses CSS vars for theme adaptation */}
      <div
        className="overflow-x-auto w-full"
        style={{ maxWidth: '100%' }}
      >
        <div style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 8,
          background: 'color-mix(in srgb, var(--color-muted) 80%, #b0b0b0 20%)',
          padding: '12px 14px',
          borderRadius: 8,
          border: '4px solid color-mix(in srgb, var(--color-border) 70%, #888 30%)',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
          minWidth: 'fit-content',
        }}>
          {rowGroups.map(({ row, slots: rowSlots }) => (
            <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Row label */}
              <div style={{
                width: 132,
                minWidth: 132,
                flexShrink: 0,
                background: 'var(--color-card)',
                border: '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)',
                borderRadius: 5,
                padding: '4px 10px',
              }}>
                <p style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--color-foreground)',
                  whiteSpace: 'nowrap',
                  margin: 0,
                }}>
                  {ROW_LABELS[row]}
                </p>
                <p style={{
                  fontSize: 9,
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  margin: 0,
                }}>
                  {formatPrice(ROW_PRICES[row])}
                </p>
              </div>

              {/* Slots */}
              <div style={{ display: 'flex', gap: 5 }}>
                {rowSlots.map(slot => (
                  <SlotCell
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedId === slot.id}
                    onSlotClick={onSlotClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <SlotLegend />
    </div>
  )
}
