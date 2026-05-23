'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import { Button } from './ui/button'
import { Menu, X, User as UserIcon, LogOut, ShieldAlert } from 'lucide-react'

const NAV_LINKS = [
  { name: 'Home',             href: '/' },
  { name: 'Obituaries',       href: '/obituaries' },
  { name: 'Funeral Services', href: '/services' },
  { name: 'About Us',         href: '/about' },
  { name: 'Contact',          href: '/contact' },
]

// Module-level cache — survives page navigations (component remounts)
// but is cleared on actual page reload / logout.
let cachedProfile: Profile | null | undefined = undefined

export function HeroHeader() {
  const pathname = usePathname()
  const router   = useRouter()

  const supabase = useRef(createClient()).current

  // If we already resolved the profile in a previous mount, start with it
  // so there is zero flicker on navigation.
  const [profile, setProfile]     = useState<Profile | null>(cachedProfile ?? null)
  const [authReady, setAuthReady] = useState(cachedProfile !== undefined)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // If the cache already has a value we can skip the initial getSession round-trip.
    if (cachedProfile !== undefined) {
      setProfile(cachedProfile)
      setAuthReady(true)
    }

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) console.error('Header profile fetch error:', error)
      const resolved = data ?? null
      cachedProfile = resolved
      setProfile(resolved)
      setAuthReady(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          cachedProfile = null
          setProfile(null)
          setAuthReady(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    cachedProfile = null
    await supabase.auth.signOut()
    setProfile(null)
    setMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-6">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="M. P. Gayeta Funeral Services" width={40} height={40} className="rounded-full object-cover" />
          <div className="flex flex-col">
            <span className="font-serif text-base font-bold leading-tight tracking-wide text-foreground">M. P. GAYETA</span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-sans">Funeral Services</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(link.href)
                  ? 'text-primary border-b-2 border-primary pb-1 pt-1'
                  : 'text-muted-foreground'
              }`}>
              {link.name}
            </Link>
          ))}
          {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
            <Link href="/admin"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border/50 text-foreground font-semibold hover:bg-muted transition-colors ${
                isActive('/admin') ? 'bg-muted' : ''
              }`}>
              <ShieldAlert className="h-3 w-3 text-muted-foreground" /> {profile?.role === 'admin' ? 'Admin' : 'Staff'}
            </Link>
          )}
        </nav>

        {/* Desktop session */}
        <div className="hidden md:flex items-center gap-3">
          {authReady && (
            profile ? (
              <div className="flex items-center gap-3 bg-muted/60 pl-3 pr-2 py-1.5 rounded-full border border-border/60">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-xs font-semibold text-foreground max-w-[100px] truncate">
                    {profile.name}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Logout">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/auth/register">Sign Up</Link>
                </Button>
              </div>
            )
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-3">
          {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
            <Link href="/admin"
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border/50 text-foreground font-semibold">
              <ShieldAlert className="h-2.5 w-2.5 text-muted-foreground" /> {profile?.role === 'admin' ? 'Admin' : 'Staff'}
            </Link>
          )}
          <Button variant="ghost" size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="space-y-1.5 px-6 py-4">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                {link.name}
              </Link>
            ))}
            {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-semibold text-primary transition-colors ${
                  isActive('/admin') ? 'bg-accent' : 'hover:bg-muted'
                }`}>
                <ShieldAlert className="h-4 w-4" /> {profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
              </Link>
            )}

            <div className="border-t border-border/40 pt-4 mt-2">
              {authReady && (
                profile ? (
                  <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-secondary" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{profile.name}</span>
                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}
                      className="text-destructive hover:bg-destructive/10 gap-1">
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" asChild onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/login" className="w-full text-center">Login</Link>
                    </Button>
                    <Button variant="default" size="sm" asChild onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/register" className="w-full text-center">Sign Up</Link>
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
