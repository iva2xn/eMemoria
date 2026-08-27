'use client'

// ClientLayout — thin wrapper used by individual pages.
// The sidebar and margin logic now live in ClientShell (app/layout.tsx)
// so they're mounted once and never remount on navigation.
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
