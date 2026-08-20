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

export default function HomePage() {
  const router = useRouter()

  // Always start collapsed=true on both server and client to avoid
  // hydration mismatch. Sync from localStorage after mount.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored !== null) setSidebarCollapsed(stored === 'true')
    setMounted(true)
  }, [])

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
        Desktop: margin-left tracks sidebar width — only applied after mount
        to avoid SSR/client hydration mismatch.
        Mobile: sidebar is hidden so marginLeft has no visible effect.
      */}
      <div
        className="flex flex-col min-w-0"
        style={mounted ? {
          marginLeft: sidebarCollapsed ? 60 : 280,
          transition: 'margin-left 200ms ease-in-out',
        } : undefined}
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
