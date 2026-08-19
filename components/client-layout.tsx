'use client'

import { useState } from 'react'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { HeroHeader } from '@/components/header'
import { Footer } from '@/components/footer'

const SIDEBAR_KEY = 'home:sidebarCollapsed'

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(SIDEBAR_KEY)
  return stored !== null ? stored === 'true' : true
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads localStorage synchronously — no useEffect flash
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)

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
        <Footer />
      </div>
    </div>
  )
}
