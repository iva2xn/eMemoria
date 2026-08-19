'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { HeroHeader } from '@/components/header'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSections } from '@/components/home/home-sections'
import { Footer } from '@/components/footer'
import { LAST_PAGE_KEY } from '@/components/last-page-tracker'

const SIDEBAR_KEY  = 'home:sidebarCollapsed'
const HOME_SEEN_KEY = 'home:seen' // sessionStorage — cleared when tab closes

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(SIDEBAR_KEY)
  return stored !== null ? stored === 'true' : true
}

export default function HomePage() {
  const router = useRouter()

  // Lazy initializer — reads localStorage synchronously, no flash
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(readCollapsed)

  const handleSidebarChange = (v: boolean) => {
    localStorage.setItem(SIDEBAR_KEY, String(v))
    setSidebarCollapsed(v)
  }

  // On fresh load: redirect to last visited page.
  // Once the user has been on home this session, skip the redirect
  // so clicking the Home nav link always works.
  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(HOME_SEEN_KEY)
    // Mark as seen immediately — any subsequent visit to '/' in this
    // tab (e.g. clicking the Home link) will skip the redirect
    sessionStorage.setItem(HOME_SEEN_KEY, '1')

    if (!alreadySeen) {
      // First time hitting '/' this tab session — redirect if there's a saved page
      const last = localStorage.getItem(LAST_PAGE_KEY)
      if (last && last !== '/') {
        router.push(last)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-background">

      {/* Fixed sidebar — lg+ only */}
      <HomeSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={handleSidebarChange}
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
        <Footer />
      </div>
    </div>
  )
}
