import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Clock, Heart, Shield } from 'lucide-react'

const STATS = [
  { value: '20+', label: 'Years of Service' },
  { value: '24/7', label: 'Always Available' },
  { value: '100%', label: 'Compassionate Care' },
  { value: '3', label: 'Service Branches' },
]

const VALUES = [
  {
    icon: Heart,
    title: 'Compassionate Care',
    description: 'We treat every family with the same dignity and respect we would want for our own. Your grief is our responsibility to carry with you.',
  },
  {
    icon: Clock,
    title: 'Available Around the Clock',
    description: 'Loss doesn\'t follow a schedule. Our team is reachable 24 hours a day, 7 days a week — including holidays.',
  },
  {
    icon: Shield,
    title: 'Transparent Pricing',
    description: 'No hidden fees. Every package is clearly priced so families can make decisions without added stress.',
  },
  {
    icon: Phone,
    title: 'Dedicated Counselors',
    description: 'From the first call to the final farewell, a dedicated counselor guides your family through every step of the process.',
  },
]

export function FeaturedServices() {
  return (
    <>
      {/* Stats strip */}
      <section className="border-t border-border/40 bg-primary">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/15">
            {STATS.map(({ value, label }) => (
              <div key={label} className="px-6 py-8 text-center">
                <p className="font-serif text-4xl font-bold text-white">{value}</p>
                <p className="text-sm text-white/70 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-20 bg-background border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6">

          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Why Families Trust Us
              </p>
              <h2 className="text-3xl font-serif font-bold text-foreground">
                Serving Quezon Province<br className="hidden sm:block" /> with Dignity Since 2004
              </h2>
            </div>
            <Button variant="outline" asChild className="self-start md:self-auto mt-6 md:mt-0 hover:bg-muted/80 border-primary/20">
              <Link href="/services">View Our Services &rarr;</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 pt-10 border-t border-border/40">
            <p className="text-sm text-muted-foreground text-center">
              Need immediate assistance? Our counselors are standing by.
            </p>
            <Button asChild className="shrink-0 rounded-xl px-6 font-semibold gap-2">
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
