'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { ServiceCard } from '@/components/ui/service-card'
import { AuthGateModal } from '@/components/billing/auth-gate-modal'

// SERVICE REGISTRY — static list of all offered services.
// Each entry maps to a ServiceCard; href is the destination page,
// imageSrc is the card's background photo.
const SERVICES = [
  {
    title: 'Traditional Burial',
    description: 'Complete traditional funeral service with viewing, ceremony, and full burial coordination for your loved one.',
    href: '/services/traditional',
    imageSrc: '/services/traditional.png',
    imageAlt: 'Traditional burial service',
  },
  {
    title: 'Cremation Services',
    description: 'Dignified cremation services with memorial options and a curated selection of urns to honor your loved one.',
    href: '/services/cremation',
    imageSrc: '/services/cremation.png',
    imageAlt: 'Cremation service',
  },
  {
    title: 'Columbarium',
    description: 'A dedicated structure designed to respectfully store and display cremation urns — reserve a niche for your family.',
    href: '/columbarium',
    imageSrc: '/services/columbarium.png',
    imageAlt: 'Columbarium niches',
  },
]

export default function ServicesPage() {
  const supabase  = createClient()
  const router    = useRouter()
  const sliderRef = useRef<HTMLDivElement>(null)

  // null = still checking, false = guest, true = authed
  const [authReady, setAuthReady] = useState<boolean | null>(null)
  // href of the card the user clicked — triggers the gate if not authed
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthReady(!!user)
    })
  }, [supabase])

  // Auto-scroll carousel on mobile
  useEffect(() => {
    const el = sliderRef.current
    if (!el) return

    let index = 0
    const total = SERVICES.length

    const advance = () => {
      index = (index + 1) % total
      const cardWidth = el.scrollWidth / total
      el.scrollTo({ left: cardWidth * index, behavior: 'smooth' })
    }

    const timer = setInterval(advance, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleCardClick = (e: React.MouseEvent, href: string) => {
    // Still loading auth — do nothing and let the link fall through
    if (authReady === null) return

    if (!authReady) {
      // Not logged in — block navigation and show the auth gate
      e.preventDefault()
      setPendingHref(href)
    }
    // Authenticated — allow normal navigation (Link handles it)
  }

  return (
    <ClientLayout>

      {/* Auth gate modal — shown when a guest clicks a service card */}
      {pendingHref !== null && (
        <AuthGateModal returnUrl={pendingHref} />
      )}

      <main className="flex-1 bg-background">
        <section className="py-16 md:py-24">

          <div className="text-center mb-12 md:mb-16 px-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">What We Offer</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-5">
              Our Funeral Services
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Professional, compassionate services tailored to honor your loved one and support your family.
            </p>
          </div>

          {/* Mobile carousel */}
          <div className="md:hidden">
            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 pb-4 no-scrollbar"
              style={{ scrollbarWidth: 'none' }}
            >
              {SERVICES.map(s => (
                <div
                  key={s.href}
                  className="snap-center shrink-0 w-[80vw]"
                  onClick={e => handleCardClick(e, s.href)}
                >
                  <ServiceCard {...s} />
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
              {SERVICES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = sliderRef.current
                    if (!el) return
                    el.scrollTo({ left: (el.scrollWidth / SERVICES.length) * i, behavior: 'smooth' })
                  }}
                  className="h-1.5 w-1.5 rounded-full bg-border hover:bg-foreground/40 transition-colors"
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Desktop grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6">
            {SERVICES.map(s => (
              <div key={s.href} onClick={e => handleCardClick(e, s.href)}>
                <ServiceCard {...s} />
              </div>
            ))}
          </div>

        </section>
      </main>
    </ClientLayout>
  )
}
