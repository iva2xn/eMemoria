'use client'

// ClientLayout — used by client-facing pages only (not admin/auth).
// HeroHeader is rendered globally in ClientShell for mobile.
// This component just injects the Footer below each page's content.

import { Footer } from '@/components/footer'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
