'use client'

import React, { useState } from 'react'
import { HeroHeader } from '@/components/header'
import { X, ArrowRight, Phone } from 'lucide-react'

const ROW_PRICES: Record<number, number> = {
  1: 25000,
  2: 35000,
  3: 25000,
  4: 20000,
  5: 20000,
  6: 20000,
}

const ROW_LABELS: Record<number, string> = {
  1: 'Top Level',
  2: 'Eye Level (Upper)',
  3: 'Eye Level (Lower)',
  4: 'Upper Bottom',
  5: 'Lower Bottom',
  6: 'Ground Level',
}

const COLS = 12
const ROWS = 6

type SlotStatus = 'available' | 'reserved' | 'occupied'

interface SlotData {
  id: string
  row: number
  col: number
  status: SlotStatus
}

function generateSlots(): SlotData[] {
  const occupied = new Set([
    '1-3','1-4','1-9',
    '2-1','2-6','2-7','2-11',
    '3-2','3-3','3-4','3-8','3-9','3-10',
    '4-1','4-2','4-3','4-5','4-8','4-9','4-10','4-11',
    '5-1','5-4','5-9','5-10',
    '6-2','6-5','6-6','6-11','6-12',
  ])
  const reserved = new Set([
    '1-6','1-7',
    '2-4','2-9',
    '3-6',
    '4-7',
    '5-6','5-7',
    '6-3','6-8',
  ])
  const slots: SlotData[] = []
  for (let row = 1; row <= ROWS; row++) {
    for (let col = 1; col <= COLS; col++) {
      const key = `${row}-${col}`
      let status: SlotStatus = 'available'
      if (occupied.has(key)) status = 'occupied'
      else if (reserved.has(key)) status = 'reserved'
      slots.push({ id: `R${row}C${String(col).padStart(2,'0')}`, row, col, status })
    }
  }
  return slots
}

const ALL_SLOTS = generateSlots()

