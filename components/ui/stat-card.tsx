import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}

/**
 * Icon + label + value summary card used in the admin dashboard.
 */
export function StatCard({ icon, label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'p-6 bg-card border border-border rounded-2xl flex items-center gap-4',
        'shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-primary/20 transition-all duration-300',
        className
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
        {icon}
      </div>
      <div>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
          {label}
        </span>
        <p className="text-2xl font-serif font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  )
}
