'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'error' | 'success' | 'info' | 'warning'

interface ToastProps {
  id: string
  variant: ToastVariant
  title: string
  message: string
  onClose: (id: string) => void
  duration?: number
}

function Toast({ id, variant, title, message, onClose, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10)
    // Auto-close
    const t2 = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(id), 300)
    }, duration)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [id, duration, onClose])

  const cfg = {
    error:   { bg: 'bg-destructive',     icon: AlertTriangle,  border: 'border-destructive/80' },
    success: { bg: 'bg-primary',          icon: CheckCircle2,   border: 'border-primary/80' },
    warning: { bg: 'bg-amber-500',        icon: AlertTriangle,  border: 'border-amber-500/80' },
    info:    { bg: 'bg-blue-600',         icon: Info,           border: 'border-blue-600/80' },
  }[variant]

  const Icon = cfg.icon

  return (
    <div
      className={cn(
        'w-full max-w-sm bg-card border rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ease-out',
        cfg.border,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      {/* Accent top bar */}
      <div className={`h-1 w-full ${cfg.bg}`} />
      <div className="flex items-start gap-3 p-4">
        <div className={`h-8 w-8 rounded-xl ${cfg.bg}/10 flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`h-4 w-4 ${
            variant === 'error'   ? 'text-destructive' :
            variant === 'success' ? 'text-primary' :
            variant === 'warning' ? 'text-amber-600' :
                                    'text-blue-600'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{message}</p>
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(() => onClose(id), 300) }}
          className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Toast container (singleton, rendered into body) ───────────
let _addToast: ((opts: Omit<ToastProps, 'id' | 'onClose'>) => void) | null = null

export function ToastContainer() {
  const [toasts, setToasts] = useState<(Omit<ToastProps, 'onClose'> & { id: string })[]>([])

  useEffect(() => {
    _addToast = (opts) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { ...opts, id }])
    }
    return () => { _addToast = null }
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 items-end pointer-events-none w-full max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto w-full">
          <Toast {...t} onClose={remove} />
        </div>
      ))}
    </div>,
    document.body
  )
}

/** Call this anywhere to show a toast notification. */
export function showToast(opts: Omit<ToastProps, 'id' | 'onClose'>) {
  if (_addToast) {
    _addToast(opts)
  }
}
