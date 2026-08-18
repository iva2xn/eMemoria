'use client'

import { useState, useEffect } from 'react'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroHeader } from '@/components/header'

const SIDEBAR_KEY = 'home:sidebarCollapsed'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Always start collapsed — avoids SSR/client mismatch.
  // useEffect syncs from localStorage after first paint.
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    // If never set, keep collapsed (default). Otherwise restore saved state.
    if (stored !== null) setCollapsed(stored === 'true')
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
      <div
        className="flex flex-col min-w-0 min-h-screen"
        style={{
          marginLeft: collapsed ? '60px' : '280px',
          transition: 'margin-left 200ms ease-in-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
