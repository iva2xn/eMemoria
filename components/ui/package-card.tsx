'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

const PREVIEW_COUNT = 4

interface PackageCardProps {
  title: string
  price: string
  features: string[]
  onAvail?: () => void
}

function parsePrice(p: string) {
  return p.replace(/[₱,]/g, '').trim()
}

export function PackageCard({ title, price, features, onAvail }: PackageCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const billingUrl = `/billing?product=package&label=${encodeURIComponent(title)}&price=${parsePrice(price)}`

  const preview = features.slice(0, PREVIEW_COUNT)
  const remaining = features.length - PREVIEW_COUNT

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">

        {/* Image area */}
        <div className="relative h-36 sm:h-44 bg-muted/50 w-full overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest">Photo</span>
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--card) 0%, transparent 55%)' }}
          />
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 flex flex-col flex-1">

          {/* Label + title + price */}
          <div className="mb-3 sm:mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Funeral Package
            </p>
            <div className="flex items-baseline justify-between gap-1">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground leading-tight">{title}</h2>
              <span className="font-serif text-sm sm:text-base font-bold text-foreground shrink-0 tabular-nums">{price}</span>
            </div>
          </div>

          {/* ── DESKTOP: 2×2 pill grid + "+N more" row ── */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              {preview.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-medium text-muted-foreground border border-border/60 truncate"
                >
                  <Check className="h-2.5 w-2.5 text-primary shrink-0" />
                  <span className="truncate">{f}</span>
                </span>
              ))}
            </div>
            <div className="h-8 flex items-center mb-4">
              {remaining > 0 && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  +{remaining} more inclusions
                </button>
              )}
            </div>
          </div>

          {/* ── MOBILE: no pills, just a count line ── */}
          <div className="sm:hidden mb-3">
            <p className="text-xs text-muted-foreground">
              {features.length} inclusions
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              View all
            </button>
            <Link
              href={billingUrl}
              onClick={onAvail}
              className="inline-flex items-center justify-center h-8 sm:h-9 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Avail
            </Link>
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funeral Package</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="font-serif text-xl font-bold text-foreground">{title}</h3>
                  <span className="font-serif text-base font-bold text-foreground tabular-nums">{price}</span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                All Inclusions — {features.length} items
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex justify-end">
              <Link
                href={billingUrl}
                onClick={onAvail}
                className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Avail This Package
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
