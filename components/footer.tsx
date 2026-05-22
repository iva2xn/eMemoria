import React from 'react'
import Link from 'next/link'
import { HeartHandshake, Phone, Mail, MapPin, Clock } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-muted/30 py-12 md:py-16 mt-auto">
      <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand Legacy */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HeartHandshake className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-sm font-bold leading-tight tracking-wide text-foreground">
                MARCELO P. GAYETA
              </span>
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-sans">
                Funeral Services
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Providing compassionate, dignified, and highly professional memorial services to Filipino families since 2024. We accompany you with care, honouring the beautiful legacy of your loved ones.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Clock className="h-3.5 w-3.5 text-secondary" />
            <span>Open 24 Hours, 7 Days a Week for Urgent Assistance</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="font-serif text-sm font-semibold text-foreground uppercase tracking-wider">
            Quick Navigation
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                Our Service Packages
              </Link>
            </li>
            <li>
              <Link href="/billing" className="text-muted-foreground hover:text-primary transition-colors">
                Billing & Payments
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Submit an Inquiry
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="font-serif text-sm font-semibold text-foreground uppercase tracking-wider">
            Contact Information
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">Sariaya Main Branch</span>
                <span>
                  Maharlika Highway, Sitio Sta. Clara, Brgy. Sampaloc 2,
                  <br />
                  Sariaya, Quezon, Philippines
                </span>
                <span className="font-semibold text-foreground block mt-2">Lucena Branch (Closed Permanently)</span>
                <span>
                  Old Manila South Road / National Road, Brgy. Ibabang Iyam,
                  <br />
                  Lucena City, Quezon
                </span>
              </div>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-secondary shrink-0" />
              <span>+63 918 901 9978</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 mt-12 pt-6 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Marcelo P. Gayeta Funeral Services. All rights reserved.
        </p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
