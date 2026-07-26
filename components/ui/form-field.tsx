'use client'

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  icon?: React.ReactNode
  labelRight?: React.ReactNode
}

export function FormField({
  label,
  id,
  icon,
  labelRight,
  className,
  type,
  ...props
}: FormFieldProps) {
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
          type={isPassword ? (visible ? 'text' : 'password') : type}
          className={cn(
            'w-full h-11 rounded-lg bg-background border border-border/80',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm',
            icon ? 'pl-11' : 'pl-4',
            isPassword ? 'pr-11' : 'pr-4',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible
              ? <EyeOff className="h-4 w-4" />
              : <Eye    className="h-4 w-4" />
            }
          </button>
        )}
      </div>
    </div>
  )
}
