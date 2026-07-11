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
      {/* ── Toast ── */}
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

      {/* ── Hero ── */}
      <section
        className="relative w-full overflow-hidden bg-background"
        style={{ minHeight: 'calc(100dvh - 4rem)' }}
      >

        {/* ── Full-bleed background image ── */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/sky.png"
            alt="Serene sky background"
            fill priority
            className="object-cover object-right lg:object-center"
          />
          {/* Mobile: strong top fade so text is always readable */}
          <div className="absolute inset-0 pointer-events-none lg:hidden bg-gradient-to-b from-background/95 via-background/80 to-background/30" />
          {/* Desktop: left solid → transparent, image shows fully on the right */}
          <div
            className="absolute inset-0 pointer-events-none hidden lg:block"
            style={{
              background: 'linear-gradient(to right, var(--background) 0%, var(--background) 14%, color-mix(in srgb, var(--background) 50%, transparent) 36%, transparent 55%)',
            }}
          />
          {/* Bottom vignette — blends into slider */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>

        {/* ── Content ── */}
        <div
          className="relative z-10 mx-auto max-w-6xl px-6 lg:px-4 flex flex-col justify-center"
          style={{
            minHeight: 'calc(100dvh - 4rem)',
            paddingBottom: '7rem',
          }}
        >
<div className="max-w-[480px] lg:pl-2">

            {/* Provenance */}
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary/70 mb-7">
              Sariaya, Quezon Province
            </p>

            {/* Headline */}
            <h1 className="font-serif font-bold text-foreground leading-[1.04]">
              <span className="block text-[2.8rem] sm:text-5xl xl:text-[4.5rem]">
                Dignity,
              </span>
              <span className="block text-[2.8rem] sm:text-5xl xl:text-[4.5rem]">
                Honour &amp; Peace
              </span>
              <span className="block text-xl sm:text-2xl xl:text-[1.85rem] text-muted-foreground font-medium mt-3 leading-snug">
                in Every Farewell
              </span>
            </h1>

            {/* Subtext */}
            <p className="mt-6 text-[0.9375rem] text-muted-foreground leading-[1.8] max-w-sm">
              Compassionate care and full coordination for Quezon Province families — when it matters most.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-wrap gap-3 items-center">
              <Button
                asChild size="lg"
                className="rounded-xl px-7 text-sm font-semibold shadow-md shadow-primary/20 h-12"
              >
                <Link href="/services">Explore Service Packages</Link>
              </Button>
              <Button
                asChild size="lg" variant="ghost"
                className="rounded-xl px-5 text-sm font-semibold h-12 text-foreground hover:bg-muted/60 gap-1.5 group"
              >
                <Link href="/contact">
                  Talk to a Counselor
                  <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </Button>
            </div>

          </div>
        </div>

        {/* ── Services slider ── */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="mx-auto max-w-6xl px-6 lg:px-8 mb-3">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div className="relative overflow-hidden pb-5">
            <InfiniteSlider speedOnHover={20} speed={35} gap={20}>
              {SERVICE_PILLS.map((pill, i) => (
                <ServicePill key={i} icon={pill.icon} label={pill.label} />
              ))}
            </InfiniteSlider>
            <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-24" direction="left" blurIntensity={1} />
            <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-24" direction="right" blurIntensity={1} />
          </div>
        </div>

      </section>
    </>
  )
}
