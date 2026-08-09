'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { CheckCircle2, X, Phone, MapPin, ArrowRight } from 'lucide-react'

export function HeroSection() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
      {/* Toast Notification */}
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
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="px-4 sm:px-6 pt-4 pb-0 w-full">
        <div className="mx-auto max-w-6xl relative">

          {/* Main Hero Card */}
          <div
            className="relative overflow-hidden rounded-[2.25rem] sm:rounded-br-none"
            style={{ minHeight: 'clamp(440px, 62vh, 580px)' }}
          >
            {/* Background Image */}
            <Image 
              src="/sky.png" 
              alt="Serene sky background" 
              fill 
              priority
              className="object-cover object-center" 
            />

            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-transparent" />

            {/* Content Area */}
            <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-12 py-16 max-w-xl">
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/70 mb-4">
                Serving your family's journey
              </p>
              <h1 className="font-serif font-bold text-white leading-[1.1] text-balance text-4xl sm:text-5xl xl:text-[3.25rem]">
                Dignity, Honour &amp; Peace in Every Farewell
              </h1>
              <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed max-w-sm">
                Compassionate full-service memorial care for Quezon Province families — when it matters most.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button 
                  asChild 
                  size="lg"
                  className="rounded-2xl px-7 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  <Link href="/services">Book a Service</Link>
                </Button>
                <Button 
                  asChild 
                  size="lg" 
                  variant="ghost"
                  className="rounded-2xl px-6 font-semibold text-white hover:bg-white/15 gap-1.5"
                >
                  <Link href="/contact">
                    <Phone className="h-4 w-4" /> Contact Us
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom-Right Cutout (Notch) & Info Card */}
          <div className="absolute bottom-0 right-0 hidden sm:block z-20">
            <div className="relative bg-background pl-4 pt-4 rounded-tl-[2rem]">
              
              {/* Left-side Inverted Corner Fillet (w-8 h-8 / 32px matches the 2rem radius perfectly) */}
              <div className="absolute bottom-0 left-0 -translate-x-full w-8 h-8 pointer-events-none">
                <svg className="w-full h-full text-background fill-current" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 0V32H0C17.6731 32 32 17.6731 32 0Z" />
                </svg>
              </div>

              {/* Top-side Inverted Corner Fillet */}
              <div className="absolute top-0 right-0 -translate-y-full w-8 h-8 pointer-events-none">
                <svg className="w-full h-full text-background fill-current" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 0V32H0C17.6731 32 32 17.6731 32 0Z" />
                </svg>
              </div>

              {/* Redesigned Floating Location Card */}
              <div className="group relative bg-card border border-border/50 shadow-md hover:shadow-lg rounded-2xl p-3.5 flex items-center justify-between gap-3 w-[265px] transition-all duration-300 ease-out">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-500/15">
                    <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground leading-none tracking-tight">
                      Sariaya, Quezon
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider leading-none">
                      Est. 2004 • 3 Branches
                    </p>
                  </div>
                </div>

                <Link 
                  href="/about"
                  className="h-8 w-8 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground flex items-center justify-center transition-all duration-300 shrink-0"
                  aria-label="Learn more about our branches"
                >
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>
    </>
  )
}