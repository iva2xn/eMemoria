import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Clock, Heart, Shield, ArrowRight } from 'lucide-react'

const STATS = [
  { value: '20+', label: 'Years of Service' },
  { value: '24/7', label: 'Always Available' },
  { value: '100%', label: 'Compassionate Care' },
  { value: '3',   label: 'Service Branches' },
]

const VALUES = [
  {
    icon: Heart,
    title: 'Compassionate Care',
    description: 'We treat every family with the same dignity and respect we would want for our own.',
  },
  {
    icon: Clock,
    title: 'Around the Clock',
    description: 'Loss doesn\'t follow a schedule. Our team is reachable 24 hours a day, 7 days a week.',
  },
  {
    icon: Shield,
    title: 'Transparent Pricing',
    description: 'No hidden fees. Every package is clearly priced so families can decide without added stress.',
  },
  {
    icon: Phone,
    title: 'Dedicated Counselors',
    description: 'From the first call to the final farewell, a dedicated counselor guides your family through every step.',
  },
]

export function FeaturedServices() {
  return (
    <>
      <section className="bg-primary">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/10">
            {STATS.map(({ value, label }) => (
              <div key={label} className="px-6 py-10 text-center">
                <p className="font-serif text-5xl font-bold text-white">{value}</p>
                <p className="text-sm text-white/60 mt-1.5 font-medium tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="mx-auto max-w-6xl px-6">

          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-lg">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Why Families Trust Us</p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-tight">
                Serving Quezon Province<br className="hidden sm:block" /> with Dignity Since 2004
              </h2>
            </div>
            <Button variant="outline" asChild className="self-start md:self-auto border-border hover:border-primary/40 hover:bg-muted/60 gap-1.5 shrink-0">
              <Link href="/services">View Our Services <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          {/* Feature rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {VALUES.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="group bg-card hover:bg-muted/30 transition-colors p-8 flex gap-5">
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-border font-mono">0{i + 1}</span>
                </div>
                <div className="space-y-2 pt-1">
                  <h3 className="font-semibold text-foreground text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/15 px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Need immediate assistance?</p>
              <p className="text-sm text-muted-foreground mt-0.5">Our counselors are standing by around the clock.</p>
            </div>
            <Button asChild className="shrink-0 rounded-xl px-6 font-semibold gap-2 shadow-sm shadow-primary/20">
              <a href="tel:+639189019978">
                <Phone className="h-4 w-4" />
                +63 918 901 9978
              </a>
            </Button>
          </div>

        </div>
      </section>
    </>
  )
}
