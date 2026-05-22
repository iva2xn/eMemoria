'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  icon?: React.ReactNode
  /** Extra content rendered to the right of the label (e.g. "Forgot password?" link) */
  labelRight?: React.ReactNode
}

/**
 * A labeled text/email/password input with an optional leading icon.
 * Matches the styling used across login, register, and contact pages.
 */
export function FormField({
  label,
  id,
  icon,
  labelRight,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={cn(
            'w-full h-11 pr-4 rounded-lg bg-background border border-border/80',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm',
            icon ? 'pl-11' : 'pl-4',
            className
          )}
          {...props}
        />
      </div>
    </div>
  )
}
