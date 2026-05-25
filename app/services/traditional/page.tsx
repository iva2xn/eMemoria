import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { PackageCard } from '@/components/ui/package-card'
import { ObituaryForm } from '@/components/ui/obituary-form'
import { ArrowLeft } from 'lucide-react'

const PACKAGES = [
  {
    title: 'OMB',
    price: '₱25,000.00',
    imageSrc: '/traditional/OMB.png',
    features: [
      'CASKET', 'EMBALMING', 'FLOWER', 'LIGHTENING',
      '2 PCS CANDLES', '15 PCS. CHAIRS', 'TARPLIN 2X3',
      'PICTURE W/FRAME', 'PLAYING CARDS 6 PCS', 'GUEST BOOK',
      'FULL OUT BAN', 'CARO',
    ],
  },
  {
    title: 'HALF GLASS',
    price: '₱35,000.00',
    imageSrc: '/traditional/HALFGLASS.png',
    features: [
      'CASKET', 'EMBALMING', 'FLOWERS', 'LIGHTENING',
      '4 PCS CANDLE', '20 CHAIRS', 'CARO',
      '100 PCS BOTTLED WATER', 'TARPAULIN 2X3', 'PICTURE W/FRAME',
      '1 BOX PLAYING CARDS', 'GUEST BOOK', 'FULL OUT BAN',
      'WATER DISPENSER W/ 10 GALLON',
    ],
  },
  {
    title: 'JR FULL GLASS',
    price: '₱47,000.00',
    imageSrc: '/traditional/JRFULL%20GGLASS.png',
    features: [
      'CASKET', 'EMBALMING', 'FLOWER W/ 1 REPLACEMENT', 'LIGHTENING',
      '4 CANDLES', '20 CHAIRS TENT', 'WATER DISPENSER W/ 10 GALLON',
      '1 BOX PLAYING CARDS', 'GUEST BOOK', 'PICTURE W/ FRAME',
      'TARPAULIN 2X3', '100 PCS BOTTLED WATER', 'VIGIL LAST NIGHT',
      'FULL OUT VAN', 'CARO',
    ],
  },
  {
    title: 'SR FULL GLASS',
    price: '₱57,000.00',
    imageSrc: '/traditional/SRFULLGLASS.png',
    features: [
      'CASKET', 'EMBALMING', 'FLOWER W/ 1 REPLACEMENT', 'LIGHTENING',
      'WATER DISPENSER W/ 10 GALLON', '1 BOX PLAYING CARDS', 'GUEST BOOK',
      '20 CHAIRS TENT', '4 CANDLES', 'TARPAULIN 2X3', 'PICTURE W/ FRAME',
      'VIGIL LAST NIGHT', '100 PCS BOTTLED WATER', 'RADUS', 'CARO', 'FULL OUT VAN',
    ],
  },
  {
    title: 'ORDINARY METAL',
    price: '₱75,000.00',
    imageSrc: '/traditional/ORDINARYMETAL.png',
    features: [
      'CASKET', 'EMBALMING', 'LIGHTENING', 'FLOWERS (2 LAGAY)',
      '4 CANDLES', '20 CHAIRS', 'WATER DISPENSER W/ 10 GALLON',
      '1 BOX PLAYING CARDS', 'GUEST BOOK', 'TENT', 'PICTURE W/ FRAME',
      'TARPAULIN 4X5', 'VIGIL LAST NIGHT', '100 PCS CUPCAKE',
      '100 PCS BOTTLED WATER', '100 PCS COKE MISMO', 'FULL OUT VAN',
      'KARWAHE', 'RADUS/ ROSE',
    ],
  },
]

export default function TraditionalBurialPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* ── HERO — truly full bleed, no radius, no border ── */}
        <div className="relative h-[320px] md:h-[440px] lg:h-[520px] overflow-hidden">
          <Image
            src="/services/traditional.png"
            alt="Traditional burial service"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Bottom-up gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, var(--background) 0%, var(--background) 18%, rgba(255,255,255,0.04) 52%, transparent 100%)'
            }}
          />

          {/* ← Back button — top left */}
          <Link
            href="/services"
            className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-xs font-semibold text-foreground hover:bg-background/90 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Services
          </Link>

          {/* Text */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 md:px-10 md:pb-10 z-10 max-w-6xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Memorial Services
            </p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 leading-tight">
              Traditional Burial
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
              Complete traditional funeral service with viewing, ceremony, and full burial coordination.
            </p>
          </div>
        </div>

        {/* ── DESCRIPTION ── */}
        <section className="py-10 max-w-6xl mx-auto px-6">
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
            Our traditional burial packages are thoughtfully designed to provide families with a dignified and complete farewell. Each package includes everything needed for a respectful wake and burial ceremony, with options suited to different family needs and budgets.
          </p>
        </section>

        {/* ── PACKAGES ── */}
        <section className="pb-16 max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Choose a Package
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
              Service Packages
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {PACKAGES.map((pkg, index) => (
              <PackageCard
                key={index}
                title={pkg.title}
                price={pkg.price}
                imageSrc={pkg.imageSrc}
                features={pkg.features}
              />
            ))}
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section className="py-16 bg-muted/30 border-t border-border px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              We&apos;re Here for You
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to arrange a service?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Contact our team to discuss the right package for your family. We are available 24 hours a day, 7 days a week.
            </p>
            <Button asChild size="lg" className="font-semibold rounded-xl px-8">
              <Link href="/document-submission?product=package&label=Traditional+Burial+Package">Reserve a Package</Link>
            </Button>
          </div>
        </section>

        {/* ── OBITUARY / TARP FORM ── */}
        <section className="py-16 max-w-3xl mx-auto px-6">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Memorial Tarpaulin
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
              Submit Obituary Details
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Fill in the details below and we will prepare a memorial tarpaulin for your loved one. A live preview updates as you type.
            </p>
          </div>
          <ObituaryForm />
        </section>

      </main>
    </>
  )
}
