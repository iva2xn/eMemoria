'use client'

import React, { useEffect, useRef } from 'react'
import { HeroHeader } from '@/components/header'
import { ServiceCard } from '@/components/ui/service-card'

const SERVICES = [
  {
    title: 'Traditional Burial',
    description: 'Complete traditional funeral service with viewing, ceremony, and full burial coordination for your loved one.',
    href: '/services/traditional',
    imageSrc: '/services/traditional.png',
    imageAlt: 'Traditional burial service',
  },
  {
    title: 'Cremation Services',
    description: 'Dignified cremation services with memorial options and a curated selection of urns to honor your loved one.',
    href: '/services/cremation',
    imageSrc: '/services/cremation.png',
    imageAlt: 'Cremation service',
  },
  {
    title: 'Columbarium',
    description: 'A dedicated structure designed to respectfully store and display cremation urns — reserve a niche for your family.',
    href: '/columbarium',
    imageSrc: '/services/columbarium.png',
    imageAlt: 'Columbarium niches',
  },
]

export default function ServicesPage() {
  const sliderRef = useRef<HTMLDivElement>(null)

  // Auto-advance the mobile carousel every 3 s
  useEffect(() => {
    const el = sliderRef.current
    if (!el) return

    let index = 0
    const total = SERVICES.length

    const advance = () => {
      index = (index + 1) % total
      const cardWidth = el.scrollWidth / total
      el.scrollTo({ left: cardWidth * index, behavior: 'smooth' })
    }

    const timer = setInterval(advance, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">
        <section className="py-16 md:py-24">

          {/* Header */}
          <div className="text-center mb-10 md:mb-14 px-6">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-5">
              Our Funeral Services
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Providing compassionate, professional funeral services tailored to honor your loved one and support your family during this difficult time.
            </p>
          </div>

          {/* ── MOBILE: horizontal snap carousel ── */}
          <div className="md:hidden">
            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 pb-4 no-scrollbar"
              style={{ scrollbarWidth: 'none' }}
            >
              {SERVICES.map((s) => (
                <div
                  key={s.href}
                  className="snap-center shrink-0 w-[80vw]"
                >
                  <ServiceCard
                    title={s.title}
                    description={s.description}
                    href={s.href}
                    imageSrc={s.imageSrc}
                    imageAlt={s.imageAlt}
                  />
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-4">
              {SERVICES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = sliderRef.current
                    if (!el) return
                    const cardWidth = el.scrollWidth / SERVICES.length
                    el.scrollTo({ left: cardWidth * i, behavior: 'smooth' })
                  }}
                  className="h-1.5 w-1.5 rounded-full bg-border hover:bg-foreground/40 transition-colors"
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ── DESKTOP: 3-col grid ── */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6">
            {SERVICES.map((s) => (
              <ServiceCard
                key={s.href}
                title={s.title}
                description={s.description}
                href={s.href}
                imageSrc={s.imageSrc}
                imageAlt={s.imageAlt}
              />
            ))}
          </div>

        </section>
      </main>
    </>
  )
}
