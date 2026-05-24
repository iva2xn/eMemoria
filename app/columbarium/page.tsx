'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { SlotGrid } from '@/components/columbarium/slot-grid'
import { SlotModal } from '@/components/columbarium/slot-modal'
import { InfoBlocks } from '@/components/columbarium/info-blocks'
import type { ColumbariumSlot } from '@/lib/supabase/types'

export default function ColumbariumPage() {
  const supabase = createClient()

  // SLOT DATA — full list ng columbarium slots from Supabase
  const [slots,   setSlots]   = useState<ColumbariumSlot[]>([])

  // LOADING STATE - self explanatory
  const [loading, setLoading] = useState(true)

  // MODAL STATE — eto yung naghahandle ng active na slot/pinindot ni user
  // null means no modal is open/active
  const [modal,   setModal]   = useState<ColumbariumSlot | null>(null)

  useEffect(() => {
    supabase
      .from('columbarium_slots')
      .select('*')
      .order('row_number')
      .order('col_number')
      .then(({ data }) => { setSlots(data ?? []); setLoading(false) })
  }, [supabase])
  const counts = {
    available: slots.filter(s => s.status === 'available').length,
    reserved:  slots.filter(s => s.status === 'reserved').length,
    occupied:  slots.filter(s => s.status === 'occupied').length,
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* Hero */}
        <div className="relative h-[320px] md:h-[440px] lg:h-[520px] overflow-hidden">
          <Image src="/services/columbarium.png" alt="Columbarium" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--background) 0%, var(--background) 18%, rgba(255,255,255,0.04) 52%, transparent 100%)' }} />
          <a href="/services"
            className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-xs font-semibold text-foreground hover:bg-background/90 transition-all">
            ← Services
          </a>
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 md:px-10 md:pb-10 z-10 max-w-6xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Memorial Services</p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 leading-tight">Columbarium</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
              A dedicated space designed to respectfully store and preserve cremation urns — view available niches and reserve a space for your loved ones.
            </p>
          </div>
        </div>

        {/* INFO BLOCKS — finefetch nito yung live count para visible sa users yung availability */}
        <section className="py-10 max-w-6xl mx-auto px-6">
          <InfoBlocks
            available={counts.available}
            reserved={counts.reserved}
            occupied={counts.occupied}
            loading={loading}
          />
        </section>

        {/* SLOT GRID — eto yung visual nung columbarium 6×12 grid
            clickable para mabuksan yung SlotModal / details about sa slot */}
        <section className="pb-10 max-w-6xl mx-auto px-4 md:px-6">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-6 flex items-center justify-center">
              <h2 className="text-xl font-bold uppercase tracking-widest text-foreground">COLUMBARIUM SLOTS</h2>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <SlotGrid
                slots={slots}
                selectedId={modal?.id ?? null}
                onSlotClick={slot => setModal(slot)}
              />
            )}

            <div className="px-5 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                We are committed to providing a peaceful and respectful resting place where families can honor and remember their loved ones.
              </p>
            </div>
          </div>
        </section>

        {/* RESERVATION CTA — deep-links to /billing with product=columbarium data pre-fill*/}
        <section className="py-16 bg-muted/30 border-t border-border px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Reserve a Niche</p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">Reservation</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Families may reserve a columbarium slot through the funeral service. For assistance, please contact Marcelo P. Gayeta Funeral Services directly.
            </p>
            <a href="/billing?product=columbarium&label=Columbarium+Slot+Reservation"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              Reserve a Slot
            </a>
          </div>
        </section>

      </main>

      {modal && (
        <SlotModal
          slot={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
