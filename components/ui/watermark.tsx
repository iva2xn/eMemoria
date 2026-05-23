'use client'

import { usePathname } from 'next/navigation'

const TEXT = 'REVIEW PREVIEW IVANN C'

export function Watermark() {
  // usePathname causes a re-render on every navigation,
  // which is all we need — the watermark itself is static.
  usePathname()

  // Build a grid of rows × cols repetitions
  const cols = 3
  const rows = 8 // enough to fill any viewport height
  const cells = Array.from({ length: rows * cols })

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',   // ← passes ALL clicks/hovers through
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: '100vw',
        height: '100vh',
      }}
    >
      {cells.map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-30deg)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans, sans-serif)',
              fontWeight: 800,
              fontSize: 'clamp(10px, 1.4vw, 18px)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(0, 0, 0, 0.11)',
            }}
          >
            {TEXT}
          </span>
        </div>
      ))}
    </div>
  )
}
