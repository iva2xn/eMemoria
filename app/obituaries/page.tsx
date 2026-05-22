'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { HeroHeader } from '@/components/header'

export default function ObituariesPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const obituaries = Array.from({ length: 12 }, (_, i) => `/obituaries/obituaries${i + 1}.png`)

  return (
    <>
      <HeroHeader />

      {/* ── PAGE HEADER ── */}
      <div className="border-b border-border/40 bg-muted/30 px-6 py-10 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">Obituaries</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Honoring and remembering the lives of those we&apos;ve lost.
        </p>
      </div>

      {/* ── GRID ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {obituaries.map((src, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(src)}
              className="group w-full overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Obituary ${index + 1}`}
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-5 right-5 z-[110] h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null) }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Obituary"
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}
    </>
  )
}
