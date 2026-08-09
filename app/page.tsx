'use client'

import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSections } from '@/components/home/home-sections'

export default function HomePage() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden bg-background">
        <Suspense>
          <HeroSection />
        </Suspense>
        <HomeSections />
      </main>
    </>
  )
}
