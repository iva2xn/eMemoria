'use client'

import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSections } from '@/components/home/home-sections'

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-background">

      {/* Desktop sidebar — hidden on mobile */}
      <HomeSidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[280px]">
        {/* Mobile header — hidden on desktop */}
        <div className="lg:hidden">
          <HeroHeader />
        </div>

        <main className="overflow-x-hidden flex-1">
          <Suspense>
            <HeroSection />
          </Suspense>
          <HomeSections />
        </main>
      </div>

    </div>
  )
}
