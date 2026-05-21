'use client'

import React, { useState } from 'react'
import { useStore } from '@/app/context/store'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Mail, Clock, MessageSquare, AlertCircle, CheckCircle2, Navigation } from 'lucide-react'

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
    
    // Reset
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background dark:bg-[var(--dark-page)] transition-colors duration-300">
        
        {/* Banner */}
        <section className="relative py-10 bg-gradient-to-b from-[var(--brand-green)]/5 to-background dark:from-[var(--brand-green-light)]/5 dark:to-[var(--dark-page)] border-b border-border/40 text-center overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-6">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-[var(--brand-green)] dark:text-[var(--dark-text)] tracking-tight">
              Contact Us
            </h1>
          </div>
        </section>

        {/* DETAILS & FORM */}
        <section className="py-16 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* CONTACT INFO (Col 5) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* DIRECT CONNECT DIRECT DIRECT */}
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] pb-4 flex justify-between items-center">
                <h3 className="font-serif text-lg font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)]">
                  Immediate Care
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                  Available 24/7
                </span>
              </div>

              <div className="space-y-6 text-sm text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                    <Phone className="h-5 w-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] text-sm">Emergency Hotlines</h4>
                    <p className="mt-1 text-foreground font-mono font-medium">+63 918 901 9978</p>
                    <p className="text-xs text-[var(--brand-green)] dark:text-[var(--brand-green-light)] font-bold font-mono mt-0.5">Open 24 Hours / 7 Days</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 border-t border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 pt-5">
                  <div className="h-10 w-10 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                    <Mail className="h-5 w-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] text-sm">Email Correspondence</h4>
                    <p className="mt-1 text-foreground">mgayetafuneralhome@gmail.com</p>
                    <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)] mt-0.5">mgayetafuneralhome@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 border-t border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 pt-5">
                  <div className="h-10 w-10 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                    <MapPin className="h-5 w-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] text-sm">Main Sariaya Branch</h4>
                    <p className="mt-1 text-foreground leading-relaxed">
                      Maharlika Highway, Sitio Sta. Clara,
                      <br />
                      Brgy. Sampaloc 2, Sariaya, Quezon, Philippines
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 border-t border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 pt-5">
                  <div className="h-10 w-10 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                    <Clock className="h-5 w-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] text-sm">Operating Hours</h4>
                    <p className="mt-1 text-foreground">Wake Service & Retrieval: Available 24/7</p>
                    <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)] mt-0.5">Administration Office: 8:00 AM - 5:00 PM</p>
                  </div>
                </div>

              </div>
            </div>

            {/* MOCK MAP CARD */}
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
              <h4 className="font-serif text-sm font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] uppercase tracking-wider">
                Geographical Coordinate
              </h4>
              
              {/* Simulated Map Container */}
              <div className="h-52 rounded-xl bg-[var(--brand-green)] dark:bg-[var(--dark-card-alt)] border border-[var(--brand-green)]/20 overflow-hidden relative flex items-center justify-center shadow-inner">
                {/* Radial Grid lines */}
                <div className="absolute inset-0 bg-[radial-gradient(var(--brand-gold)_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
                <div className="absolute inset-0 bg-radial-to-r from-transparent via-[var(--brand-green)]/60 to-[var(--brand-green)] pointer-events-none" />
                <div className="absolute h-32 w-32 rounded-full border border-[var(--brand-gold)]/10 animate-ping duration-[3000ms] pointer-events-none" />
                <div className="absolute h-20 w-20 rounded-full border border-[var(--brand-gold)]/20 pointer-events-none" />
                
                {/* Visual grid coordinates marker */}
                <div className="text-center space-y-2 z-10 relative">
                  <div className="h-11 w-11 bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/40 rounded-full flex items-center justify-center text-[var(--brand-gold)] mx-auto animate-bounce duration-[1000ms]">
                    <MapPin className="h-5.5 w-5.5" />
                  </div>
                  <span className="text-xs font-bold text-[rgb(240,248,255)] block tracking-wide">M. Gayeta Funeral Homes</span>
                  <span className="text-[9px] text-[var(--brand-gold)] block font-mono">13.9774&deg; N, 121.5247&deg; E &bull; Sariaya Main Branch</span>
                </div>
                
                <div className="absolute bottom-4 right-4 z-10">
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-[var(--brand-cream)] text-[10px] font-bold text-[var(--brand-green)] border border-[var(--brand-cream-border)] transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <Navigation className="h-3 w-3 text-[var(--brand-gold)]" /> Get Directions
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* CONTACT FORM (Col 7) */}
          <div className="lg:col-span-7">
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 md:p-10 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              
              <div className="space-y-2 border-b border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 pb-4">
                <h3 className="font-serif text-2xl font-semibold text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-[var(--brand-gold)]" /> Send an Inquiry
                </h3>
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                  Complete our confidential inquiry registry. A dedicated memorial counselor will review your request.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/5 text-red-600 border border-red-500/10 rounded-xl flex items-center gap-2.5 text-xs animate-shake">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 bg-[var(--brand-green)]/5 text-[var(--brand-green)] dark:text-[var(--brand-green-light)] border border-[var(--brand-green)]/10 rounded-xl flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[var(--brand-gold)]" />
                  <span>Your message has been received. Our counselor will respond immediately.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="inq-name" className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                      Your Full Name <span className="text-[var(--brand-gold)]">*</span>
                    </label>
                    <input
                      id="inq-name"
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="inq-email" className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                      Your Email Address <span className="text-[var(--brand-gold)]">*</span>
                    </label>
                    <input
                      id="inq-email"
                      type="email"
                      placeholder="juan@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="inq-subject" className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                    Subject of Inquiry
                  </label>
                  <div className="relative">
                    <select
                      id="inq-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300 appearance-none font-medium"
                    >
                      <option value="Funeral Package Inquiry">Funeral Package Inquiry</option>
                      <option value="Pre-planning Memorial Schemes">Pre-planning Memorial Schemes</option>
                      <option value="Custom Altar / wake Decorations">Custom Chapel Altar Details</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--surface-muted)]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="inq-msg" className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                    Detailed Message <span className="text-[var(--brand-gold)]">*</span>
                  </label>
                  <textarea
                    id="inq-msg"
                    rows={6}
                    placeholder="Describe how we can support you. Specify preferred packages, scheduling questions, or custom request details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300"
                    required
                  ></textarea>
                </div>

                <Button type="submit" className="w-full h-11 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/95 text-[rgb(240,248,255)] font-bold rounded-xl transition-all duration-300 shadow-sm mt-4">
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
