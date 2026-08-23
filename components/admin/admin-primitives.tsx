'use client'

import React from 'react'

// Shared small primitives used across all admin tab components

export type BadgeVariant = 'green' | 'amber' | 'red' | 'muted' | 'blue'

// Pill badge — used in non-table contexts (doc submissions, columbarium, etc.)
const BADGE_CLS: Record<BadgeVariant, string> = {
  green: 'bg-primary/10 text-primary border-primary/20',
  amber: 'bg-muted text-muted-foreground border-border',
  red:   'bg-destructive/10 text-destructive border-destructive/20',
  muted: 'bg-muted text-muted-foreground border-border',
  blue:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
}

// Plain text color — used in table cells (payments, transactions, sales report)
const PLAIN_CLS: Record<BadgeVariant, string> = {
  green: 'text-primary',
  amber: 'text-muted-foreground',
  red:   'text-destructive',
  muted: 'text-muted-foreground',
  blue:  'text-muted-foreground',
}

const DOT_CLS: Record<BadgeVariant, string> = {
  green: 'bg-primary',
  amber: 'bg-muted-foreground',
  red:   'bg-destructive',
  muted: 'bg-muted-foreground/40',
  blue:  'bg-muted-foreground/40',
}

export function Badge({ label, variant, plain }: { label: string; variant: BadgeVariant; plain?: boolean }) {
  if (plain) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${PLAIN_CLS[variant]}`}>
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_CLS[variant]}`} />
        {label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[10px] border ${BADGE_CLS[variant]}`}>
      {label}
    </span>
  )
}

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-2xl bg-muted/10">
      {message}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="py-20 flex justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-border rounded-2xl bg-card">
      <table className="w-full text-left text-xs border-collapse">
        {children}
      </table>
    </div>
  )
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border ${right ? 'text-right' : ''}`}>
      {children}
    </th>
  )
}

export function FilterPills<T extends string>({
  options, active, onChange,
}: {
  options: { value: T; label: string }[]
  active: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
            active === o.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder={placeholder ?? 'Search…'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
      />
    </div>
  )
}

export const inputCls = 'w-full h-10 px-3.5 rounded-xl bg-background border border-border/80 text-sm text-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 appearance-none'

/**
 * Fully custom dropdown — no native <select>, so the OS dark popover
 * never appears. Used for compact inline selectors in card/chart headers.
 */
export function MiniSelect<T extends string | number>({
  value,
  options,
  onChange,
  onClick,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onClick?.(e); setOpen(v => !v) }}
        className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-lg bg-background border border-border/60 text-[11px] font-semibold text-foreground hover:border-primary/50 focus:outline-none transition-all cursor-pointer"
      >
        {selected?.label ?? String(value)}
        <svg
          className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 10 6"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Custom dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[110px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {options.map(o => (
            <button
              key={String(o.value)}
              type="button"
              onClick={e => { e.stopPropagation(); onChange(o.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-left transition-colors ${
                o.value === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/60'
              }`}
            >
              {o.value === value && (
                <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className={o.value === value ? '' : 'ml-[14px]'}>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
