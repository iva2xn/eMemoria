import React from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

interface PackageCardProps {
  title: string
  price: string
  features: string[]
  onAvail?: () => void
}

export function PackageCard({ title, price, features, onAvail }: PackageCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:border-border/80">
      {/* Image area */}
      <div className="relative h-48 md:h-56 bg-muted/50 w-full overflow-hidden">
        {/* Placeholder — swap src for a real image when available */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
          <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">Photo</span>
        </div>
        {/* Bottom-up gradient so the card body blends in */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, var(--card) 0%, transparent 50%)'
          }}
        />
      </div>

      {/* Body */}
      <div className="px-6 pb-6 -mt-2">
        {/* Title + price row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Funeral Package
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {title}
            </h2>
          </div>
          <span className="font-serif text-xl md:text-2xl font-bold text-foreground shrink-0">
            {price}
          </span>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {features.map((feature, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground border border-border/60"
            >
              <Check className="h-3 w-3 text-primary shrink-0" />
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-end pt-4 border-t border-border/50">
          <Link
            href="/contact"
            onClick={onAvail}
            className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Avail Package
          </Link>
        </div>
      </div>
    </div>
  )
}
