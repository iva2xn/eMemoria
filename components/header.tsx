'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import { Button } from './ui/button'
import { NotificationPanel } from '@/components/admin/notification-panel'
import { Menu, X, User as UserIcon, LogOut, ShieldAlert, Sun, Moon } from 'lucide-react'

const NAV_LINKS = [
  { name: 'Home',             href: '/',         authRequired: false },
  { name: 'Obituaries',       href: '/obituaries', authRequired: true },
  { name: 'Funeral Services', href: '/services', authRequired: false },
  { name: 'About Us',         href: '/about',    authRequired: false },
  { name: 'Contact',          href: '/contact',  authRequired: false },
]

// Module-level cache — survives page navigations (component remounts)
// but is cleared on actual page reload / logout.
let cachedProfile: Profile | null | undefined = undefined

export function AdminHeader({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs?: { id: string; label: string; icon: React.ReactNode }[]
  activeTab?: string
  onTabChange?: (id: string) => void
}) {
  const router   = useRouter()
  const supabase = useRef(createClient()).current

  const [profile, setProfile]         = useState<Profile | null>(cachedProfile ?? null)
  const [authReady, setAuthReady]     = useState(cachedProfile !== undefined)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (cachedProfile !== undefined) {
      setProfile(cachedProfile)
      setAuthReady(true)
    }

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      const resolved = data ?? null
      cachedProfile = resolved
      setProfile(resolved)
      setAuthReady(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else { cachedProfile = null; setProfile(null); setAuthReady(true) }
    })

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

  const handleTabClick = (id: string) => {
    onTabChange?.(id)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl h-14 items-center gap-4 px-6">

        {/* Brand — left */}
        <Link href="/admin" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="M. P. Gayeta Funeral Services" width={32} height={32} className="rounded-full object-cover" />
          <div className="hidden md:flex flex-col">
            <span className="font-serif text-sm font-bold leading-tight tracking-wide text-foreground">M. P. GAYETA</span>
            <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-sans">
              {profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
            </span>
          </div>
        </Link>

        {/* Divider — desktop only */}
        <div className="hidden md:block h-5 w-px bg-border/50 shrink-0" />

        {/* Tabs — desktop only, center, fill remaining space */}
        {tabs && tabs.length > 0 && (
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notification bell */}
          {authReady && profile && <NotificationPanel />}

          {/* Logout — always visible */}
          {authReady && profile && (
            <Button variant="ghost" size="icon" onClick={handleLogout}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}

          {/* Hamburger — mobile only */}
          <Button variant="ghost" size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-foreground">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && tabs && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="space-y-1.5 px-6 py-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

export function HeroHeader() {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const supabase = useRef(createClient()).current

  const [profile, setProfile]     = useState<Profile | null>(cachedProfile ?? null)
  const [authReady, setAuthReady] = useState(cachedProfile !== undefined)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Scroll state — strict hysteresis, no flickering
  // Collapses once scrolled past HIDE_AT, only reopens once back under SHOW_AT
  const HIDE_AT = 80   // px — scroll past this to collapse
  const SHOW_AT = 20   // px — must come back under this to re-expand

  const [topBarVisible, setTopBarVisible] = useState(true)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setTopBarVisible(prev => {
          if (prev && y > HIDE_AT) return false   // collapse
          if (!prev && y < SHOW_AT) return true   // re-expand
          return prev                              // no change — stable
        })
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ease-out ${
        topBarVisible
          ? 'border-b border-border/30 bg-background/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent backdrop-blur-none'
      }`}
      style={{ height: topBarVisible ? '4rem' : '3rem' }}
    >
      {/* Brand + auth row — fades out when scrolled */}
      <div
        className={`mx-auto flex max-w-6xl h-16 items-center justify-between px-6 transition-all duration-300 ease-out ${
          topBarVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="M. P. Gayeta Funeral Services" width={36} height={36} className="rounded-full object-cover" />
          <div className="hidden md:flex flex-col">
            <span className="font-serif text-sm font-bold leading-tight tracking-wide text-foreground">eMemoria</span>
            <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-sans">Funeral Services</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost" size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
          {authReady && (
            profile ? (
              <Button variant="ghost" size="icon" onClick={handleLogout}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button size="sm" className="rounded-full" asChild>
                  <Link href="/auth/register">Sign Up</Link>
                </Button>
              </div>
            )
          )}
        </div>

        <div className="flex md:hidden items-center gap-3">
          {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
            <Link href="/admin" className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-border/50 text-foreground font-semibold bg-muted/40">
              <ShieldAlert className="h-2.5 w-2.5" /> {profile?.role === 'admin' ? 'Admin' : 'Staff'}
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-foreground">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Pill nav — always visible, centered, floats when bar is hidden */}
      <nav className="hidden md:flex items-center gap-1 rounded-full px-1.5 py-1 bg-muted/70 border border-border/40 backdrop-blur-xl shadow-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {NAV_LINKS.filter(link => !link.authRequired || profile).map(link => (
          <Link key={link.href} href={link.href}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive(link.href)
                ? 'bg-background text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}>
            {link.name}
          </Link>
        ))}
        {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
          <Link href="/admin"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              isActive('/admin')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}>
            <ShieldAlert className="h-3 w-3" /> {profile?.role === 'admin' ? 'Admin' : 'Staff'}
          </Link>
        )}
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-1 px-4 py-4">
            {NAV_LINKS.filter(link => !link.authRequired || profile).map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                {link.name}
              </Link>
            ))}
            {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
                <ShieldAlert className="h-4 w-4" /> {profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
              </Link>
            )}
            <div className="border-t border-border/30 pt-3 mt-1 space-y-1">
              {/* Theme toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
                >
                  {theme === 'dark'
                    ? <><Sun className="h-4 w-4" /> Light Mode</>
                    : <><Moon className="h-4 w-4" /> Dark Mode</>
                  }
                </button>
              )}
              {authReady && (
                profile ? (
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button variant="outline" size="sm" className="rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/login">Login</Link>
                    </Button>
                    <Button size="sm" className="rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/register">Sign Up</Link>
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
