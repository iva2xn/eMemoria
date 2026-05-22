import React from 'react'
import { cn } from '@/lib/utils'

interface ContactInfoItemProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  /** Adds a top border separator — use for all items after the first */
  bordered?: boolean
  className?: string
}

/**
 * Icon + title + content row used in the Contact page info panel.
 */
export function ContactInfoItem({ icon, title, children, bordered, className }: ContactInfoItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4',
        bordered && 'border-t border-border/50 pt-5',
        className
      )}
    >
      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-foreground text-sm">{title}</h4>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}
