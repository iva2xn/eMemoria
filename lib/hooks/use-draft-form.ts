'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Persists a form's text fields to localStorage under `key`.
 * Files are excluded — they can't be serialised.
 *
 * Usage:
 *   const { saveDraft, clearDraft } = useDraftForm('billing-form', {
 *     name, email, phone, method, refNum, amount, notes
 *   }, (saved) => {
 *     setName(saved.name ?? '')
 *     ...
 *   })
 *
 * Call `clearDraft()` on successful submit.
 */
export function useDraftForm<T extends Record<string, string>>(
  key: string,
  values: T,
  restore: (saved: Partial<T>) => void,
) {
  const restoredRef = useRef(false)

  // Restore once on mount
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<T>
        restore(saved)
      }
    } catch {
      // corrupted storage — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Save on every values change (debounced via ref to avoid excess writes)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(values))
      } catch {
        // storage full — ignore
      }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [key, values])

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }, [key])

  return { clearDraft }
}
