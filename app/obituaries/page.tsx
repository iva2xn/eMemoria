'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { HeroHeader } from '@/components/header'
import { PageHeader } from '@/components/ui/page-header'

export default function ObituariesPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const obituaries = Array.from({ length: 12 }, (_, i) => `/obituaries/obituaries${i + 1}.png`)

  return (
    <>
      <HeroHeader />
      <div className="container mx-auto px-4 py-12 md:py-20">
        <PageHeader
          title="Obituaries"
          subtitle="Honoring and remembering the lives of those we've lost. Click on an obituary to view it in full size."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {obituaries.map((src, index) => (
            <div
              key={index}
              className="group cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              onClick={() => setSelectedImage(src)}
            >
              <div className="relative aspect-[3/2] w-full">
                <Image
                  src={src}
                  alt={`Obituary ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 z-[110] rounded-full bg-black/50 p-2 text-white hover:bg-black/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(null)
              }}
            >
              <X className="h-6 w-6" />
            </button>

            <div
              className="relative w-full max-w-5xl max-h-[90vh] aspect-[4/3] sm:aspect-auto sm:h-[80vh] bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage}
                alt="Obituary Full View"
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
