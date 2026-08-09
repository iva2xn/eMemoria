import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Search, FileText, HeartHandshake } from 'lucide-react'

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

const STEPS = [
  {
    icon: Search,
    step: '01',
    title: 'Choose a Service',
    desc: 'Browse our packages and select the one that best fits your family\'s needs and budget.',
  },
  {
    icon: FileText,
    step: '02',
    title: 'Submit Documents',
    desc: 'Upload the required documents through our secure portal. Our team reviews within the day.',
    highlight: true,
  },
  {
    icon: HeartHandshake,
    step: '03',
    title: 'We Handle Everything',
    desc: 'From retrieval to burial, our counselors coordinate every detail so your family can grieve in peace.',
  },
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

      {/* ── 3-step process ── */}
      <section className="px-4 sm:px-6 py-10 w-full">
        <div className="mx-auto max-w-6xl">

          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Arranging a Service Made Simple
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              We guide your family through every step — from choosing a package to the final farewell.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.step}
                  className={`rounded-2xl p-6 flex flex-col gap-4 ${
                    step.highlight
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      step.highlight ? 'bg-white/15' : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${step.highlight ? 'text-white' : 'text-primary'}`} />
                    </div>
                    <span className={`text-xs font-bold font-mono ${
                      step.highlight ? 'text-white/50' : 'text-muted-foreground'
                    }`}>{step.step}</span>
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${step.highlight ? 'text-white' : 'text-foreground'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm mt-1.5 leading-relaxed ${
                      step.highlight ? 'text-white/65' : 'text-muted-foreground'
                    }`}>
                      {step.desc}
                    </p>
                  </div>
                  {step.highlight && (
                    <Button asChild size="sm"
                      className="mt-auto rounded-xl bg-white text-primary hover:bg-white/90 font-semibold">
                      <Link href="/document-submission">Submit Documents</Link>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-4 sm:px-6 py-12 pb-16 w-full">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-stretch">

            {/* Left Column: Image Card + Badge */}
            <div className="flex flex-col gap-3">
              {/* Image Box */}
              <div className="relative w-full aspect-[4/3] md:aspect-[1/1] lg:aspect-[4/5] rounded-[2rem] overflow-hidden border border-border/40 shadow-sm">
                <Image src="/about.jpg" alt="Compassionate memorial service" fill
                  className="object-cover object-center" />
              </div>
              {/* Promo Badge Box */}
              <div className="bg-[#F4F8FC] border border-[#E2ECF7] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xl font-black text-primary block leading-none">20% OFF</span>
                  <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">Pre-planning arrangements</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono tracking-wider text-muted-foreground block">VALID UNTIL</span>
                  <span className="text-xs font-bold text-foreground block mt-0.5">DEC 31, 2025</span>
                </div>
              </div>
            </div>

            {/* Right Column: Staggered Headline + Action Button */}
            <div className="flex flex-col justify-between py-1">
              {/* Staggered Typography Layout */}
              <div className="flex flex-col gap-4 md:gap-3">
                {/* Row 1: COMPASSIONATE + Paragraph */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <h2 className="font-sans text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-none uppercase">Compassionate</h2>
                  <p className="text-[11px] text-muted-foreground max-w-[240px] md:text-right leading-relaxed pt-1 font-medium">
                    Our dedicated professionals guide you through every step, ensuring comfort and dignity during difficult times.
                  </p>
                </div>
                {/* Row 2: CARE FOR EVERY */}
                <div>
                  <h2 className="font-sans text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-none uppercase">Care For Every</h2>
                </div>
                {/* Row 3: Paragraph + FAMILY */}
                <div className="flex flex-col-reverse md:flex-row md:items-end justify-between gap-4">
                  <p className="text-[11px] text-muted-foreground max-w-[240px] leading-relaxed pb-1 font-medium">
                    Serving families across Quezon Province since 2004 with integrity, respect, and customized packages.
                  </p>
                  <h2 className="font-sans text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-none uppercase">Family</h2>
                </div>
              </div>

              {/* Pill Button */}
              <div className="mt-8 md:mt-0">
                <Link href="/services"
                  className="w-full h-14 rounded-full bg-gradient-to-r from-[#DDEBF7] via-[#E7F3FC] to-[#DDEBF7] border border-[#CDE1F2] hover:opacity-95 transition-opacity flex items-center justify-center gap-2 group shadow-sm">
                  <span className="text-xs font-bold text-sky-900 tracking-wider uppercase">Book A Service Now</span>
                  <ArrowRight className="h-4 w-4 text-sky-900 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
