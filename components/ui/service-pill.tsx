import React from 'react'

interface ServicePillProps {
  icon: React.ReactNode
  label: string
}

/**
 * Icon pill used in the homepage hero infinite slider.
 */
export function ServicePill({ icon, label }: ServicePillProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/10 bg-card hover:border-accent-foreground/30 transition-all duration-300 shadow-2xs">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
        {icon}
      </div>
      <span className="text-xs font-semibold tracking-wide text-foreground whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}
