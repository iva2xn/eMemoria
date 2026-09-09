'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (val: string) => void
  className?: string
  required?: boolean
  id?: string
}

/**
 * Phone input that:
 * - Always prefixes +63
 * - Accepts digits only after the prefix
 * - Auto-formats as +63 9XX-XXX-XXXX
 * - Stores raw value as +63 9XXXXXXXXX (no dashes) for DB consistency
 */
export function PhoneInput({ value, onChange, className, required, id }: PhoneInputProps) {
  const PREFIX = '+63 '

  // Format digits into XXX-XXX-XXXX display
  const formatDigits = (digits: string): string => {
    // digits = up to 10 chars after +63 space
    const d = digits.replace(/\D/g, '').slice(0, 10)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  }

  // Strip dashes to get raw digits for storage
  const rawDigits = value.startsWith('+63')
    ? value.slice(4).replace(/\D/g, '').slice(0, 10)
    : ''

  const displayValue = PREFIX + formatDigits(rawDigits)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    if (!raw.startsWith('+63')) {
      onChange(PREFIX)
      return
    }

    // Strip prefix and all non-digits
    const digits = raw.slice(4).replace(/\D/g, '').slice(0, 10)

    // Store as +63 9XXXXXXXXX (raw, no dashes) — display layer adds dashes
    onChange('+63 ' + digits)
  }

  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      required={required}
      placeholder="+63 9XX-XXX-XXXX"
      className={cn(className)}
    />
  )
}
