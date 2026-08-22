'use client'

import { createPortal } from 'react-dom'
import { LogOut, X } from 'lucide-react'
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll'

interface LogoutConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutConfirmModal({ onConfirm, onCancel }: LogoutConfirmModalProps) {
  useLockBodyScroll()

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm font-bold text-foreground">Sign Out</p>
          </div>
          <button
            onClick={onCancel}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to sign out of your account?
          </p>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
