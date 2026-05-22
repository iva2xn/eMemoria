import React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertBannerProps {
  variant: 'error' | 'success'
  message: string
  icon?: React.ReactNode
  className?: string
}

export function AlertBanner({ variant, message, icon, className }: AlertBannerProps) {
  const isError = variant === 'error'

  const defaultIcon = isError
    ? <AlertCircle className="h-4 w-4 shrink-0" />
    : <CheckCircle2 className="h-4 w-4 shrink-0" />

  return (
    <div
      className={cn(
        'p-3.5 rounded-lg flex items-center gap-2 text-sm border',
        isError
          ? 'bg-destructive/15 text-destructive border-destructive/20'
          : 'bg-primary/15 text-primary border-primary/20',
        className
      )}
    >
      {icon ?? defaultIcon}
      <span>{message}</span>
    </div>
  )
}