function formatPrice(p: number) {
  return '₱' + p.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

// Label column width in px — must match the inline style below
const LABEL_W = 140

export default function ColumbariumPage() {
  const [selected, setSelected] = useState<SlotData | null>(null)
  const [modal, setModal]       = useState<SlotData | null>(null)

  const counts = {
    available: ALL_SLOTS.filter(s => s.status === 'available').length,
    reserved:  ALL_SLOTS.filter(s => s.status === 'reserved').length,
    occupied:  ALL_SLOTS.filter(s => s.status === 'occupied').length,
  }

  function handleSlotClick(slot: SlotData) {
    if (slot.status === 'occupied') return
    // On mobile open modal; on desktop just select
    setSelected(s => s?.id === slot.id ? null : slot)
    setModal(slot)
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* Banner */}
        <section className="py-10 bg-gradient-to-b from-[var(--brand-green)]/5 to-background border-b border-border/40 text-center">
          <div className="mx-auto max-w-4xl px-6">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-[var(--brand-green)] tracking-tight">
              Virtual Columbarium
            </h1>
            <div className="flex items-center justify-center gap-4 mt-3">
              {(['available','reserved','occupied'] as SlotStatus[]).map(s => (
                <span key={s} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--surface-muted)] capitalize">
                  <span className={`w-2 h-2 rounded-full ${
                    s === 'available' ? 'bg-[var(--brand-green)]' :
                    s === 'reserved'  ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {counts[s]} {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 gap-6 items-start">

            {/* ── WALL ── */}
            <div className="rounded-2xl border border-[var(--brand-cream-border)] bg-card shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-5 py-3.5 border-b border-[var(--brand-cream-border)] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-green)]">
                  Columbarium Wall — Front View
                </span>
                <span className="text-[10px] font-mono text-[var(--surface-muted)]">
                  {ROWS} levels · {COLS} columns
                </span>
              </div>

              {/*
                KEY FIX: The label column uses `position:sticky; left:0`
                via inline style. Tailwind `sticky` doesn't work inside
                overflow-x containers — inline style does.
              */}
              <div className="overflow-x-auto">
                <table
                  className="border-separate border-spacing-0"
                  style={{ minWidth: LABEL_W + COLS * 44 + 32 }}
                >
                  <tbody>
                    {Array.from({ length: ROWS }, (_, ri) => {
                      const row = ri + 1
                      const rowSlots = ALL_SLOTS.filter(s => s.row === row)
                      const isLast = row === ROWS
                      return (
                        <tr key={row}>
                          {/* STICKY LABEL CELL */}
                          <td
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 10,
                              width: LABEL_W,
                              minWidth: LABEL_W,
                              background: 'var(--color-card, #fff)',
                            }}
                            className={`px-4 py-3 align-middle border-r border-[var(--brand-cream-border)] ${!isLast ? 'border-b border-[var(--brand-cream-border)]' : ''}`}
                          >
                            <p className="text-[11px] font-bold text-[var(--brand-green)] leading-tight whitespace-nowrap">
                              {ROW_LABELS[row]}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--surface-muted)] mt-0.5 whitespace-nowrap">
                              {formatPrice(ROW_PRICES[row])}
                            </p>
                          </td>

                          {/* SLOT CELLS */}
                          {rowSlots.map(slot => (
                            <td
                              key={slot.id}
                              className={`p-1 ${!isLast ? 'border-b border-[var(--brand-cream-border)]/40' : ''}`}
                            >
                              <button
                                disabled={slot.status === 'occupied'}
                                onClick={() => handleSlotClick(slot)}
                                className={`
                                  w-9 h-9 rounded-lg border text-[10px] font-bold font-mono
                                  transition-all duration-150 flex items-center justify-center
                                  ${slot.status === 'available'
                                    ? 'bg-[var(--brand-green)]/8 border-[var(--brand-green)]/20 hover:bg-[var(--brand-green)]/18 hover:border-[var(--brand-green)]/50 text-[var(--brand-green)] cursor-pointer'
                                    : slot.status === 'reserved'
                                    ? 'bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/20 hover:border-amber-500/50 text-amber-700 cursor-pointer'
                                    : 'bg-rose-400/10 border-rose-400/25 text-rose-400/60 cursor-default'
                                  }
                                  ${selected?.id === slot.id ? 'ring-2 ring-[var(--brand-gold)] ring-offset-1' : ''}
                                `}
                              >
                                {slot.col}
                              </button>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-5 py-3 border-t border-[var(--brand-cream-border)] flex flex-wrap gap-5 items-center">
                {(['available','reserved','occupied'] as SlotStatus[]).map(s => (
                  <div key={s} className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--surface-muted)] capitalize">
                    <span className={`w-3 h-3 rounded-sm border ${
                      s === 'available' ? 'bg-[var(--brand-green)]/10 border-[var(--brand-green)]/25' :
                      s === 'reserved'  ? 'bg-amber-400/10 border-amber-400/30' :
                                          'bg-rose-400/10 border-rose-400/25'
                    }`} />
                    {s}
                  </div>
                ))}
                <span className="ml-auto text-[10px] text-[var(--surface-muted)] italic hidden md:block">
                  Hover to preview · Click to reserve
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── MODAL (mobile + desktop reserve flow) ── */}
        {modal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <div
              className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-[var(--brand-cream-border)] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--brand-cream-border)]">
                <div>
                  <p className="font-mono font-bold text-lg text-[var(--brand-green)]">{modal.id}</p>
                  <p className="text-[11px] text-[var(--surface-muted)]">{ROW_LABELS[modal.row]}</p>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-[var(--surface-muted)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-5 py-5 space-y-4">
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  modal.status === 'available' ? 'bg-[var(--brand-green)]/10 border-[var(--brand-green)]/25 text-[var(--brand-green)]' :
                  modal.status === 'reserved'  ? 'bg-amber-400/10 border-amber-400/30 text-amber-700' :
                                                 'bg-rose-400/10 border-rose-400/25 text-rose-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    modal.status === 'available' ? 'bg-[var(--brand-green)]' :
                    modal.status === 'reserved'  ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {modal.status}
                </span>

                {/* Details */}
                <div className="divide-y divide-[var(--brand-cream-border)] text-xs">
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--surface-muted)] font-semibold uppercase tracking-wider text-[10px]">Level</span>
                    <span className="font-medium text-[var(--surface-text-dark)]">{ROW_LABELS[modal.row]}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-[var(--surface-muted)] font-semibold uppercase tracking-wider text-[10px]">Column</span>
                    <span className="font-mono font-medium text-[var(--surface-text-dark)]">{modal.col} of {COLS}</span>
                  </div>
                  <div className="flex justify-between py-2.5 items-center">
                    <span className="text-[var(--surface-muted)] font-semibold uppercase tracking-wider text-[10px]">Price</span>
                    <span className="font-serif font-bold text-base text-[var(--brand-green)]">
                      {formatPrice(ROW_PRICES[modal.row])}
                    </span>
                  </div>
                </div>

                {modal.status === 'occupied' && (
                  <p className="text-[11px] text-rose-600 bg-rose-400/8 border border-rose-400/20 rounded-xl p-3 font-medium">
                    This slot is currently occupied and unavailable.
                  </p>
                )}
                {modal.status === 'reserved' && (
                  <p className="text-[11px] text-amber-700 bg-amber-400/8 border border-amber-400/20 rounded-xl p-3 font-medium">
                    This slot is reserved and pending confirmation.
                  </p>
                )}
                {modal.status === 'available' && (
                  <div className="space-y-2 pt-1">
                    <a
                      href={`/billing?product=columbarium&slot=${modal.id}&level=${encodeURIComponent(ROW_LABELS[modal.row])}&price=${ROW_PRICES[modal.row]}`}
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 text-[rgb(240,248,255)] text-sm font-bold transition-colors"
                    >
                      Reserve <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href={`/contact?slot=${modal.id}&action=inquire`}
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-[var(--brand-green)]/25 hover:border-[var(--brand-green)]/50 hover:bg-[var(--brand-green)]/5 text-[var(--brand-green)] text-sm font-bold transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" /> Inquire
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
