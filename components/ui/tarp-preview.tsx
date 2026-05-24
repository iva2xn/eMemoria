'use client'

import Image from 'next/image'
import { useRef, useEffect, useState } from 'react'

interface TarpPreviewProps {
  firstName: string
  middleName?: string
  lastName: string
  birthDate: string
  deathDate: string
  age: string | number
  photoUrl?: string | null
  venueAddress?: string
  contactNumber?: string
  fullName?: string // legacy
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).toUpperCase()
}

// Font size based on text length — fixed px values (not cqw)
function lineFontPx(text: string): number {
  const len = text.length
  if (len <= 6)  return 62
  if (len <= 9)  return 52
  if (len <= 13) return 42
  if (len <= 18) return 34
  if (len <= 24) return 27
  return 21
}

// Fixed canvas size — always renders at this size, then scales down
const CANVAS_W = 700
const CANVAS_H = 390

export function TarpPreview({
  firstName,
  middleName,
  lastName,
  birthDate,
  deathDate,
  age,
  photoUrl,
  venueAddress,
  contactNumber,
  fullName,
}: TarpPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Measure wrapper width and compute scale
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      setScale(w / CANVAS_W)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Resolve names
  let line1 = (firstName || 'FIRST NAME').trim().toUpperCase()
  let line2 = (lastName  || 'LAST NAME').trim().toUpperCase()
  const mid  = middleName?.trim()

  if (fullName && !firstName) {
    const parts = fullName.trim().toUpperCase().split(' ')
    line1 = parts[0] ?? 'FIRST NAME'
    line2 = parts[parts.length - 1] ?? 'LAST NAME'
  }

  const line1Display = mid ? `${line1} ${mid.toUpperCase().charAt(0)}.` : line1

  const nameStyle = (px: number): React.CSSProperties => ({
    fontFamily: 'Impact, "Arial Black", sans-serif',
    color: '#1a237e',
    fontSize: px,
    WebkitTextStroke: '2px white',
    paintOrder: 'stroke fill',
    textShadow: '2px 2px 0 rgba(0,0,0,0.15)',
    lineHeight: 0.95,
    letterSpacing: '-0.01em',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'clip',
    textAlign: 'center',
    width: '100%',
  })

  const datePx = 18
  const dateStyle: React.CSSProperties = {
    fontFamily: 'Impact, "Arial Black", sans-serif',
    fontSize: datePx,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    display: 'block',
  }

  const BOTTOM_H = CANVAS_H * 0.24
  const MAIN_H   = CANVAS_H - BOTTOM_H
  const LEFT_W   = CANVAS_W * 0.50
  const RIGHT_W  = CANVAS_W - LEFT_W
  const PAD      = 28

  return (
    // Outer wrapper: aspect-ratio keeps the border flush with the content
    // at every size — no height mismatch on first render
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        maxWidth: CANVAS_W,
        aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        border: '2px solid rgba(34,197,94,0.3)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      {/* Fixed-size inner canvas, scaled down */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        {/* ── BACKGROUND IMAGE ── */}
        <Image
          src="/obituarybg.png"
          alt=""
          fill
          style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 0 }}
          priority
        />

        {/* ── MAIN AREA ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: MAIN_H, display: 'flex', zIndex: 1 }}>

          {/* LEFT: name + logo + dates — padded left, centered vertically */}
          <div style={{
            width: LEFT_W,
            paddingTop: PAD,
            paddingBottom: PAD,
            paddingLeft: PAD,
            paddingRight: 8,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
            {/* Line 1: first name [+ middle initial] */}
            <span style={nameStyle(lineFontPx(line1Display))}>{line1Display}</span>
            {/* Line 2: last name */}
            <span style={nameStyle(lineFontPx(line2))}>{line2}</span>

            {/* Logo + dates */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', background: 'white', border: '1.5px solid rgba(34,197,94,0.3)', flexShrink: 0 }}>
                <Image src="/logo.png" alt="M.P. Gayeta" fill className="object-cover" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={dateStyle}>
                  {birthDate ? `BORN : ${formatDisplayDate(birthDate)}` : <span style={{ opacity: 0.3 }}>BORN : —</span>}
                </span>
                <span style={dateStyle}>
                  {deathDate ? `DIED : ${formatDisplayDate(deathDate)}` : <span style={{ opacity: 0.3 }}>DIED : —</span>}
                </span>
                {age && <span style={dateStyle}>{age} YEARS OLD</span>}
              </div>
            </div>
          </div>

          {/* RIGHT: photo — padded right, centered vertically */}
          <div style={{
            width: RIGHT_W,
            paddingTop: PAD,
            paddingBottom: 0,
            paddingLeft: 8,
            paddingRight: PAD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {photoUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image
                  src={photoUrl}
                  alt={`${line1} ${line2}`}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(0,0,0,0.25)', textAlign: 'center' }}>Photo<br />Here</span>
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM BAND ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: BOTTOM_H, zIndex: 1 }}>
          <div style={{ height: '40%', background: 'rgba(255,255,255,0.95)', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              M.G. FUNERAL HOMES
            </span>
          </div>
          <div style={{ height: '60%', background: 'rgb(34,197,94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
            <span style={{ fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 17, color: 'white', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
              title={venueAddress}>
              {venueAddress ? venueAddress.toUpperCase() : <span style={{ opacity: 0.4 }}>VENUE ADDRESS</span>}
            </span>
            <span style={{ fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 16, color: 'white', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
              {contactNumber ? `CONTACT NOS. : ${contactNumber}` : <span style={{ opacity: 0.4 }}>CONTACT NUMBER</span>}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
