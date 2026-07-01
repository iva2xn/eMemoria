'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-7 w-12" />

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative h-7 w-12 rounded-full border border-border bg-muted transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden ${className ?? ''}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun  className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-amber-500" />
      <Moon className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm border border-border/60 transition-transform duration-200 ${
          isDark ? 'translate-x-[26px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
