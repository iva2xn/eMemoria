import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

interface ServiceCardProps {
  title: string
  description: string
  href: string
  /** Path to the card image (from /public). Falls back to a muted placeholder. */
  imageSrc?: string
  imageAlt?: string
}

/**
 * Service card with a full-bleed image, a bottom-up white gradient overlay,
 * and the title + description rendered in white on top of the gradient.
 *
 * Fixed height: 280px mobile → 360px md → 420px lg
 */
export function ServiceCard({ title, description, href, imageSrc, imageAlt }: ServiceCardProps) {
  return (
    <Link href={href} className="block group h-full">
      <div className="relative h-[280px] md:h-[360px] lg:h-[420px] rounded-2xl overflow-hidden border border-border shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">

        {/* Image layer */}
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Placeholder when no image is provided */
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/60" />
        )}

        {/* Bottom-up white gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, var(--background) 0%, var(--background) 30%, rgba(255,255,255,0.15) 65%, transparent 100%)'
          }}
        />

        {/* Text content — sits above the gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground mb-1.5 leading-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
          <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary group-hover:gap-2 transition-all duration-200">
            Learn more <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

      </div>
    </Link>
  )
}
