'use client'

import { useState, useEffect } from 'react'
import type React from 'react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader, EmptyState, Spinner } from './admin-primitives'
import { X } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { ColumbariumSlot, SlotStatus } from '@/lib/supabase/types'

const ROW_LABELS: Record<number, string> = {
  1: 'Top Level', 2: 'Eye Level (Upper)', 3: 'Eye Level (Lower)',
  4: 'Upper Bottom', 5: 'Lower Bottom', 6: 'Ground Level',
}

/* ── Niche slot visuals ──────────────────────────────────── */
function NicheSlot({ slot, isSelected, onClick }: {
  slot: ColumbariumSlot; isSelected: boolean; onClick: () => void
}) {
  const isSelected_ = isSelected

  const base: React.CSSProperties = {
    width: 45,
    height: 45,
    borderRadius: 2,
    position: 'relative',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    outline: isSelected_ ? '3px solid #fff' : 'none',
    outlineOffset: 1,
    zIndex: isSelected_ ? 10 : undefined,
  }

  if (slot.status === 'available') {
    return (
      <button
        onClick={onClick}
        title={`${slot.slot_code} · Available`}
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

  // Occupied — cross drawn entirely with background-image gradients, exactly like the HTML
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
            'linear-gradient(#d4af37, #d4af37)',  // vertical bar
            'linear-gradient(#d4af37, #d4af37)',  // horizontal bar
            'linear-gradient(145deg, #7a7c7e, #5a5c5d)', // stone base
          ].join(', '),
          backgroundSize: '4px 24px, 18px 4px, 100% 100%',
          backgroundPosition: 'center 9px, center 15px, center center',
          backgroundRepeat: 'no-repeat',
          border: '1px solid #4a4a4a',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
        }}
      >
        {/* top-left + top-right dots via one element */}
        <span style={{
          position: 'absolute', top: 4, left: 4,
          width: 4, height: 4, borderRadius: '50%',
          background: '#a98844',
          boxShadow: '31px 0 0 #a98844',
        }} />
        {/* bottom-left + bottom-right dots */}
        <span style={{
          position: 'absolute', bottom: 4, left: 4,
          width: 4, height: 4, borderRadius: '50%',
          background: '#a98844',
          boxShadow: '31px 0 0 #a98844',
        }} />
      </button>
    )
  }

  // Reserved — granite slab + RSV plaque
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
      {/* top-left + top-right dots */}
      <span style={{
        position: 'absolute', top: 4, left: 4,
        width: 4, height: 4, borderRadius: '50%',
        background: '#a98844',
        boxShadow: '31px 0 0 #a98844',
      }} />
      {/* bottom-left + bottom-right dots */}
      <span style={{
        position: 'absolute', bottom: 4, left: 4,
        width: 4, height: 4, borderRadius: '50%',
        background: '#a98844',
        boxShadow: '31px 0 0 #a98844',
      }} />
      {/* RSV plaque */}
      <span style={{
        background: 'linear-gradient(145deg, #d4af37, #aa8222)',
        color: '#333',
        fontSize: 8,
        fontWeight: 700,
        padding: '2px 4px',
        borderRadius: 1,
        border: '1px solid #7a6015',
        textTransform: 'uppercase',
        zIndex: 2,
        lineHeight: 1.2,
        letterSpacing: 0.3,
        position: 'relative',
      }}>RSV</span>
    </button>
  )
}

