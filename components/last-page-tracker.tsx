'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const EXCLUDED_PREFIXES = ['/auth', '/admin']
const EXCLUDED_EXACT    = ['/']

export const LAST_PAGE_KEY = 'site:lastPage'

/**
 * Saves the current page to localStorage on every navigation,
 * excluding home, auth, and admin routes.
 * Rendered in the root layout — no visible output.
 */
export function LastPageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const isExcluded =
      EXCLUDED_EXACT.includes(pathname) ||
      EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))

    if (!isExcluded) {
      localStorage.setItem(LAST_PAGE_KEY, pathname)
    }
  }, [pathname])

  return null
}
