import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const STATS = [
  { value: '20+',  label: 'Years of Service' },
  { value: '500+', label: 'Families Served' },
  { value: '24/7', label: 'Always Available' },
  { value: '3',    label: 'Service Branches' },
]

const SERVICE_CARDS = [
  { img: '/services/traditional.png', title: 'Traditional Burial',  sub: 'Complete wake & burial coordination',  href: '/services/traditional' },
  { img: '/services/cremation.png',   title: 'Cremation Services',  sub: 'Dignified cremation with urn selection', href: '/services/cremation' },
  { img: '/services/columbarium.png', title: 'Columbarium',         sub: 'Reserve a niche for your loved one',    href: '/columbarium' },
]

export function HomeSections() {
  return (
    <>
      {/* ── Stats ticker bar ── */}
      <section className="px-4 sm:px-6 pt-3 pb-0 w-full">
        <div className="mx-auto max-w-6xl">
          <div className="bg-card border border-border rounded-3xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-border">
            {STATS.map((s) => (
              <div key={s.label} className="text-center px-4">
                <p className="font-serif text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Services ── */}
      <section className="px-4 sm:px-6 py-8 w-full">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-1.5">
                What We Offer
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Our Services
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                Professional memorial services tailored to honor your loved one.
              </p>
            </div>
            <Link href="/services"
              className="hidden sm:flex items-center gap-2 h-10 w-10 rounded-full bg-primary text-primary-foreground justify-center hover:bg-primary/90 transition-colors shrink-0">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SERVICE_CARDS.map((card) => (
              <Link key={card.title} href={card.href}
                className="group relative rounded-2xl overflow-hidden block"
                style={{ aspectRatio: '4/3' }}
              >
                <Image src={card.img} alt={card.title} fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{card.title}</p>
                    <p className="text-white/60 text-[11px] mt-0.5 leading-tight">{card.sub}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-4 sm:px-6 py-12 pb-16 w-full">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 lg:gap-12 items-stretch">

            {/* Left Column: Image Card + Badge */}
            <div className="flex flex-col gap-3.5">
              {/* Image Box */}
              <div className="relative w-full aspect-[4/3] md:aspect-[1/1] lg:aspect-[4/5] rounded-[2rem] overflow-hidden border border-border/40 shadow-sm">
                <Image 
                  src="/about.jpg" 
                  alt="Compassionate memorial service" 
                  fill
                  className="object-cover object-center" 
                />
              </div>
              {/* Info badge */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xl font-black text-primary block leading-none">Est. 2004</span>
                  <span className="text-[10px] text-muted-foreground mt-2 block font-medium">Sariaya, Quezon Province</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono tracking-wider text-muted-foreground/80 block">BRANCHES</span>
                  <span className="text-xs font-bold text-foreground block mt-1">3 Locations</span>
                </div>
              </div>
            </div>

            {/* Right Column: Staggered Headline + Action Button */}
            <div className="flex flex-col justify-between h-full py-2">
              
              {/* Controlled Staggered Typography Layout */}
              <div className="flex flex-col gap-5 md:gap-7">
                
                {/* Row 1: COMPASSIONATE + Paragraph */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/40 pb-5 md:pb-6">
                  <h2 className="font-sans text-4xl lg:text-[2.75rem] font-black tracking-tight text-foreground leading-none uppercase">
                    Compassionate
                  </h2>
                  <p className="text-[11px] text-muted-foreground max-w-[230px] md:text-right leading-relaxed font-medium shrink-0 pt-1">
                    Our dedicated professionals guide you through every step, ensuring comfort and dignity during difficult times.
                  </p>
                </div>

                {/* Row 2: CARE FOR EVERY (Centered) */}
                <div className="flex justify-center w-full border-b border-border/40 pb-5 md:pb-6">
                  <h2 className="font-sans text-4xl lg:text-[2.75rem] font-black tracking-tight text-foreground/40 leading-none uppercase text-center">
                    Care For Every
                  </h2>
                </div>

                {/* Row 3: Paragraph + FAMILY */}
                <div className="flex flex-col-reverse md:flex-row md:items-end justify-between gap-4">
                  <p className="text-[11px] text-muted-foreground max-w-[240px] leading-relaxed pb-1 font-medium">
                    Serving families across Quezon Province since 2004 with integrity, respect, and customized packages.
                  </p>
                  <h2 className="font-sans text-4xl lg:text-[2.75rem] font-black tracking-tight text-foreground leading-none uppercase shrink-0">
                    Family
                  </h2>
                </div>

              </div>

              {/* Theme-Integrated Pill Button */}
              <div className="mt-8 md:mt-12">
                <Link href="/services"
                  className="w-full h-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2.5 group shadow-sm">
                  <span className="text-xs font-bold tracking-wider uppercase">
                    Book A Service Now
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}