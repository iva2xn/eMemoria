import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeroProps {
  title: string
  subtitle?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Full-width gradient banner used at the top of interior pages.
 * Renders a serif title and optional subtitle centered in the section.
 */
export function PageHero({ title, subtitle, className, children }: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative py-10 bg-gradient-to-b from-primary/5 to-background border-b border-border/40 text-center overflow-hidden',
        className
      )}
    >
      <div className="relative mx-auto max-w-4xl px-6">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
