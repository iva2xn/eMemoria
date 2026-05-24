// Renders a single obituary as a TarpPreview card.
// Used in both the slideshow and the lightbox.

import { TarpPreview } from '@/components/ui/tarp-preview'
import type { Obituary } from '@/lib/supabase/types'

export type RichObituary = Obituary & { photoUrl: string | null }

export function splitName(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' }
  return {
    firstName:  parts[0],
    lastName:   parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(' '),
  }
}

interface TarpCardProps {
  obituary: RichObituary
  onClick?: () => void
}

export function TarpCard({ obituary, onClick }: TarpCardProps) {
  const { firstName, middleName, lastName } = splitName(obituary.full_name)
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className="w-full block rounded-2xl overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={onClick ? `View ${obituary.full_name}` : undefined}
    >
      <TarpPreview
        firstName={firstName} middleName={middleName} lastName={lastName}
        birthDate={obituary.birth_date ?? ''} deathDate={obituary.death_date ?? ''}
        age={obituary.age ?? ''} photoUrl={obituary.photoUrl}
        venueAddress={obituary.venue_address ?? ''} contactNumber={obituary.contact_number ?? ''}
      />
    </Wrapper>
  )
}
