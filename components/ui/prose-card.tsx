import React from 'react'
import { cn } from '@/lib/utils'

interface ProseCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

/**
 * A card wrapper for long-form prose content (About, Privacy, Terms pages).
 * Renders a title, optional subtitle/date, and a prose-styled content area.
 */
export function ProseCard({ title, subtitle, children, className }: ProseCardProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border/40 p-8 md:p-12 shadow-sm', className)}>
      <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">{title}</h1>
      {subtitle && (
        <p className="text-muted-foreground mb-8">{subtitle}</p>
      )}
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/80">
        {children}
      </div>
    </div>
  )
}
