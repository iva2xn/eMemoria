/**
 * Persists the active tab to sessionStorage so that after a page refresh
 * the user lands on the same tab they left.
 *
 * Usage:
 *   const [activeTab, setActiveTab] = usePersistTab('billing', 'payment')
 *
 * @param key       Unique storage key (e.g. 'billing-tab')
 * @param defaultTab Default tab id when nothing is stored
 */
import { useState, useEffect } from 'react'

export function usePersistTab<T extends string>(key: string, defaultTab: T): [T, (tab: T) => void] {
  const storageKey = `tab:${key}`

  const [activeTab, setActiveTabState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultTab
    const stored = sessionStorage.getItem(storageKey)
    return (stored as T) ?? defaultTab
  })

  const setActiveTab = (tab: T) => {
    sessionStorage.setItem(storageKey, tab)
    setActiveTabState(tab)
  }

  // Sync from storage on mount (for SSR hydration safety)
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored && stored !== activeTab) {
      setActiveTabState(stored as T)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [activeTab, setActiveTab]
}
