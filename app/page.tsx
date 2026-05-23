'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ServicePill } from '@/components/ui/service-pill'
import Image from 'next/image'
import { HeroHeader } from '@/components/header'
import { InfiniteSlider } from '@/components/motion-primitives/infinite-slider'
import { ProgressiveBlur } from '@/components/motion-primitives/progressive-blur'
import {
  Compass, Award, Calendar, Truck, Sparkles,
  FileText, Home, CheckCircle2, X,
} from 'lucide-react'

const SERVICE_PILLS = [
  { icon: <Calendar className="h-3 w-3" />, label: 'Wake / memorial arrangements' },
  { icon: <Truck className="h-3 w-3" />, label: 'Body retrieval / transfer' },
  { icon: <Sparkles className="h-3 w-3" />, label: 'Embalming / body preparation' },
  { icon: <Award className="h-3 w-3" />, label: 'Casket / coffin arrangements' },
  { icon: <Truck className="h-3 w-3" />, label: 'Funeral hearse transportation' },
  { icon: <Compass className="h-3 w-3" />, label: 'Burial coordination' },
  { icon: <FileText className="h-3 w-3" />, label: 'Documentation assistance (death certificate / permits)' },
  { icon: <Home className="h-3 w-3" />, label: 'Chapel or home wake setup (branch dependent)' },
]

export default function HeroSection() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowToast(true)
      // Clean the URL without reloading
      router.replace('/', { scroll: false })
      // Auto-dismiss after 6s
      const t = setTimeout(() => setShowToast(false), 6000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

  return (
    <>
      {/* ── Payment success toast ── */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-card border border-border shadow-xl max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Payment Submitted</p>
            <p className="text-xs text-muted-foreground leading-snug">Our team will verify and reach out to you shortly.</p>
          </div>
          <button onClick={() => setShowToast(false)}
            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <HeroHeader />
      <main className="@container overflow-x-hidden bg-[var(--surface-page)] dark:bg-[var(--dark-page)]">
        {/* HERO SECTION */}
        <section
          className="relative overflow-hidden flex items-center w-full"
          style={{ minHeight: 'calc(100dvh - 4rem)' }}
        >
          {/* Background Image */}
          <div className="absolute inset-0 z-0 w-full">
            <Image
              src="/sky.png"
              alt="Serene sky background"
              fill
              priority
              className="object-cover object-right lg:object-center w-full"
            />
            {/* Mobile Overlay */}
            <div className="absolute inset-0 pointer-events-none lg:hidden bg-gradient-to-b from-background/95 via-background/70 to-transparent" />
            <div
              className="absolute inset-0 pointer-events-none hidden lg:block"
              style={{
                background: 'linear-gradient(to right, var(--background) 0%, var(--background) 20%, transparent 100%)'
              }}
            />
          </div>

          {/* Hero content */}
          <div className="relative z-10 w-full" style={{ paddingTop: 'clamp(3rem, 8vh, 6rem)', paddingBottom: 'clamp(8rem, 16vh, 12rem)' }}>
            <div className="relative mx-auto flex max-w-6xl flex-col px-6 lg:block">
              <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-foreground/15 text-xs font-bold uppercase tracking-widest text-foreground/60">
                  <Award className="h-3.5 w-3.5" /> Est. Since 2004
                </span>
                <h1 className="mt-6 max-w-2xl text-balance text-4xl font-serif font-bold md:text-5xl lg:mt-10 xl:text-6xl text-foreground leading-[1.1]">
                  Dignity, Honour &amp; Peace in Every Farewell
                </h1>
                <p className="mt-8 max-w-2xl text-pretty text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
                  Marcelo P. Gayeta Funeral Services provides compassionate care, dignified casket provisions, funeral hearse transport, and custom wake arrangements tailored for Quezon Province families.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="px-6 text-base font-semibold w-full sm:w-auto shadow-md shadow-primary/10 bg-primary hover:bg-primary/95 text-primary-foreground"
                  >
                    <Link href="/services">
                      <span className="text-nowrap">Explore Service Packages</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="px-6 text-base font-semibold w-full sm:w-auto hover:bg-muted/55 border-primary/20"
                  >
                    <Link href="/contact">
                      <span className="text-nowrap">Contact a Counselor</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SERVICES SLIDER */}
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

        {/* FEATURED SERVICES PREVIEW */}
        <section className="py-16 bg-background border-t border-border/40">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-4 md:mb-0">Papalitan pa to di ko pa alam ilalagay haha</h2>
              <Button variant="outline" asChild className="self-start md:self-auto hover:bg-muted/80 border-primary/20">
                <Link href="/services">View All Packages &rarr;</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-accent-foreground/20 transition-all duration-300 group">
                  <div className="h-40 bg-muted/40" />
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <div className="h-4 w-2/3 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted/60 rounded" />
                    <div className="h-3 w-4/5 bg-muted/60 rounded" />
                    <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-auto">
                      <div className="space-y-1">
                        <div className="h-2.5 w-16 bg-muted/50 rounded" />
                        <div className="h-3.5 w-24 bg-muted rounded" />
                      </div>
                      <Button asChild variant="secondary" size="sm" className="font-semibold text-xs">
                        <Link href="/services">Contact Us</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
