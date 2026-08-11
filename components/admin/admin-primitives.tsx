'use client'

// Shared small primitives used across all admin tab components

export type BadgeVariant = 'green' | 'amber' | 'red' | 'muted' | 'blue'

const BADGE_CLS: Record<BadgeVariant, string> = {
  green: 'bg-primary/10 text-primary border-primary/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  red:   'bg-red-500/10 text-red-600 border-red-500/20',
  muted: 'bg-muted text-muted-foreground border-border',
  blue:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
}

export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
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

export const inputCls = 'w-full h-10 px-3.5 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
