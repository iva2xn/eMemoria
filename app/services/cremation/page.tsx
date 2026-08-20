import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'

const WHAT_INCLUDED = [
  'Cremation process and handling',
  'Basic preparation of the deceased',
  'Documentation assistance',
  'Coordination with memorial staff',
  'Choice of memorial urn (see options below)',
]

export const URNS = [
  { name: 'Wooden Urn',      description: 'Warm wooden finish — simple and dignified.',           price: 3500,  image: '/urns/wooden.png' },
  { name: 'Black Metal Urn', description: 'Refined dark design — timeless and understated.',       price: 3500,  image: '/urns/blackmetal.png' },
  { name: 'Gray Metal Urn',  description: 'Graceful metallic style — calm and elegant.',           price: 5500,  image: '/urns/graymetal.png' },
  { name: 'White Marble Urn','description': 'Soft marble-inspired finish — reflects purity.',       price: 5500,  image: '/urns/whitemarble.png' },
  { name: 'Blue Metal Urn',  description: 'Distinguished blue — premium memorial design.',         price: 15000, image: '/urns/blue.png' },
  { name: 'Brown Metal Urn', description: 'Rich bronze-brown — traditional memorial style.',       price: 15000, image: '/urns/brownmetal.png' },
]

function fmtPrice(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function CremationPage() {
  return (
    <ClientLayout>
      <main className="flex-1 bg-background">

        {/* ── HERO ── */}
        <div className="relative h-[320px] md:h-[440px] lg:h-[520px] overflow-hidden">
          <Image src="/services/cremation.png" alt="Cremation services" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--background) 0%, var(--background) 18%, rgba(255,255,255,0.04) 52%, transparent 100%)' }} />
          <Link href="/services"
            className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-xs font-semibold text-foreground hover:bg-background/90 transition-all">
            <ArrowLeft className="h-3.5 w-3.5" /> Services
          </Link>
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 md:px-10 md:pb-10 z-10 max-w-6xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Memorial Services</p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 leading-tight">Cremation Services</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
              Dignified cremation services with full assistance and urn selection — all included in one reservation.
            </p>
          </div>
        </div>

        {/* ── RESERVATION CARD ── */}
        <section className="py-12 max-w-6xl mx-auto px-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-8 py-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-start gap-8">

              {/* Left: pricing */}
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reservation Fee</p>
                <h2 className="font-serif text-4xl font-bold text-foreground mb-1">₱25,000.00</h2>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed max-w-md">
                  The reservation covers the full cremation service. You will select your preferred urn as part of the reservation process — urn price is added on top.
                </p>
                <ul className="space-y-2">
                  {WHAT_INCLUDED.map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: CTA */}
              <div className="md:w-56 flex flex-col gap-3">
                <Button asChild size="lg" className="font-semibold rounded-xl">
                  <Link href="/document-submission?product=cremation&label=Cremation+Service&price=25000">
                    Reserve Now
                  </Link>
                </Button>
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  You&apos;ll choose your urn after submitting your documents. Urn price is added to the total.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── URN SELECTION PREVIEW ── */}
        <section className="py-16 bg-muted/30 border-t border-border px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Included in Reservation</p>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">Choose a Memorial Urn</h2>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                Select an urn as part of your reservation. If you have your own urn, you may use it — no additional charge. Urn selection happens during document submission.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {URNS.map(urn => (
                <div key={urn.name} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="relative aspect-square w-full bg-muted/40">
                    <Image src={urn.image} alt={urn.name} fill className="object-contain p-4" />
                  </div>
                  <div className="px-4 pb-4 pt-3 flex-1 flex flex-col gap-1">
                    <p className="text-sm font-bold text-foreground">{urn.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{urn.description}</p>
                    <p className="text-sm font-bold text-primary mt-2">{fmtPrice(urn.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-primary/5 border border-primary/20 rounded-2xl px-6 py-5">
              <p className="text-sm font-semibold text-foreground mb-1">Have your own urn?</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No problem — if your family already has an urn, you can select &ldquo;Use my own urn&rdquo; during the reservation process and no urn fee will be added.
              </p>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section className="py-16 max-w-6xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">We&apos;re Here for You</p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Let us help you arrange a respectful memorial service.
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            Speak with our team to learn more about cremation arrangements, memorial options, and urn selections for your loved one.
          </p>
          <Button asChild size="lg" className="font-semibold rounded-xl px-8">
            <Link href="/document-submission?product=cremation&label=Cremation+Service&price=25000">Arrange a Service</Link>
          </Button>
        </section>

      </main>
    </ClientLayout>
  )
}
