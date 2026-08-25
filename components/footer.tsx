import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-card py-8 mt-auto">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">

        <div>
          <p className="font-serif text-sm font-bold text-foreground tracking-wide">eMemoria</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Funeral Services</p>
        </div>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link>
          <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} eMemoria. All rights reserved.
        </p>

      </div>
    </footer>
  )
}
