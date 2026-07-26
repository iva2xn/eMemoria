'use client'

import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { HeroSection } from '@/components/home/hero-section'
import { BentoSection } from '@/components/home/bento-section'

export default function HomePage() {
  return (
    <>
      <HeroHeader />
      <main className="@container overflow-x-hidden bg-[var(--surface-page)] dark:bg-[var(--dark-page)]">
        <Suspense>
          <HeroSection />
        </Suspense>
        <BentoSection />
      </main>
    </>
  )
}
