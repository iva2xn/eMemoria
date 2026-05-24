'use client'

// Coverflow carousel for published obituaries.
// Manages its own current-index + auto-advance timer.
// Fires onSelect(obituary) when the active card is clicked.

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { splitName, type RichObituary } from './tarp-card'

const SLIDE_INTERVAL = 5000
const ITEM_W         = 56   // % of track width per card
const SIDE_SCALE     = 0.72
const SIDE_OPACITY   = 0.35

interface ObituarySlideshowProps {
  obituaries: RichObituary[]
  onSelect: (o: RichObituary) => void
}

export function ObituarySlideshow({ obituaries, onSelect }: ObituarySlideshowProps) {
  const [current, setCurrent] = useState(0)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const thumbRef  = useRef<HTMLDivElement>(null)
  const n = obituaries.length

  const scrollThumb = useCallback((idx: number) => {
    const strip = thumbRef.current
    if (!strip) return
    ;(strip.children[idx] as HTMLElement | undefined)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  const go = useCallback((idx: number) => {
    const next = (idx + n) % n
    setCurrent(next)
    scrollThumb(next)
  }, [n, scrollThumb])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        const next = (c + 1) % n
        scrollThumb(next)
        return next
      })
    }, SLIDE_INTERVAL)
  }, [n, scrollThumb])

  useEffect(() => {
    if (n < 2) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [n, resetTimer])

  if (n === 0) return null

  const prev = () => { go(current - 1); resetTimer() }
  const next = () => { go(current + 1); resetTimer() }
  const o    = obituaries[current]

  // Centre the active card: translateX = 50% - (current * ITEM_W + ITEM_W/2)
  const translatePct = 50 - (current * ITEM_W + ITEM_W / 2)

  return (
    <div className="flex flex-col items-center w-full gap-3 select-none">

      {/* Carousel viewport */}
      <div className="relative w-full overflow-hidden">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: `${n * ITEM_W}%`,
            transform: `translateX(${translatePct}%)`,
            transition: 'transform 420ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
        >
          {obituaries.map((ob, i) => {
            const { firstName, middleName, lastName } = splitName(ob.full_name)
            const isActive = i === current
            const dist     = Math.min(Math.abs(i - current), n - Math.abs(i - current))
            const scale    = isActive ? 1 : SIDE_SCALE - Math.max(0, dist - 1) * 0.06
            const opacity  = isActive ? 1 : SIDE_OPACITY
            const blur     = isActive ? 0 : 1

            return (
              <div
                key={ob.id}
                style={{
                  width: `${100 / n}%`,
                  padding: '0 1.5%',
                  flexShrink: 0,
                  transform: `scale(${scale})`,
                  opacity,
                  filter: blur ? `blur(${blur}px)` : 'none',
                  transition: 'transform 420ms cubic-bezier(0.4,0,0.2,1), opacity 420ms ease, filter 420ms ease',
                  cursor: 'pointer',
                  zIndex: isActive ? 2 : 1,
                }}
                onClick={() => isActive ? onSelect(ob) : go(i)}
                role="button"
                tabIndex={isActive ? 0 : -1}
                aria-label={isActive ? `View ${ob.full_name}` : `Go to ${ob.full_name}`}
              >
                <div className={`w-full rounded-2xl overflow-hidden border-2 shadow-lg transition-shadow duration-420 ${
                  isActive ? 'border-primary/50 shadow-primary/10 shadow-xl' : 'border-border/20'
                }`}>
                  <TarpPreview
                    firstName={firstName} middleName={middleName} lastName={lastName}
                    birthDate={ob.birth_date ?? ''} deathDate={ob.death_date ?? ''} age={ob.age ?? ''}
                    photoUrl={ob.photoUrl} venueAddress={ob.venue_address ?? ''} contactNumber={ob.contact_number ?? ''}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Prev / Next */}
        {n > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={next}
              className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Name caption */}
      <div className="text-center">
        <p className="font-serif font-semibold text-foreground text-sm leading-tight">{o.full_name}</p>
        {(o.birth_date || o.death_date) && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {o.birth_date ? new Date(o.birth_date).getFullYear() : '?'}
            {' – '}
            {o.death_date ? new Date(o.death_date).getFullYear() : '?'}
          </p>
        )}
      </div>

      {/* Desktop: thumbnail strip (up to 10) */}
      {n > 1 && (
        <div ref={thumbRef} className="hidden md:flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 max-w-2xl w-full justify-center">
          {obituaries.slice(0, 10).map((ob, i) => {
            const { firstName, middleName, lastName } = splitName(ob.full_name)
            return (
              <button
                key={ob.id}
                onClick={() => { go(i); resetTimer() }}
                aria-label={`Go to ${ob.full_name}`}
                className={`shrink-0 w-14 rounded-md overflow-hidden border-2 transition-all duration-300 focus:outline-none ${
                  i === current
                    ? 'border-primary shadow-sm scale-[1.08]'
                    : 'border-transparent opacity-45 hover:opacity-75 hover:border-border'
                }`}
              >
                <TarpPreview
                  firstName={firstName} middleName={middleName} lastName={lastName}
                  birthDate={ob.birth_date ?? ''} deathDate={ob.death_date ?? ''} age={ob.age ?? ''}
                  photoUrl={ob.photoUrl} venueAddress={ob.venue_address ?? ''} contactNumber={ob.contact_number ?? ''}
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Mobile: dots */}
      {n > 1 && (
        <div className="flex md:hidden justify-center gap-1.5 shrink-0">
          {obituaries.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i); resetTimer() }}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-border hover:bg-muted-foreground'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
