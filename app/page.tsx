'use client'

import { useState, Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSections } from '@/components/home/home-sections'

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">

      {/* Fixed sidebar — lg+ only */}
      <HomeSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Mobile header */}
      <div className="lg:hidden">
        <HeroHeader />
      </div>

      {/*
        Desktop: margin-left via inline style so it transitions in exact
        sync with the sidebar width (same 200ms ease-in-out, single paint).
        Mobile: sidebar is hidden so no margin needed — overridden by
        the marginLeft being irrelevant below lg breakpoint.
      */}
      <div
        className="flex flex-col min-w-0"
        style={{
          marginLeft: sidebarCollapsed ? '60px' : '280px',
          transition: 'margin-left 200ms ease-in-out',
        }}
      >
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
