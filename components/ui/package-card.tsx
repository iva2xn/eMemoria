'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Check, X, ChevronRight } from 'lucide-react'

const PREVIEW_COUNT = 4

interface PackageCardProps {
  title: string
  price: string
  features: string[]
  onAvail?: () => void
}

export function PackageCard({ title, price, features, onAvail }: PackageCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const preview = features.slice(0, PREVIEW_COUNT)
  const remaining = features.length - PREVIEW_COUNT

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        {/* Image area */}
        <div className="relative h-44 bg-muted/50 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest">Photo</span>
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--card) 0%, transparent 55%)' }}
          />
        </div>

        {/* Body */}
        <div className="px-5 pb-5 -mt-1">
          {/* Title + price */}
          <div className="flex flex-col gap-0.5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Funeral Package
            </p>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl font-bold text-foreground leading-tight">{title}</h2>
              <span className="font-serif text-lg font-bold text-foreground shrink-0">{price}</span>
            </div>
          </div>

          {/* Preview pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {preview.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground border border-border/60"
              >
                <Check className="h-2.5 w-2.5 text-primary shrink-0" />
                {f}
              </span>
            ))}
            {remaining > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 text-[11px] font-semibold text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
              >
                +{remaining} more <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-3.5 border-t border-border/50">
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              View all inclusions
            </button>
            <Link
              href="/contact"
              onClick={onAvail}
              className="inline-flex items-center justify-center h-9 px-5 rounded-xl bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
            >
              Avail Package
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Funeral Package</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="font-serif text-xl font-bold text-foreground">{title}</h3>
                  <span className="font-serif text-base font-bold text-foreground">{price}</span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Full inclusions list */}
            <div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                All Inclusions — {features.length} items
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex justify-end">
              <Link
                href="/contact"
                onClick={onAvail}
                className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
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
