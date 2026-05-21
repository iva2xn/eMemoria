'use client'

import React from 'react'
import Link from 'next/link'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, ChevronRight } from 'lucide-react'

const PLACEHOLDER_PACKAGES = [
  {
    id: 'pkg-1',
    tag: 'Tag',
    name: 'Package Title',
    inclusions: ['Inclusion 1', 'Inclusion 2', 'Inclusion 3', 'Inclusion 4'],
  },
  {
    id: 'pkg-2',
    tag: 'Tag',
    name: 'Package Title',
    inclusions: ['Inclusion 1', 'Inclusion 2', 'Inclusion 3', 'Inclusion 4', 'Inclusion 5'],
  },
  {
    id: 'pkg-3',
    tag: 'Tag',
    name: 'Package Title',
    inclusions: ['Inclusion 1', 'Inclusion 2', 'Inclusion 3', 'Inclusion 4', 'Inclusion 5', 'Inclusion 6'],
  },
]

export default function ServicesPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background dark:bg-[var(--dark-page)]">

        {/* Banner */}
        <section className="relative py-14 bg-gradient-to-b from-[var(--brand-green)]/5 to-background dark:from-[var(--brand-green-light)]/5 dark:to-[var(--dark-page)] border-b border-border/40 text-center overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-6">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-[var(--brand-green)] dark:text-[var(--dark-text)] tracking-tight">
              Memorial Service Packages
            </h1>
          </div>
        </section>

        {/* PACKAGE CARDS */}
        <section className="py-14 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {PLACEHOLDER_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] rounded-2xl overflow-hidden hover:border-[var(--brand-gold)]/30 hover:shadow-[0_4px_25px_rgba(0,0,0,0.03)] transition-all duration-300 group"
              >
                {/* Blank image area */}
                <div className="h-48 bg-muted/40 relative">
                  <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-[var(--brand-gold)] text-[rgb(240,248,255)] text-[10px] font-bold uppercase tracking-widest">
                    {pkg.tag}
                  </div>
                  <div className="absolute bottom-4 left-6 z-20">
                    <h3 className="font-serif text-xl font-bold text-[var(--surface-muted)] mt-0.5">{pkg.name}</h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[var(--brand-gold)]" /> Service Inclusions:
                    </h4>
                    <ul className="space-y-2 text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)] font-medium">
                      {pkg.inclusions.map((inc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--brand-gold)] shrink-0 mt-0.5" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 pt-5 border-t border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] font-semibold uppercase">Rates</span>
                      <span className="text-xs font-serif font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)]">
                        Contact Us
                      </span>
                    </div>
                    <Button asChild className="w-full bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/95 text-[rgb(240,248,255)] font-bold rounded-xl shadow-xs">
                      <Link href="/contact" className="flex items-center justify-center gap-1">
                        Inquire About Package <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </>
  )
}
