import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function FeaturedServices() {
  return (
    <section className="py-16 bg-background border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <h2 className="text-3xl font-serif font-bold text-foreground mb-4 md:mb-0">Papalitan pa to di ko pa alam ilalagay haha</h2>
          <Button variant="outline" asChild className="self-start md:self-auto hover:bg-muted/80 border-primary/20">
            <Link href="/services">View All Packages &rarr;</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-accent-foreground/20 transition-all duration-300 group">
              <div className="h-40 bg-muted/40" />
              <div className="p-5 flex flex-col flex-1 space-y-3">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-full bg-muted/60 rounded" />
                <div className="h-3 w-4/5 bg-muted/60 rounded" />
                <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-auto">
                  <div className="space-y-1">
                    <div className="h-2.5 w-16 bg-muted/50 rounded" />
                    <div className="h-3.5 w-24 bg-muted rounded" />
                  </div>
                  <Button asChild variant="secondary" size="sm" className="font-semibold text-xs">
                    <Link href="/services">Contact Us</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
