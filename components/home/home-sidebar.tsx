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
  ChevronLeft, ChevronRight,
} from 'lucide-react'

let cachedProfile: Profile | null | undefined = undefined

const NAV = [
  { href: '/',              label: 'Home',             icon: Home },
  { href: '/services',      label: 'Funeral Services', icon: Layers },
  { href: '/obituaries',    label: 'Obituaries',       icon: ScrollText, authRequired: true },
  { href: '/wake-schedule', label: 'Wake Schedule',    icon: Moon,       authRequired: true },
  { href: '/about',         label: 'About Us',         icon: Users },
  { href: '/contact',       label: 'Contact',          icon: Phone },
]

export function HomeSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, setTheme } = useTheme()
  const supabase = useRef(createClient()).current

  const [mounted,   setMounted]   = useState(false)
  const [profile,   setProfile]   = useState<Profile | null>(cachedProfile ?? null)
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
    <aside
      className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-card border-r border-border z-40 transition-[width] duration-200 ease-in-out
        ${collapsed ? 'w-[60px]' : 'w-[280px]'}`}
    >
      {/* Inner wrapper — clips overflow during width transition */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Brand */}
        <div className="flex items-center border-b border-border/60"
          style={{ padding: collapsed ? '20px 0' : '20px 16px', justifyContent: collapsed ? 'center' : undefined }}
        >
          <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-border shadow-sm">
            <Image src="/logo.png" alt="M. P. Gayeta" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          {!collapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight tracking-wide truncate">M. P. Gayeta</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Funeral Services</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-2'}`}>
          {NAV.filter(l => !l.authRequired || profile).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 rounded-lg font-medium transition-all
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                ${isActive(href)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              <span className="shrink-0"><Icon className="h-4 w-4" /></span>
              {!collapsed && <span className="text-sm truncate">{label}</span>}
            </Link>
          ))}

          {authReady && (profile?.role === 'admin' || profile?.role === 'staff') && (
            <Link
              href="/admin"
              title={collapsed ? (profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel') : undefined}
              className={`w-full flex items-center gap-3 rounded-lg font-medium transition-all
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                ${isActive('/admin')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              <span className="shrink-0"><ShieldAlert className="h-4 w-4" /></span>
              {!collapsed && <span className="text-sm truncate">{profile?.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}</span>}
            </Link>
          )}
        </nav>

        {/* Bottom */}
        <div className={`border-t border-border/60 space-y-1 py-3 ${collapsed ? 'px-1.5' : 'px-2'}`}>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
              className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}
            >
              <span className="shrink-0">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
              {!collapsed && <span className="text-sm truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          )}

          {/* User card — clickable, links to profile */}
          {authReady && profile && !collapsed && (
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/40 hover:bg-muted/80 transition-all group"
            >
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{profile.role}</p>
              </div>
            </Link>
          )}

          {/* Collapsed-state profile icon */}
          {authReady && profile && collapsed && (
            <Link
              href="/profile"
              title="Your Profile"
              className="w-full flex items-center justify-center px-0 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</span>
              </div>
            </Link>
          )}

          {/* Sign out */}
          {authReady && profile && (
            <button
              onClick={handleLogout}
              title={collapsed ? 'Sign Out' : undefined}
              className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}
            >
              <span className="shrink-0"><LogOut className="h-4 w-4" /></span>
              {!collapsed && <span className="text-sm truncate">Sign Out</span>}
            </button>
          )}

          {/* Login / Sign up */}
          {authReady && !profile && !collapsed && (
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
          )}

        </div>
      </div>{/* end overflow-hidden inner wrapper */}

      {/* Collapse toggle — vertical pill on the right edge */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-1/2 -translate-y-1/2 -right-[20px] z-20
          h-16 w-5 rounded-r-lg
          bg-card border-y border-r border-border/60
          flex items-center justify-center
          text-muted-foreground hover:text-foreground
          transition-colors duration-150"
      >
        {collapsed
          ? <ChevronRight className="h-4 w-4" />
          : <ChevronLeft  className="h-4 w-4" />
        }
      </button>
    </aside>
  )
}
