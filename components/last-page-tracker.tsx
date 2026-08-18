'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Pages that should never be saved as "last visited" —
// auth pages, admin, and the home root itself.
const EXCLUDED = ['/', '/auth/login', '/auth/register', '/auth/reset-password', '/admin']

const KEY = 'site:lastPage'

/**
 * Silently records the current pathname to localStorage on every navigation.
 * Drop this in the root layout — it has no visible output.
 */
export function LastPageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const shouldSave = !EXCLUDED.some(ex =>
      pathname === ex || pathname.startsWith('/auth') || pathname.startsWith('/admin')
    )
    if (shouldSave) {
      localStorage.setItem(KEY, pathname)
    }
  }, [pathname])

  return null
}

export const LAST_PAGE_KEY = KEY
