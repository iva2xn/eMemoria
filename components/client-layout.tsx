'use client'

import { useState, useEffect } from 'react'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroHeader } from '@/components/header'
import { Footer } from '@/components/footer'

const SIDEBAR_KEY = 'home:sidebarCollapsed'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true) // always true on SSR — no mismatch
  const [mounted,   setMounted]   = useState(false)
  const [isLg,      setIsLg]      = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored !== null) setCollapsed(stored === 'true')

    const mq = window.matchMedia('(min-width: 1024px)')
    setIsLg(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches)
    mq.addEventListener('change', handler)
    setMounted(true)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleCollapsedChange = (v: boolean) => {
    localStorage.setItem(SIDEBAR_KEY, String(v))
    setCollapsed(v)
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeSidebar collapsed={collapsed} onCollapsedChange={handleCollapsedChange} />
      <div className="lg:hidden">
        <HeroHeader />
      </div>
      {/* No <style> tag — margin only applied after mount on lg+ screens */}
      <div
        className="flex flex-col min-w-0 min-h-screen"
        style={mounted && isLg ? {
          marginLeft: collapsed ? 60 : 280,
          transition: 'margin-left 200ms ease-in-out',
        } : undefined}
      >
        {children}
        <Footer />
      </div>
    </div>
  )
}
