'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  id?: string
  labelSuffix?: React.ReactNode
  wrapperClassName?: string
}

/**
 * A styled <select> with a custom chevron overlay.
 * Used in billing, contact, and admin pages.
 */
export function SelectField({
  label,
  id,
  labelSuffix,
  wrapperClassName,
  className,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
        >
          {label}
          {labelSuffix}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={cn(
            'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm',
            'focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-300',
            'appearance-none font-medium',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
          <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
