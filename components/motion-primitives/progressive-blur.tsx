import React from 'react'

interface ProgressiveBlurProps {
  className?: string
  direction?: 'top' | 'bottom' | 'left' | 'right'
  blurIntensity?: number
}

export function ProgressiveBlur({
  className = '',
  direction = 'left',
  blurIntensity = 1,
}: ProgressiveBlurProps) {
  // Simulates progressive blur by creating an elegant gradient mask or overlays.
  // Tailwind v4 uses standard gradient backgrounds.
  const getGradientClass = () => {
    switch (direction) {
      case 'left':
        return 'bg-gradient-to-r from-background to-transparent'
      case 'right':
        return 'bg-gradient-to-l from-background to-transparent'
      case 'top':
        return 'bg-gradient-to-b from-background to-transparent'
      case 'bottom':
        return 'bg-gradient-to-t from-background to-transparent'
      default:
        return 'bg-gradient-to-r from-background to-transparent'
    }
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${getGradientClass()} ${className}`}
      style={{
        opacity: blurIntensity * 0.9,
        backdropFilter: `blur(${blurIntensity * 4}px)`,
        WebkitBackdropFilter: `blur(${blurIntensity * 4}px)`,
      }}
    />
  )
}
