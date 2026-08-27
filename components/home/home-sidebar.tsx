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
  ChevronLeft, ChevronRight, Receipt, ClipboardList,
} from 'lucide-react'
import { ClientNotificationBell } from '@/components/client-notification-bell'
import { LogoutConfirmModal } from '@/components/ui/logout-confirm-modal'

let cachedProfile: Profile | null | undefined = undefined

const NAV = [
  { href: '/',              label: 'Home',             icon: Home },
  { href: '/services',      label: 'Funeral Services', icon: Layers },
  { href: '/obituaries',    label: 'Obituaries',       icon: ScrollText, authRequired: true },
  { href: '/wake-schedule', label: 'Wake Schedule',    icon: Moon,       authRequired: true },
  { href: '/bookings',      label: 'My Bookings',      icon: ClipboardList, authRequired: true },
  { href: '/payments',      label: 'Payments',         icon: Receipt,    authRequired: true },
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
  const supabase = useRef(createClient()).current // eslint-disable-line react-hooks/refs

  const [mounted,         setMounted]         = useState(false)
  const [profile,         setProfile]         = useState<Profile | null>(cachedProfile ?? null)
  const [authReady,       setAuthReady]       = useState(cachedProfile !== undefined)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [avatarCacheBust, setAvatarCacheBust] = useState<number>(() => Date.now())
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      const resolved = data ?? null
      cachedProfile = resolved
      setProfile(resolved)
      setAuthReady(true)
      if (resolved?.avatar_path) {
        const bust = Date.now()
        setAvatarCacheBust(bust)
        setAvatarUrl(
          supabase.storage.from('avatars').getPublicUrl(resolved.avatar_path).data.publicUrl
        )
      } else {
        setAvatarUrl(null)
      }
    }

    // Initial auth check — only runs once on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchProfile(user.id)
      } else {
        cachedProfile = null
        setProfile(null)
        setAuthReady(true)
      }
    })

    // Auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else { cachedProfile = null; setProfile(null); setAuthReady(true) }
    })
    return () => subscription.unsubscribe()
  // Intentionally omit pathname — auth state doesn't need to re-init on navigation.
  // Profile re-freshes happen via onAuthStateChange (login/logout) only.
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch profile data (name, avatar) when returning to a page after editing
  // the profile — but only if we already know the user, so no flash.
  useEffect(() => {
    if (!cachedProfile) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (!data) return
        cachedProfile = data
        setProfile(data)
        if (data.avatar_path) {
          setAvatarCacheBust(Date.now())
          setAvatarUrl(
            supabase.storage.from('avatars').getPublicUrl(data.avatar_path).data.publicUrl
          )
        } else {
          setAvatarUrl(null)
        }
      })
    })
  }, [supabase, pathname])

  const doLogout = async () => {
    cachedProfile = null
    await supabase.auth.signOut()
    setProfile(null)
    setShowLogoutModal(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={doLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
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
            <Image src="/logo.png" alt="eMemoria" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          {!collapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight tracking-wide truncate">eMemoria</p>
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

          {/* Notifications — all logged-in users */}
          {authReady && profile && (
            collapsed ? (
              <div className="flex justify-center py-1">
                <ClientNotificationBell userId={profile.id} />
              </div>
            ) : (
              <div className="px-3 py-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notifications</span>
                <ClientNotificationBell userId={profile.id} />
              </div>
            )
          )}

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
              <div className="h-7 w-7 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center shrink-0 border border-border/40">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={profile.name}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</span>
                )}
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
              <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center border border-border/40">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={profile.name}
                    width={24}
                    height={24}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <span className="text-[10px] font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </Link>
          )}

          {/* Sign out */}
          {authReady && profile && (
            <button
              onClick={() => setShowLogoutModal(true)}
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
    </>
  )
}
