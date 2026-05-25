import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { UrnCard } from '@/components/ui/urn-card'
import { ArrowLeft } from 'lucide-react'

const URNS = [
  { name: 'Wooden Urn', description: 'A warm wooden finish that offers a simple and dignified remembrance.', price: '₱3,500.00', image: '/urns/wooden.png' },
  { name: 'Black Metal Urn', description: 'A refined dark design with a timeless and understated presence.', price: '₱3,500.00', image: '/urns/blackmetal.png' },
  { name: 'Gray Metal Urn', description: 'A graceful metallic style suited for a calm and elegant tribute.', price: '₱5,500.00', image: '/urns/graymetal.png' },
  { name: 'Brown Metal Urn', description: 'A rich bronze-brown finish created for a more traditional memorial style.', price: '₱15,000.00', image: '/urns/brownmetal.png' },
  { name: 'Blue Metal Urn', description: 'A distinguished blue urn with a premium and memorial-focused design.', price: '₱15,000.00', image: '/urns/blue.png' },
  { name: 'White Marble Urn', description: 'A soft marble-inspired finish that reflects purity and peace.', price: '₱5,500.00', image: '/urns/whitemarble.png' },
]

export default function CremationPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* ── HERO — truly full bleed, no radius, no border ── */}
        <div className="relative h-[320px] md:h-[440px] lg:h-[520px] overflow-hidden">
          <Image
            src="/services/cremation.png"
            alt="Cremation services"
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
          <Link
            href="/services"
            className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-xs font-semibold text-foreground hover:bg-background/90 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Services
          </Link>

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 md:px-10 md:pb-10 z-10 max-w-6xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Memorial Services
            </p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 leading-tight">
              Cremation Services
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
              Dignified cremation services with memorial options and urn selections.
            </p>
          </div>
        </div>

        {/* ── DESCRIPTION ── */}
        <section className="py-10 max-w-6xl mx-auto px-6">
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
            We provide compassionate cremation support for families seeking a respectful and meaningful way to honor their loved ones. Our services are designed to offer peace of mind through careful assistance, memorial guidance, and thoughtful urn selections suited to different preferences and budgets.
          </p>
        </section>

        {/* ── PRICING CARD ── */}
        <section className="pb-12 max-w-6xl mx-auto px-6">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Service Rate</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">₱25,000.00</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Coordinate with our staff for complete assistance with scheduling, requirements, and memorial options.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0 font-semibold rounded-xl px-8">
              <Link href="/document-submission?product=cremation&label=Cremation+Service&price=25000">Reserve Now</Link>
            </Button>
          </div>
        </section>

        {/* ── URN SELECTIONS ── */}
        <section className="py-16 bg-muted/30 border-t border-border px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Urn Collection
              </p>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">
                Choose a Memorial Urn
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                Each urn is crafted to honor your loved one with care. Browse our selection and choose the one that feels right for your family.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {URNS.map((urn, index) => (
                <UrnCard
                  key={index}
                  name={urn.name}
                  description={urn.description}
                  price={urn.price}
                  image={urn.image}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section className="py-16 max-w-6xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            We&apos;re Here for You
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Let us help you arrange a respectful memorial service.
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            Speak with our team to learn more about cremation arrangements, memorial options, and available urn selections for your loved one.
          </p>
          <Button asChild size="lg" className="font-semibold rounded-xl px-8">
            <Link href="/document-submission?product=cremation&label=Cremation+Service&price=25000">Arrange a Service</Link>
          </Button>
        </section>

      </main>
    </>
  )
}
