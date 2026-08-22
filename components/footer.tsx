import Link from 'next/link'
import { Phone, MapPin, Clock } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-card py-12 mt-auto">
      <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 md:grid-cols-3 gap-10">

        <div className="md:col-span-1 space-y-4">
          <div>
            <p className="font-serif text-base font-bold text-foreground tracking-wide">eMemoria</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Funeral Services</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Compassionate, dignified memorial services for Filipino families since 2004.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Open 24 / 7 for Urgent Assistance</span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground">Navigation</p>
          <ul className="space-y-2.5 text-sm">
            {[
              { label: 'Service Packages', href: '/services' },
              { label: 'Billing & Payments', href: '/billing' },
              { label: 'Submit an Inquiry', href: '/contact' },
              { label: 'About Us', href: '/about' },
            ].map(({ label, href }) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-primary transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground">Contact</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-0.5">
                <span className="font-medium text-foreground block">Sariaya Branch</span>
                <span>Maharlika Highway, Sitio Sta. Clara,<br />Brgy. Sampaloc 2, Sariaya, Quezon</span>
              </div>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span>+63 918 901 9978</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="mx-auto max-w-6xl px-6 mt-10 pt-6 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} eMemoria Funeral Services. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <span className="text-border">·</span>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}
