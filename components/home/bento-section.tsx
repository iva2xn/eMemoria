import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight, Phone } from 'lucide-react'

const IMAGE_CARDS = [
  { img: '/services/traditional.png', title: 'Traditional Burial',  sub: 'Full service',       href: '/services/traditional' },
  { img: '/services/cremation.png',   title: 'Cremation Services',  sub: 'Dignified & serene', href: '/services/cremation' },
  { img: '/services/columbarium.png', title: 'Columbarium',         sub: 'Eternal rest',       href: '/columbarium' },
]

const SERVICES = [
  { img: '/traditional/OMB.png',           label: 'OMB Package',    detail: 'Traditional burial', price: '₱25,000', href: '/services/traditional' },
  { img: '/traditional/HALFGLASS.png',     label: 'Half Glass',     detail: 'Traditional burial', price: '₱35,000', href: '/services/traditional' },
  { img: '/traditional/SRFULLGLASS.png',   label: 'SR Full Glass',  detail: 'Traditional burial', price: '₱57,000', href: '/services/traditional' },
  { img: '/traditional/ORDINARYMETAL.png', label: 'Ordinary Metal', detail: 'Traditional burial', price: '₱75,000', href: '/services/traditional' },
  { img: '/urns/wooden.png',               label: 'Wooden Urn',     detail: 'Cremation add-on',   price: '₱3,500',  href: '/services/cremation' },
  { img: '/urns/graymetal.png',            label: 'Gray Metal Urn', detail: 'Cremation add-on',   price: '₱5,500',  href: '/services/cremation' },
]

export function BentoSection() {
  return (
    <section className="w-full bg-background px-4 sm:px-6 py-4">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-3">

        {/* ── TOP: 3 image cards ── */}
        <div className="grid grid-cols-3 gap-3 h-[45vh] min-h-[240px]">
          {IMAGE_CARDS.map((card) => (
            <Link key={card.title} href={card.href}
              className="relative rounded-2xl overflow-hidden group block"
            >
              <Image src={card.img} alt={card.title} fill priority
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/70" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-sm leading-tight">{card.title}</p>
                <p className="text-white/60 text-xs mt-0.5">{card.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── BOTTOM: service list + CTA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">

          {/* Service list */}
          <div className="bg-card border border-border rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-muted-foreground">
                Packages &amp; Products
              </p>
              <Link href="/services"
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline underline-offset-2">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              {SERVICES.map((s, i) => (
                <Link key={s.label} href={s.href}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 lg:[&:nth-child(5)]:border-b-0 lg:[&:nth-child(6)]:border-b-0 group hover:bg-muted/40 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl overflow-hidden border border-border shrink-0 bg-muted">
                    <Image src={s.img} alt={s.label} width={44} height={44}
                      className="object-cover object-center w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.detail}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground whitespace-nowrap shrink-0 ml-3">{s.price}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA card */}
          <div
            className="rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative"
            style={{ backgroundColor: 'rgb(15, 23, 42)' }}
          >
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10 blur-3xl pointer-events-none"
              style={{ backgroundColor: 'var(--primary)' }} />

            <img src="/Calling-bro.svg" alt="" aria-hidden
              className="relative w-full max-h-32 object-contain mb-2" />

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Clock className="h-3 w-3 text-white" />
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">24 / 7</span>
              </div>
              <p className="font-serif font-bold text-white text-lg leading-snug">
                We're Here for You
              </p>
              <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Always available — day or night.
              </p>
            </div>

            <div className="relative flex flex-col gap-2 mt-3">
              <Button asChild size="sm"
                className="w-full rounded-xl font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/contact">
                  <Phone className="h-3.5 w-3.5" /> Contact Now
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
