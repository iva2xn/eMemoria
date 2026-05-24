// Renders the contact info strip (mobile collapsible + desktop 4-col).
// State for the mobile toggle lives here since it's purely UI.

'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, ChevronDown } from 'lucide-react'

const LAT = 13.961961329079667
const LNG = 121.51970450499091
export const MAPS_LINK = `https://www.google.com/maps?q=${LAT},${LNG}`

export const CONTACT_ITEMS = [
  {
    icon: Phone,
    label: 'Emergency Hotline',
    value: '+63 918 901 9978',
    sub: 'Available 24 hours, 7 days a week',
    href: 'tel:+639189019978',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'mgayetafuneralhome@gmail.com',
    sub: 'We respond within the day',
    href: 'mailto:mgayetafuneralhome@gmail.com',
  },
  {
    icon: MapPin,
    label: 'Main Branch',
    value: 'Maharlika Highway, Sitio Sta. Clara',
    sub: 'Brgy. Sampaloc 2, Sariaya, Quezon',
    href: MAPS_LINK,
  },
  {
    icon: Clock,
    label: 'Office Hours',
    value: 'Mon – Sun, 8:00 AM – 5:00 PM',
    sub: 'Wake & retrieval services: 24 / 7',
    href: null,
  },
]

export function ContactDetailsBar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile: collapsible */}
      <div className="md:hidden border-b border-border/40">
        <button
          className="w-full flex items-center justify-between px-6 py-4 bg-background text-sm font-semibold text-foreground"
          onClick={() => setOpen(o => !o)}
        >
          <span className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Contact Details
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="border-t border-border/40 divide-y divide-border/40">
            {CONTACT_ITEMS.map(({ icon: Icon, label, value, sub, href }) => {
              const inner = (
                <div className="px-6 py-4 flex items-start gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                </div>
              )
              return href ? (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block hover:bg-muted/30 transition-colors">{inner}</a>
              ) : <div key={label}>{inner}</div>
            })}
          </div>
        )}
      </div>

      {/* Desktop: 4-col divider row */}
      <div className="hidden md:block border-b border-border/40 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-4 divide-x divide-border/60">
            {CONTACT_ITEMS.map(({ icon: Icon, label, value, sub, href }) => {
              const inner = (
                <div className="px-6 py-6 flex flex-col gap-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground mb-0.5" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{value}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
                </div>
              )
              return href ? (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="hover:bg-muted/30 transition-colors first:pl-0">{inner}</a>
              ) : <div key={label}>{inner}</div>
            })}
          </div>
        </div>
      </div>
    </>
  )
}
