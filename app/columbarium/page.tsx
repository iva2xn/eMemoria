'use client'

import React, { useState } from 'react'
import Image from 'next/image'
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

        {/* ── HERO — truly full bleed, no radius, no border ── */}
        <div className="relative h-[320px] md:h-[440px] lg:h-[520px] overflow-hidden">
          <Image
            src="/services/columbarium.png"
            alt="Columbarium"
            fill
            priority
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, var(--background) 0%, var(--background) 18%, rgba(255,255,255,0.04) 52%, transparent 100%)'
            }}
          />

          {/* ← Back button */}
          <a
            href="/services"
            className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-xs font-semibold text-foreground hover:bg-background/90 transition-all"
          >
            ← Services
          </a>

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 md:px-10 md:pb-10 z-10 max-w-6xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Memorial Services
            </p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 leading-tight">
              Columbarium
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
              A dedicated space designed to respectfully store and preserve cremation urns — view available niches and reserve a space for your loved ones.
            </p>
          </div>
        </div>

        {/* ── INFO BLOCKS ── */}
        <section className="py-10 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* How to use */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Guide</p>
              <h3 className="font-serif font-bold text-foreground mb-3">How to Use</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2"><span className="text-muted-foreground font-bold mt-0.5">·</span> Browse the available slots below</li>
                <li className="flex items-start gap-2"><span className="text-muted-foreground font-bold mt-0.5">·</span> Click a slot to view details</li>
                <li className="flex items-start gap-2"><span className="text-muted-foreground font-bold mt-0.5">·</span> Available slots can be reserved</li>
                <li className="flex items-start gap-2"><span className="text-muted-foreground font-bold mt-0.5">·</span> Occupied slots are already assigned</li>
              </ul>
            </div>

            {/* Legend */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Legend</p>
              <h3 className="font-serif font-bold text-foreground mb-3">Slot Status</h3>
              <ul className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded bg-[#4CAF50] shrink-0" />
                  <span><span className="font-semibold text-foreground">Available</span> — open for reservation</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded bg-[#F44336] shrink-0" />
                  <span><span className="font-semibold text-foreground">Occupied</span> — already assigned</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded bg-[#FFC107] shrink-0" />
                  <span><span className="font-semibold text-foreground">Reserved</span> — pending confirmation</span>
                </li>
              </ul>
            </div>

            {/* Prices */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Pricing</p>
              <h3 className="font-serif font-bold text-foreground mb-3">Slot Rates</h3>
              <ul className="text-sm space-y-2">
                {[
                  { label: 'Top Level', price: '₱25,000' },
                  { label: 'Eye Level (Upper)', price: '₱35,000' },
                  { label: 'Eye Level (Lower)', price: '₱25,000' },
                  { label: 'Upper Bottom', price: '₱20,000' },
                  { label: 'Lower Bottom', price: '₱20,000' },
                  { label: 'Ground Level', price: '₱20,000' },
                ].map(({ label, price }) => (
                  <li key={label} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground font-mono">{price}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </section>


        <section className="pb-10 max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 gap-6 items-start">

            {/* ── WALL ── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-5 py-6 flex items-center justify-center">
                <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">
                  COLUMBARIUM SLOTS
                </h2>
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
                            className={`px-4 py-3 align-middle border-r border-border ${!isLast ? 'border-b border-border' : ''}`}
                          >
                            <p className="text-[11px] font-bold text-foreground leading-tight whitespace-nowrap">
                              {ROW_LABELS[row]}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 whitespace-nowrap">
                              {formatPrice(ROW_PRICES[row])}
                            </p>
                          </td>

                          {/* SLOT CELLS */}
                          {rowSlots.map(slot => (
                            <td
                              key={slot.id}
                              className={`p-1 ${!isLast ? 'border-b border-border' : ''}`}
                            >
                              <button
                                disabled={slot.status === 'occupied'}
                                onClick={() => handleSlotClick(slot)}
                                className={`
                                  w-10 h-10 rounded border border-[#2c312c]/20
                                  transition-all duration-150 flex items-center justify-center
                                  ${slot.status === 'available'
                                    ? 'bg-[#4CAF50] hover:bg-[#43a047] cursor-pointer'
                                    : slot.status === 'reserved'
                                    ? 'bg-[#FFC107] hover:bg-[#ffb300] cursor-pointer'
                                    : 'bg-[#F44336] cursor-default'
                                  }
                                  ${selected?.id === slot.id ? 'ring-2 ring-black ring-offset-1' : ''}
                                `}
                              >
                                
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
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  We are committed to providing a peaceful and respectful resting place where families can honor and remember their loved ones.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── RESERVATION CTA ── */}
        <section className="py-16 bg-muted/30 border-t border-border px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Reserve a Niche</p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
              Reservation
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Families may reserve a columbarium slot through the funeral service. For assistance, please contact Marcelo P. Gayeta Funeral Services directly.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </section>

        {/* ── MODAL (mobile + desktop reserve flow) ── */}
        {modal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <div
              className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <p className="font-mono font-bold text-lg text-foreground">{modal.id}</p>
                  <p className="text-[11px] text-muted-foreground">{ROW_LABELS[modal.row]}</p>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-5 py-5 space-y-4">
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  modal.status === 'available' ? 'bg-primary/10 border-primary/25 text-primary' :
                  modal.status === 'reserved'  ? 'bg-amber-400/10 border-amber-400/30 text-amber-700' :
                                                 'bg-rose-400/10 border-rose-400/25 text-rose-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    modal.status === 'available' ? 'bg-primary' :
                    modal.status === 'reserved'  ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {modal.status}
                </span>

                {/* Details */}
                <div className="divide-y divide-border text-xs">
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Level</span>
                    <span className="font-medium text-foreground">{ROW_LABELS[modal.row]}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Column</span>
                    <span className="font-mono font-medium text-foreground">{modal.col} of {COLS}</span>
                  </div>
                  <div className="flex justify-between py-2.5 items-center">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Price</span>
                    <span className="font-serif font-bold text-base text-foreground">
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
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
                    >
                      Reserve <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href={`/contact?slot=${modal.id}&action=inquire`}
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-primary/25 hover:border-primary/50 hover:bg-primary/5 text-primary text-sm font-bold transition-colors"
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