export function ColumbariumTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<ColumbariumSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ColumbariumSlot | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('columbarium_slots').select('*').order('row_number').order('col_number')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const updateSlotStatus = async (newStatus: SlotStatus) => {
    if (!selected) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    const { error } = await supabase.from('columbarium_slots').update({ status: newStatus }).eq('id', selected.id)
    if (!error) {
      const updated = { ...selected, status: newStatus }
      setRows(r => r.map(s => s.id === selected.id ? updated : s))
      setSelected(updated)
      await logActivity({ category: 'log', event_type: `slot_${newStatus}`, entity_table: 'columbarium_slots', entity_id: selected.id, actor_id: user?.id, actor_name: actorName, message: `${actorName} marked slot ${selected.slot_code} as ${newStatus}`, metadata: { slot_code: selected.slot_code, status: newStatus } })
    }
    setSaving(false)
  }

  const counts = {
    available: rows.filter(s => s.status === 'available').length,
    reserved:  rows.filter(s => s.status === 'reserved').length,
    occupied:  rows.filter(s => s.status === 'occupied').length,
  }

  const rowGroups = Array.from({ length: 6 }, (_, i) => ({ row: i + 1, slots: rows.filter(s => s.row_number === i + 1) }))

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader title="Columbarium" sub={`${rows.length} total · ${counts.available} available · ${counts.reserved} reserved · ${counts.occupied} occupied`} />
        <div className="flex items-center gap-5 text-[11px] font-semibold text-muted-foreground shrink-0">
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm inline-block border border-[#6b6e70]" style={{ background: '#1e1e1e', boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.8)' }} />
            Available
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm inline-block border border-[#4a4a4a]" style={{ background: 'linear-gradient(145deg, #7a7c7e, #5a5c5d)' }} />
            Reserved
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-sm inline-block border border-[#3a3a3a]" style={{ background: 'linear-gradient(145deg, #6a6c6e, #4a4c4d)' }} />
            Occupied
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Available', count: counts.available, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Reserved',  count: counts.reserved,  color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Occupied',  count: counts.occupied,  color: 'text-red-600',   bg: 'bg-red-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? <EmptyState message="No slots found. Run migration to seed the grid." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0" style={{ minWidth: 160 + 12 * 53 }}>
              <tbody>
                {rowGroups.map(({ row, slots }) => (
                  <tr key={row}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 10, width: 148, minWidth: 148, background: 'var(--color-card)' }}
                      className={`px-4 py-2 align-middle border-r border-border ${row < 6 ? 'border-b border-border/30' : ''}`}>
                      <p className="text-[11px] font-bold text-foreground whitespace-nowrap">{ROW_LABELS[row]}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">₱{slots[0] ? Number(slots[0].price).toLocaleString() : '—'}</p>
                    </td>
                    {/* Cement wall area */}
                    <td colSpan={12} className="p-0">
                      <div className="flex gap-[6px] px-[10px] py-[8px]"
                        style={{ background: '#c8c8c8', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)' }}>
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-mono font-bold text-xl text-foreground">{selected.slot_code}</p>
                <p className="text-xs text-muted-foreground">{ROW_LABELS[selected.row_number]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="divide-y divide-border/50 text-sm">
                {[
                  { label: 'Level',  value: ROW_LABELS[selected.row_number] },
                  { label: 'Column', value: `${selected.col_number} of 12` },
                  { label: 'Price',  value: `₱${Number(selected.price).toLocaleString()}`, bold: true },
                  ...(selected.occupant_name       ? [{ label: 'Occupant', value: selected.occupant_name }] : []),
                  ...(selected.occupant_birth_date ? [{ label: 'Born',     value: selected.occupant_birth_date }] : []),
                  ...(selected.occupant_death_date ? [{ label: 'Died',     value: selected.occupant_death_date }] : []),
                  ...(selected.reserved_at ? [{ label: 'Reserved', value: new Date(selected.reserved_at).toLocaleString() }] : []),
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                    <span className={`text-sm ${bold ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'available', label: 'Available', active: 'bg-primary text-primary-foreground border-primary',       idle: 'border-primary/30 text-primary hover:bg-primary/10' },
                    { value: 'reserved',  label: 'Reserved',  active: 'bg-amber-500 text-white border-amber-500',                idle: 'border-amber-400/40 text-amber-600 hover:bg-amber-400/10' },
                    { value: 'occupied',  label: 'Occupied',  active: 'bg-red-500 text-white border-red-500',                    idle: 'border-red-400/40 text-red-500 hover:bg-red-400/10' },
                  ] as const).map(opt => (
                    <button key={opt.value} disabled={saving || selected.status === opt.value}
                      onClick={() => updateSlotStatus(opt.value)}
                      className={`h-9 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${selected.status === opt.value ? opt.active : `bg-background ${opt.idle}`}`}>
                      {saving && selected.status !== opt.value ? '…' : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
