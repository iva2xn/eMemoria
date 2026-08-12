'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import {
  Home, ScrollText, Layers, Users, Phone,
  LogOut, Sun, Moon, ShieldAlert,
} from 'lucide-react'

let cachedProfile: Profile | null | undefined = undefined

const NAV = [
  { href: '/',           label: 'Home',             icon: Home },
  { href: '/services',   label: 'Funeral Services', icon: Layers },
  { href: '/obituaries', label: 'Obituaries',       icon: ScrollText, authRequired: true },
  { href: '/about',      label: 'About Us',         icon: Users },
  { href: '/contact',    label: 'Contact',          icon: Phone },
]

export function HomeSidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const supabase  = useRef(createClient()).current

  const [profile, setProfile]     = useState<Profile | null>(cachedProfile ?? null)
  const [authReady, setAuthReady] = useState(cachedProfile !== undefined)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (cachedProfile !== undefined) {
      setProfile(cachedProfile); setAuthReady(true)
    }
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      const resolved = data ?? null
      cachedProfile = resolved; setProfile(resolved); setAuthReady(true)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else { cachedProfile = null; setProfile(null); setAuthReady(true) }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    cachedProfile = null
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 fixed top-0 left-0 h-screen bg-card border-r border-border z-40">

      {/* Brand */}
      <div className="px-5 pt-7 pb-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-border shadow-sm">
            <Image src="/logo.png" alt="M. P. Gayeta" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight tracking-wide">M. P. Gayeta</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Funeral Services</p>
          </div>
        </Link>
      </div>

      <div className="mx-5 h-px bg-border mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.filter(l => !l.authRequired || profile).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              isActive(href)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}>
            <Icon className={`h-4 w-4 shrink-0 ${isActive(href) ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
            {label}
          </Link>
        ))}

        {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
          <Link href="/admin"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive('/admin')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}>
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {profile.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 space-y-1 border-t border-border">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        )}

        {authReady && (
          profile ? (
            <>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {profile.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{profile.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{profile.role}</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                <LogOut className="h-4 w-4 shrink-0" /> Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 px-1 pt-1">
              <Link href="/auth/login"
                className="flex items-center justify-center h-9 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Login
              </Link>
              <Link href="/auth/register"
                className="flex items-center justify-center h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Sign Up
              </Link>
            </div>
          )
        )}
      </div>

    </aside>
  )
}
