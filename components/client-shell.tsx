'use client'

// ClientShell — mounts the sidebar ONCE at the app level so it never
// remounts on page navigation, preventing the width transition from
// replaying every time the user clicks a nav link.
// On /admin routes the sidebar and margin are suppressed entirely.

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HomeSidebar } from '@/components/home/home-sidebar'

const SIDEBAR_KEY = 'home:sidebarCollapsed'

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin  = pathname?.startsWith('/admin')

  const [collapsed, setCollapsed] = useState(true)
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

  // Admin has its own full layout — render children bare
  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — fixed, never remounts across navigations */}
      <HomeSidebar collapsed={collapsed} onCollapsedChange={handleCollapsedChange} />

      {/* Main content area — margin tracks sidebar width on lg+ */}
      <div
        className="flex flex-col min-w-0 min-h-screen"
        style={mounted && isLg ? {
          marginLeft: collapsed ? 60 : 280,
          transition: 'margin-left 200ms ease-in-out',
        } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
