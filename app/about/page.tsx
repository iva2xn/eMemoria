import React from 'react'
import { Metadata } from 'next'
import Image from 'next/image'
import { HeroHeader } from '@/components/header'
import { Phone, Mail, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us | eMemoria',
  description: 'About Marcelo P. Gayeta Funeral Services',
}

export default function AboutPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* ── HERO — mirrors homepage layout, text panel on the RIGHT ── */}
        <section
          className="relative overflow-hidden flex items-center w-full"
          style={{ minHeight: 'calc(100dvh - 4rem)' }}
        >
          {/* Background image */}
          <div className="absolute inset-0 z-0 w-full">
            <Image
              src="/about.jpg"
              alt="about"
              fill
              priority
              className="object-cover object-left lg:object-center w-full"
            />
            {/* Mobile: top-down fade so text is readable */}
            <div className="absolute inset-0 pointer-events-none lg:hidden bg-gradient-to-b from-transparent via-background/70 to-background/95" />
            {/* Desktop: fade from RIGHT — white panel on the right */}
            <div
              className="absolute inset-0 pointer-events-none hidden lg:block"
              style={{
                background: 'linear-gradient(to left, var(--background) 0%, var(--background) 40%, transparent 100%)'
              }}
            />
          </div>

          {/* Content */}
          <div
            className="relative z-10 w-full"
            style={{ paddingTop: 'clamp(3rem, 8vh, 6rem)', paddingBottom: 'clamp(3rem, 8vh, 6rem)' }}
          >
            <div className="relative mx-auto flex max-w-6xl flex-col px-6 lg:block">
              {/* Text block pushed to the RIGHT on desktop */}
              <div className="mx-auto max-w-lg text-center lg:mr-0 lg:ml-auto lg:w-1/2 lg:text-left">

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-foreground/15 text-xs font-bold uppercase tracking-widest text-foreground/60">
                  Established Since 2024
                </span>

                <h1 className="mt-6 text-balance text-4xl font-serif font-bold md:text-5xl lg:mt-8 xl:text-6xl text-foreground leading-[1.1]">
                  Serving Families with Dignity &amp; Compassion
                </h1>

                <p className="mt-6 text-pretty text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
                  Marcelo P. Gayeta Funeral Services has been a trusted name in Sariaya, Quezon — providing professional, dignified, and personalized funeral care for families during their most difficult moments.
                </p>

                <p className="mt-4 text-pretty text-base text-muted-foreground leading-relaxed">
                  Our mission is to honor every life with respect and care, guiding families through every step of the funeral and cremation process with compassion and transparency.
                </p>

                {/* Contact details */}
                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-3 justify-center lg:justify-start">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono font-semibold text-foreground">+63 918 901 9978</span>
                    <span className="text-xs text-muted-foreground">— 24 / 7</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center lg:justify-start">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">mgayetafuneralhome@gmail.com</span>
                  </div>
                  <div className="flex items-start gap-3 justify-center lg:justify-start">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      Maharlika Highway, Sitio Sta. Clara,<br />
                      Brgy. Sampaloc 2, Sariaya, Quezon
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
