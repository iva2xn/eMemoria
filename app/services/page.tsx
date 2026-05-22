'use client'

import React from 'react'
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
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">
        <section className="py-16 md:py-24 max-w-6xl mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-14">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-5">
              Our Funeral Services
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Providing compassionate, professional funeral services tailored to honor your loved one and support your family during this difficult time.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
