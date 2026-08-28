'use client'

// ClientLayout — used by client-facing pages only (not admin).
// Renders the mobile header and footer. The sidebar and margin logic
// live in ClientShell (app/layout.tsx) and are mounted once globally.

import { HeroHeader } from '@/components/header'
import { Footer } from '@/components/footer'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="lg:hidden">
        <HeroHeader />
      </div>
      {children}
      <Footer />
    </>
  )
}
