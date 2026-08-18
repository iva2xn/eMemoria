'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { HeroHeader } from '@/components/header'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSections } from '@/components/home/home-sections'
import { LAST_PAGE_KEY } from '@/components/last-page-tracker'

const SIDEBAR_KEY = 'home:sidebarCollapsed'

export default function HomePage() {
  const router = useRouter()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })

  // Redirect to last visited page if there is one
  useEffect(() => {
    const last = localStorage.getItem(LAST_PAGE_KEY)
    if (last && last !== '/') {
      // Clear so a deliberate nav to '/' later stays on home
      localStorage.removeItem(LAST_PAGE_KEY)
      router.replace(last)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep sidebar collapsed state in sync
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

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
