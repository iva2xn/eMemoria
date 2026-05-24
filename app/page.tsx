'use client'

import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { HeroSection } from '@/components/home/hero-section'
import { FeaturedServices } from '@/components/home/featured-services'

export default function HomePage() {
  return (
    <>
      <HeroHeader />
      <main className="@container overflow-x-hidden bg-[var(--surface-page)] dark:bg-[var(--dark-page)]">
        <Suspense>
          <HeroSection />
        </Suspense>
        <FeaturedServices />
      </main>
    </>
  )
}
