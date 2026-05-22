'use client'

import React, { useState } from 'react'
import { useStore } from '@/app/context/store'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { PageHero } from '@/components/ui/page-hero'
import { ContactInfoItem } from '@/components/ui/contact-info-item'
import { SelectField } from '@/components/ui/select-field'
import { MapPin, Phone, Mail, Clock, MessageSquare, Navigation } from 'lucide-react'

export default function ContactPage() {
  const { submitInquiry } = useStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('Funeral Package Inquiry')
  const [message, setMessage] = useState('')

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!name || !email || !message) {
      setError('Please fill in all required fields.')
      return
    }

    submitInquiry(name, email, subject, message)
    setSuccess(true)
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background transition-colors duration-300">

        <PageHero title="Contact Us" />

        {/* DETAILS & FORM */}
        <section className="py-16 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* CONTACT INFO (Col 5) */}
          <div className="lg:col-span-5 space-y-8">

            {/* DIRECT CONNECT */}
            <div className="bg-card border border-border p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-border/50 pb-4 flex justify-between items-center">
                <h3 className="font-serif text-lg font-bold text-primary">Immediate Care</h3>
                <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Available 24/7</span>
              </div>

              <div className="space-y-6 text-sm text-muted-foreground">
                <ContactInfoItem icon={<Phone className="h-5 w-5 text-primary" />} title="Emergency Hotlines">
                  <p className="mt-1 text-foreground font-mono font-medium">+63 918 901 9978</p>
                  <p className="text-xs text-primary font-bold font-mono mt-0.5">Open 24 Hours / 7 Days</p>
                </ContactInfoItem>

                <ContactInfoItem icon={<Mail className="h-5 w-5 text-primary" />} title="Email Correspondence" bordered>
                  <p className="mt-1 text-foreground">mgayetafuneralhome@gmail.com</p>
                </ContactInfoItem>

                <ContactInfoItem icon={<MapPin className="h-5 w-5 text-primary" />} title="Main Sariaya Branch" bordered>
                  <p className="mt-1 text-foreground leading-relaxed">
                    Maharlika Highway, Sitio Sta. Clara,
                    <br />
                    Brgy. Sampaloc 2, Sariaya, Quezon, Philippines
                  </p>
                </ContactInfoItem>

                <ContactInfoItem icon={<Clock className="h-5 w-5 text-primary" />} title="Operating Hours" bordered>
                  <p className="mt-1 text-foreground">Wake Service &amp; Retrieval: Available 24/7</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Administration Office: 8:00 AM - 5:00 PM</p>
                </ContactInfoItem>
              </div>
            </div>

            {/* MOCK MAP CARD */}
            <div className="bg-card border border-border p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
              <h4 className="font-serif text-sm font-bold text-primary uppercase tracking-wider">
                Geographical Coordinate
              </h4>

              <div className="h-52 rounded-xl bg-primary border border-primary/20 overflow-hidden relative flex items-center justify-center shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
                <div className="absolute h-32 w-32 rounded-full border border-primary-foreground/10 animate-ping duration-[3000ms] pointer-events-none" />
                <div className="absolute h-20 w-20 rounded-full border border-primary-foreground/20 pointer-events-none" />

                <div className="text-center space-y-2 z-10 relative">
                  <div className="h-11 w-11 bg-primary-foreground/20 border border-primary-foreground/40 rounded-full flex items-center justify-center text-primary-foreground mx-auto animate-bounce duration-[1000ms]">
                    <MapPin className="h-5.5 w-5.5" />
                  </div>
                  <span className="text-xs font-bold text-primary-foreground block tracking-wide">M. Gayeta Funeral Homes</span>
                  <span className="text-[9px] text-primary-foreground/70 block font-mono">13.9774&deg; N, 121.5247&deg; E &bull; Sariaya Main Branch</span>
                </div>

                <div className="absolute bottom-4 right-4 z-10">
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-[10px] font-bold text-primary border border-border transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <Navigation className="h-3 w-3 text-primary" /> Get Directions
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CONTACT FORM (Col 7) */}
          <div className="lg:col-span-7">
            <div className="bg-card border border-border p-8 md:p-10 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">

              <div className="space-y-2 border-b border-border/50 pb-4">
                <h3 className="font-serif text-2xl font-semibold text-primary flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-primary" /> Send an Inquiry
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete our confidential inquiry registry. A dedicated memorial counselor will review your request.
                </p>
              </div>

              {error && <AlertBanner variant="error" message={error} />}
              {success && <AlertBanner variant="success" message="Your message has been received. Our counselor will respond immediately." />}

              <form onSubmit={handleSubmit} className="space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="inq-name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Your Full Name <span className="text-primary">*</span>
                    </label>
                    <input
                      id="inq-name"
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="inq-email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Your Email Address <span className="text-primary">*</span>
                    </label>
                    <input
                      id="inq-email"
                      type="email"
                      placeholder="juan@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <SelectField
                  id="inq-subject"
                  label="Subject of Inquiry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="Funeral Package Inquiry">Funeral Package Inquiry</option>
                  <option value="Pre-planning Memorial Schemes">Pre-planning Memorial Schemes</option>
                  <option value="Custom Altar / wake Decorations">Custom Chapel Altar Details</option>
                </SelectField>

                <div className="space-y-1.5">
                  <label htmlFor="inq-msg" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Detailed Message <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="inq-msg"
                    rows={6}
                    placeholder="Describe how we can support you. Specify preferred packages, scheduling questions, or custom request details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-300"
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-11 font-bold rounded-xl transition-all duration-300 shadow-sm mt-4">
                  Send Inquiry Message
                </Button>
              </form>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
