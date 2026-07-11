'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ServicePill } from '@/components/ui/service-pill'
import { InfiniteSlider } from '@/components/motion-primitives/infinite-slider'
import { ProgressiveBlur } from '@/components/motion-primitives/progressive-blur'
import {
  Compass, Award, Calendar, Truck, Sparkles,
  FileText, Home, CheckCircle2, X,
} from 'lucide-react'

const SERVICE_PILLS = [
  { icon: <Calendar className="h-3 w-3" />, label: 'Wake / memorial arrangements' },
  { icon: <Truck className="h-3 w-3" />,    label: 'Body retrieval / transfer' },
  { icon: <Sparkles className="h-3 w-3" />, label: 'Embalming / body preparation' },
  { icon: <Award className="h-3 w-3" />,    label: 'Casket / coffin arrangements' },
  { icon: <Truck className="h-3 w-3" />,    label: 'Funeral hearse transportation' },
  { icon: <Compass className="h-3 w-3" />,  label: 'Burial coordination' },
  { icon: <FileText className="h-3 w-3" />, label: 'Documentation assistance (death certificate / permits)' },
  { icon: <Home className="h-3 w-3" />,     label: 'Chapel or home wake setup (branch dependent)' },
]

export function HeroSection() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowToast(true)
      router.replace('/', { scroll: false })
      const t = setTimeout(() => setShowToast(false), 6000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

  return (
    <>
      {/* Payment success toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-card border border-border shadow-xl max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Payment Submitted</p>
            <p className="text-xs text-muted-foreground leading-snug">Our team will verify and reach out to you shortly.</p>
          </div>
          <button
            onClick={() => setShowToast(false)}
            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hero */}
      <section
        className="relative overflow-hidden flex items-center w-full"
        style={{ minHeight: 'calc(100dvh - 4rem)' }}
      >
        {/* Background */}
        <div className="absolute inset-0 z-0 w-full">
          <Image
            src="/sky.png"
            alt="Serene sky background"
            fill priority
            className="object-cover object-right lg:object-center w-full"
          />
          {/* Mobile: stronger top-down fade */}
          <div className="absolute inset-0 pointer-events-none lg:hidden bg-gradient-to-b from-background via-background/85 to-background/20" />
          {/* Desktop: left panel fade, deeper coverage */}
          <div
            className="absolute inset-0 pointer-events-none hidden lg:block"
            style={{ background: 'linear-gradient(to right, var(--background) 0%, var(--background) 35%, rgba(0,0,0,0) 65%)' }}
          />
          {/* Subtle vignette bottom */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full" style={{ paddingTop: 'clamp(3rem, 8vh, 6rem)', paddingBottom: 'clamp(8rem, 16vh, 12rem)' }}>
          <div className="relative mx-auto flex max-w-6xl flex-col px-6 lg:block">
            <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">

              <h1 className="text-balance text-4xl font-serif font-bold md:text-5xl xl:text-[3.75rem] text-foreground leading-[1.08]">
                Dignity, Honour &amp; Peace in Every Farewell
              </h1>

              <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
                Compassionate care and full coordination for Quezon Province families — when it matters most.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg" className="px-7 text-sm font-semibold w-full sm:w-auto rounded-xl shadow-lg shadow-primary/20">
                  <Link href="/services">Explore Service Packages</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-7 text-sm font-semibold w-full sm:w-auto rounded-xl border-foreground/20 hover:bg-background/80 hover:border-foreground/30 backdrop-blur-sm">
                  <Link href="/contact">Talk to a Counselor</Link>
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* Services slider */}
        <div className="absolute bottom-0 left-0 right-0 z-10 py-6">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-[11px] lg:text-[11px] font-serif font-bold tracking-widest text-white lg:text-foreground/70 uppercase mb-4 text-center">
              Our Professional Memorial Services
            </p>
          </div>
          <div className="relative overflow-hidden">
            <InfiniteSlider speedOnHover={20} speed={35} gap={24}>
              {SERVICE_PILLS.map((pill, i) => (
                <ServicePill key={i} icon={pill.icon} label={pill.label} />
              ))}
            </InfiniteSlider>
            <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-20" direction="left" blurIntensity={1} />
            <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-20" direction="right" blurIntensity={1} />
          </div>
        </div>
      </section>
    </>
  )
}
