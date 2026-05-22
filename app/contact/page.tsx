'use client'

import React, { useState } from 'react'
import { useStore } from '@/app/context/store'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SelectField } from '@/components/ui/select-field'
import { Phone, Mail, MapPin, Clock, CheckCircle2, ChevronDown } from 'lucide-react'

const LAT = 13.961961329079667
const LNG = 121.51970450499091
const MAPS_EMBED = `https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`
const MAPS_LINK  = `https://www.google.com/maps?q=${LAT},${LNG}`

const CONTACT_ITEMS = [
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

// ── Shared form card ─────────────────────────────────────────
interface FormCardProps {
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
  subject: string; setSubject: (v: string) => void
  message: string; setMessage: (v: string) => void
  success: boolean; setSuccess: (v: boolean) => void
  error: string
  onSubmit: (e: React.FormEvent) => void
}

function FormCard({ name, setName, email, setEmail, subject, setSubject, message, setMessage, success, setSuccess, error, onSubmit }: FormCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      {error && <AlertBanner variant="error" message={error} />}

      {success ? (
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-foreground" />
          </div>
          <p className="font-serif text-lg font-bold text-foreground">Message Received</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            A memorial counselor will reach out to you shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-2 text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="inq-name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
              <input
                id="inq-name" type="text" placeholder="Juan Dela Cruz"
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 outline-hidden transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inq-email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
              <input
                id="inq-email" type="email" placeholder="juan@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 outline-hidden transition-all"
                required
              />
            </div>
          </div>

          <SelectField id="inq-subject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="Funeral Package Inquiry">Funeral Package Inquiry</option>
            <option value="Pre-planning Memorial Schemes">Pre-planning Memorial Schemes</option>
            <option value="Custom Altar / wake Decorations">Custom Chapel Altar Details</option>
            <option value="Columbarium Reservation">Columbarium Reservation</option>
            <option value="General Inquiry">General Inquiry</option>
          </SelectField>

          <div className="space-y-1.5">
            <label htmlFor="inq-msg" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
            <textarea
              id="inq-msg" rows={5}
              placeholder="How can we help you? Include any relevant details about your needs..."
              value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 rounded-xl bg-background border border-border/80 text-sm focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 outline-hidden transition-all resize-none"
              required
            />
          </div>

          <Button type="submit" className="w-full h-11 font-semibold rounded-xl">
            Send Message
          </Button>
        </form>
      )}
    </div>
  )
}

// ── Map block ────────────────────────────────────────────────
function MapBlock() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm aspect-[4/3] w-full">
        <iframe
          src={MAPS_EMBED}
          width="100%" height="100%"
          style={{ border: 0 }}
          allowFullScreen loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="M. P. Gayeta Funeral Services location"
        />
      </div>
      <a
        href={MAPS_LINK} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
      >
        <MapPin className="h-4 w-4" /> Open in Google Maps →
      </a>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function ContactPage() {
  const { submitInquiry } = useStore()

  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('Funeral Package Inquiry')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')
  const [contactOpen, setContactOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!name || !email || !message) { setError('Please fill in all required fields.'); return }
    submitInquiry(name, email, subject, message)
    setSuccess(true)
    setName(''); setEmail(''); setMessage('')
  }

  const formProps = { name, setName, email, setEmail, subject, setSubject, message, setMessage, success, setSuccess, error, onSubmit: handleSubmit }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        {/* ── PAGE HEADER ── */}
        <div className="border-b border-border/40 bg-muted/30 px-6 py-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Get in Touch</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">Contact Us</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Our team is available around the clock to assist your family with care and compassion.
          </p>
        </div>

        {/* ── CONTACT DETAILS ── */}

        {/* Mobile: collapsible dropdown, closed by default */}
        <div className="md:hidden border-b border-border/40">
          <button
            className="w-full flex items-center justify-between px-6 py-4 bg-background text-sm font-semibold text-foreground"
            onClick={() => setContactOpen(o => !o)}
          >
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Contact Details
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${contactOpen ? 'rotate-180' : ''}`} />
          </button>

          {contactOpen && (
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

        {/* ── MOBILE: form → map ── */}
        <div className="md:hidden max-w-xl mx-auto px-6 py-10 space-y-10">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Inquiry Form</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Send a Message</h2>
            </div>
            <FormCard {...formProps} />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Location</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Find Us</h2>
            </div>
            <MapBlock />
          </div>
        </div>

        {/* ── DESKTOP: map left, form right ── */}
        <div className="hidden md:grid max-w-6xl mx-auto px-6 py-14 grid-cols-2 gap-12 items-start">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Location</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Find Us</h2>
            </div>
            <MapBlock />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Inquiry Form</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Send a Message</h2>
            </div>
            <FormCard {...formProps} />
          </div>
        </div>

      </main>
    </>
  )
}
