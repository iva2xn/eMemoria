'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader, EmptyState, Spinner } from './admin-primitives'
import { X } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { ColumbariumSlot, SlotStatus } from '@/lib/supabase/types'

const ROW_LABELS: Record<number, string> = {
  1: 'Top Level', 2: 'Eye Level (Upper)', 3: 'Eye Level (Lower)',
  4: 'Upper Bottom', 5: 'Lower Bottom', 6: 'Ground Level',
}

export function ColumbariumTab() {
  const supabase = createClient()
  const [rows, setRows]       = useState<ColumbariumSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ColumbariumSlot | null>(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    supabase.from('columbarium_slots').select('*').order('row_number').order('col_number')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const updateSlotStatus = async (newStatus: SlotStatus) => {
    if (!selected) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'

    const { error } = await supabase
      .from('columbarium_slots')
      .update({ status: newStatus })
      .eq('id', selected.id)

    if (!error) {
      const updated = { ...selected, status: newStatus }
      setRows(r => r.map(s => s.id === selected.id ? updated : s))
      setSelected(updated)

      await logActivity({
        category:     'log',
        event_type:   `slot_${newStatus}`,
        entity_table: 'columbarium_slots',
        entity_id:    selected.id,
        actor_id:     user?.id,
        actor_name:   actorName,
        message:      `${actorName} marked slot ${selected.slot_code} as ${newStatus}`,
        metadata:     { slot_code: selected.slot_code, status: newStatus },
      })
    }
    setSaving(false)
  }

  const counts = {
    available: rows.filter(s => s.status === 'available').length,
    reserved:  rows.filter(s => s.status === 'reserved').length,
    occupied:  rows.filter(s => s.status === 'occupied').length,
  }

  const slotColor = (s: string) =>
    s === 'available' ? 'bg-primary hover:bg-primary/80 cursor-pointer'
    : s === 'reserved'  ? 'bg-amber-500 hover:bg-amber-400 cursor-pointer'
    : 'bg-red-500 hover:bg-red-400 cursor-pointer'

  const rowGroups = Array.from({ length: 6 }, (_, i) => ({
    row: i + 1,
    slots: rows.filter(s => s.row_number === i + 1),
  }))

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader
          title="Columbarium"
          sub={`${rows.length} total · ${counts.available} available · ${counts.reserved} reserved · ${counts.occupied} occupied`}
        />
        <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary inline-block" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Reserved</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Occupied</span>
        </div>
      </div>

      {rows.length === 0 ? <EmptyState message="No slots found. Run migration 002 to seed the grid." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0" style={{ minWidth: 180 + 12 * 44 }}>
              <tbody>
                {rowGroups.map(({ row, slots }) => (
                  <tr key={row}>
                    <td
                      style={{ position: 'sticky', left: 0, zIndex: 10, width: 160, minWidth: 160, background: 'var(--color-card)' }}
                      className={`px-4 py-3 align-middle border-r border-border ${row < 6 ? 'border-b border-border' : ''}`}
                    >
                      <p className="text-[11px] font-bold text-foreground whitespace-nowrap">{ROW_LABELS[row]}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        ₱{slots[0] ? Number(slots[0].price).toLocaleString() : '—'}
                      </p>
                    </td>
                    {slots.map(slot => (
                      <td key={slot.id} className={`p-1 ${row < 6 ? 'border-b border-border' : ''}`}>
                        <button
                          onClick={() => setSelected(s => s?.id === slot.id ? null : slot)}
                          title={`${slot.slot_code} · ${slot.status}${slot.occupant_name ? ` · ${slot.occupant_name}` : ''}`}
                          className={`w-10 h-10 rounded text-[8px] font-bold text-white border border-black/10 transition-all ${slotColor(slot.status)} ${selected?.id === slot.id ? 'ring-2 ring-foreground ring-offset-1' : ''}`}
                        >
                          {slot.col_number}
                        </button>
                      </td>
                    ))}
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
                <p className="font-mono font-bold text-lg text-foreground">{selected.slot_code}</p>
                <p className="text-[11px] text-muted-foreground">{ROW_LABELS[selected.row_number]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="divide-y divide-border text-xs">
                {[
                  { label: 'Level',   value: ROW_LABELS[selected.row_number] },
                  { label: 'Column',  value: `${selected.col_number} of 12`, mono: true },
                  { label: 'Price',   value: `₱${Number(selected.price).toLocaleString()}`, bold: true },
                  ...(selected.occupant_name       ? [{ label: 'Occupant',    value: selected.occupant_name }]       : []),
                  ...(selected.occupant_birth_date ? [{ label: 'Born',        value: selected.occupant_birth_date }] : []),
                  ...(selected.occupant_death_date ? [{ label: 'Died',        value: selected.occupant_death_date }] : []),
                  ...(selected.reserved_at         ? [{ label: 'Reserved At', value: new Date(selected.reserved_at).toLocaleString(), mono: true }] : []),
                ].map(({ label, value, mono, bold }) => (
                  <div key={label} className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">{label}</span>
                    <span className={`${mono ? 'font-mono text-[10px]' : ''} ${bold ? 'font-serif font-bold text-base' : 'font-medium'} text-foreground`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'available', label: 'Available', active: 'bg-primary text-primary-foreground border-primary',   idle: 'border-primary/30 text-primary hover:bg-primary/10' },
                    { value: 'reserved',  label: 'Reserved',  active: 'bg-amber-500 text-white border-amber-500',            idle: 'border-amber-400/40 text-amber-600 hover:bg-amber-400/10' },
                    { value: 'occupied',  label: 'Occupied',  active: 'bg-red-500 text-white border-red-500',                idle: 'border-red-400/40 text-red-500 hover:bg-red-400/10' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      disabled={saving || selected.status === opt.value}
                      onClick={() => updateSlotStatus(opt.value)}
                      className={`h-9 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed
                        ${selected.status === opt.value ? opt.active : `bg-background ${opt.idle}`}`}
                    >
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
