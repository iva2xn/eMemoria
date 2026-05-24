'use client'

// Shared small primitives used across all admin tab components

export type BadgeVariant = 'green' | 'amber' | 'red' | 'muted' | 'blue'

export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    green: 'bg-primary text-primary-foreground border-primary',
    amber: 'bg-amber-500 text-white border-amber-500',
    red:   'bg-red-500 text-white border-red-500',
    muted: 'bg-muted border-border/30 text-muted-foreground',
    blue:  'bg-primary text-primary-foreground border-primary',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${cls[variant]}`}>
      {label}
    </span>
  )
}

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-xl font-bold text-foreground">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-2xl bg-muted/10">
      {message}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="py-16 flex justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export const inputCls = 'w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all'
