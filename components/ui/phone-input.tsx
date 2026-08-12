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
 * - Max 12 digits total (PH format: +63 9XX XXX XXXX)
 */
export function PhoneInput({ value, onChange, className, required, id }: PhoneInputProps) {
  const PREFIX = '+63 '

  // Ensure value always starts with prefix
  const displayValue = value.startsWith('+63') ? value : PREFIX

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    // Protect the prefix — never let it be deleted
    if (!raw.startsWith('+63')) {
      onChange(PREFIX)
      return
    }

    // Strip prefix, keep only digits from the rest
    const afterPrefix = raw.slice(4).replace(/\D/g, '')

    // Limit to 10 digits after +63 (standard PH mobile: 9XX XXX XXXX)
    const trimmed = afterPrefix.slice(0, 10)

    onChange('+63 ' + trimmed)
  }

  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      required={required}
      placeholder="+63 9XX XXX XXXX"
      className={cn(className)}
    />
  )
}
