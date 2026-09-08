'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import { Button } from './ui/button'
import { ClientNotificationBell } from '@/components/client-notification-bell'
import { LogoutConfirmModal } from '@/components/ui/logout-confirm-modal'
import {
  Menu, X, User as UserIcon, LogOut, ShieldAlert, Sun, Moon, Bell,
  Home, Layers, ScrollText, ClipboardList, Receipt, Users, Phone,
} from 'lucide-react'

const NAV_LINKS = [
  { name: 'Home',             href: '/',               authRequired: false, icon: Home         },
  { name: 'Funeral Services', href: '/services',       authRequired: false, icon: Layers       },
  { name: 'Wake Schedules',   href: '/wake-schedule',  authRequired: true,  icon: Moon         },
  { name: 'Obituaries',       href: '/obituaries',     authRequired: true,  icon: ScrollText   },
  { name: 'My Bookings',      href: '/bookings',       authRequired: true,  icon: ClipboardList},
  { name: 'Payments',         href: '/payments',       authRequired: true,  icon: Receipt      },
  { name: 'About Us',         href: '/about',          authRequired: false, icon: Users        },
  { name: 'Contact',          href: '/contact',        authRequired: false, icon: Phone        },
]

// Module-level cache — survives page navigations (component remounts)
// but is cleared on actual page reload / logout.
let cachedProfile: Profile | null | undefined = undefined

// ── Admin Header ──────────────────────────────────────────────
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
  const supabase = useRef(createClient()).current // eslint-disable-line react-hooks/refs

  const [profile,         setProfile]         = useState<Profile | null>(cachedProfile ?? null)
  const [authReady,       setAuthReady]       = useState(cachedProfile !== undefined)
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    if (cachedProfile !== undefined) {
      setProfile(cachedProfile) // eslint-disable-line react-hooks/set-state-in-effect
      setAuthReady(true)
    }

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      const resolved = data ?? null
      cachedProfile  = resolved
      setProfile(resolved)
      setAuthReady(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else { cachedProfile = null; setProfile(null); setAuthReady(true) }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const doLogout = async () => {
    cachedProfile = null
    await supabase.auth.signOut()
    setProfile(null)
    setMobileMenuOpen(false)
    setShowLogoutModal(false)
    router.push('/')
    router.refresh()
  }

  const handleTabClick = (id: string) => {
    onTabChange?.(id)
    setMobileMenuOpen(false)
  }

  return (
    <>
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={doLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl h-14 items-center gap-4 px-6">

          {/* Brand — left */}
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="eMemoria Funeral Services" width={32} height={32} className="rounded-full object-cover" />
            <div className="hidden md:flex flex-col">
              <span className="font-serif text-sm font-bold leading-tight tracking-wide text-foreground">eMemoria</span>
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
            {/* Logout — always visible */}
            {authReady && profile && (
              <Button
                variant="ghost" size="icon"
                onClick={() => setShowLogoutModal(true)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Logout"
              >
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
    </>
  )
}

// ── Hero Header ───────────────────────────────────────────────
export function HeroHeader() {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const supabase  = useRef(createClient()).current // eslint-disable-line react-hooks/refs
  const headerRef = useRef<HTMLElement>(null)

  const [profile,         setProfile]         = useState<Profile | null>(cachedProfile ?? null)
  const [authReady,       setAuthReady]       = useState(cachedProfile !== undefined)
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Scroll state — strict hysteresis, no flickering
  const HIDE_AT = 80
  const SHOW_AT = 20
  const [topBarVisible, setTopBarVisible] = useState(true)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setTopBarVisible(prev => {
          if (prev && y > HIDE_AT)  return false
          if (!prev && y < SHOW_AT) return true
          return prev
        })
        ticking = false
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Switch to icon-only handled via CSS (xl: breakpoint) — no JS needed

  useEffect(() => {
    if (cachedProfile !== undefined) {
      setProfile(cachedProfile) // eslint-disable-line react-hooks/set-state-in-effect
      setAuthReady(true)
    }

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      const resolved = data ?? null
      cachedProfile  = resolved
      setProfile(resolved)
      setAuthReady(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else { cachedProfile = null; setProfile(null); setAuthReady(true) }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const doLogout = async () => {
    cachedProfile = null
    await supabase.auth.signOut()
    setProfile(null)
    setMobileMenuOpen(false)
    setShowLogoutModal(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const visibleLinks = NAV_LINKS.filter(link => !link.authRequired || profile)
  const hasAdminLink = authReady && (profile?.role === 'admin' || profile?.role === 'staff')

  return (
    <>
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={doLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <header
        ref={headerRef}
        className={`sticky top-0 z-50 w-full transition-all duration-300 ease-out ${
          topBarVisible
            ? 'border-b border-border/30 bg-background/70 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent backdrop-blur-none'
        }`}
        style={{ height: topBarVisible ? '4rem' : '3rem' }}
      >
        {/* Brand + auth row */}
        <div
          className={`mx-auto flex max-w-6xl h-16 items-center justify-between px-6 transition-all duration-300 ease-out ${
            topBarVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="eMemoria Funeral Services" width={36} height={36} className="rounded-full object-cover" />
            <div className="hidden md:flex flex-col">
              <span className="font-serif text-sm font-bold leading-tight tracking-wide text-foreground">eMemoria</span>
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-sans">Funeral Services</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
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
                <>
                  <ClientNotificationBell userId={profile.id} />
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setShowLogoutModal(true)}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
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

        {/* ── Pill nav (desktop only) ── */}
        <nav className="hidden md:flex items-center gap-0.5 rounded-full px-1.5 py-1 bg-muted/70 border border-border/40 backdrop-blur-xl shadow-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
          {visibleLinks.map(link => {
            const active = isActive(link.href)
            const Icon   = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.name}
                className={`flex items-center gap-1.5 rounded-full transition-all px-2.5 py-2 xl:px-3.5 xl:py-1.5 ${
                  active
                    ? 'bg-background text-foreground shadow-sm border border-border/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline text-sm font-medium">{link.name}</span>
              </Link>
            )
          })}
          {hasAdminLink && (
            <Link
              href="/admin"
              title={profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
              className={`flex items-center gap-1.5 rounded-full transition-all px-2.5 py-2 xl:px-3.5 xl:py-1.5 ${
                isActive('/admin')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline text-sm font-medium">{profile?.role === 'admin' ? 'Admin' : 'Staff'}</span>
            </Link>
          )}
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="space-y-1 px-4 py-4">
              {visibleLinks.map(link => {
                const Icon = link.icon
                return (
                  <Link key={link.href} href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {link.name}
                  </Link>
                )
              })}
              {hasAdminLink && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
                </Link>
              )}
              <div className="border-t border-border/30 pt-3 mt-1 space-y-1">
                {mounted && (
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
                  >
                    {theme === 'dark'
                      ? <><Sun className="h-4 w-4" /> Light Mode</>
                      : <><Moon className="h-4 w-4" /> Dark Mode</>
                    }
                  </button>
                )}
                {profile && (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <UserIcon className="h-4 w-4" /> Your Profile
                    </Link>
                    {profile.role === 'client' && (
                      <Link
                        href="/notifications"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Bell className="h-4 w-4" /> Notifications
                      </Link>
                    )}
                    <button
                      onClick={() => { setMobileMenuOpen(false); setShowLogoutModal(true) }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                )}
                {authReady && !profile && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button variant="outline" size="sm" className="rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/login">Login</Link>
                    </Button>
                    <Button size="sm" className="rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/register">Sign Up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
