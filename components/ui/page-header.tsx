import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

/**
 * Centered page heading block used at the top of content sections
 * (e.g. Obituaries, About). Distinct from PageHero — no background gradient.
 */
export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={cn('text-center mb-12', className)}>
      <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{title}</h1>
      {subtitle && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  )
}
