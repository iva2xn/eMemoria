'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationPanel } from '@/components/admin/notification-panel'
import { OverviewTab }    from '@/components/admin/overview-tab'
import { InquiriesTab }   from '@/components/admin/inquiries-tab'
import { PaymentsTab }    from '@/components/admin/payments-tab'
import { ColumbariumTab } from '@/components/admin/columbarium-tab'
import { ObituariesTab }  from '@/components/admin/obituaries-tab'
import { ProfilesTab }    from '@/components/admin/profiles-tab'
import { DocumentSubmissionsTab } from '@/components/admin/document-submissions-tab'
import { TransactionRegisterTab } from '@/components/admin/transaction-register-tab'
import {
  LayoutDashboard, Mail, CreditCard,
  Grid3X3, ScrollText, UserCircle2, ShieldAlert,
  ClipboardList, LogOut, Menu, X, Receipt,
} from 'lucide-react'
import type { Profile, UserRole } from '@/lib/supabase/types'

type Tab = 'overview' | 'inquiries' | 'payments' | 'columbarium' | 'obituaries' | 'profiles' | 'availments' | 'transactions'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',      label: 'Overview',         icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'availments',    label: 'Doc Submissions',   icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'payments',      label: 'Payments',          icon: <CreditCard className="h-4 w-4" /> },
  { id: 'transactions',  label: 'Transactions',      icon: <Receipt className="h-4 w-4" /> },
  { id: 'columbarium',   label: 'Columbarium',       icon: <Grid3X3 className="h-4 w-4" /> },
  { id: 'obituaries',    label: 'Obituaries',        icon: <ScrollText className="h-4 w-4" /> },
  { id: 'profiles',      label: 'Profiles',          icon: <UserCircle2 className="h-4 w-4" /> },
  { id: 'inquiries',     label: 'Inquiries',         icon: <Mail className="h-4 w-4" /> },
]

export default function AdminPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile,    setProfile]    = useState<Profile | null | undefined>(undefined)
  const [activeTab,  setActiveTab]  = useState<Tab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [highlightPaymentId, setHighlightPaymentId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data ?? null)
    })
  }, [supabase, router])

  useEffect(() => {
    if (profile !== undefined && profile?.role !== 'admin' && profile?.role !== 'staff') {
      router.push('/')
    }
  }, [profile, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // ── Loading ──────────────────────────────────────────────────
  if (profile === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center py-32 bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    )
  }

  // ── Access denied ────────────────────────────────────────────
  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center py-32 px-6 text-center space-y-5 bg-background">
        <div className="h-14 w-14 bg-destructive/5 rounded-full flex items-center justify-center border border-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Only authorized staff and administrators are permitted here.
        </p>
        <Button asChild className="rounded-xl px-6">
          <Link href="/auth/login">Sign In →</Link>
        </Button>
      </main>
    )
  }

  const currentRole = profile.role as UserRole

  const tabContent: Record<Tab, React.ReactNode> = {
    overview:    <OverviewTab currentRole={currentRole} onNavigate={(tab, paymentId?) => {
      if (paymentId) setHighlightPaymentId(paymentId)
      setActiveTab(tab as Tab)
    }} />,
    inquiries:   <InquiriesTab staffName={profile.name} />,
    availments:  <DocumentSubmissionsTab />,
    payments:      <PaymentsTab currentRole={currentRole} highlightPaymentId={highlightPaymentId} onHighlightClear={() => setHighlightPaymentId(null)} />,
    transactions:  <TransactionRegisterTab currentRole={currentRole} />,
    columbarium: <ColumbariumTab />,
    obituaries:  <ObituariesTab />,
    profiles:    <ProfilesTab currentRole={currentRole} />,
  }

  const activeTabMeta = TABS.find(t => t.id === activeTab)

  return (
    // Full-screen admin shell — does NOT use the app's root <Footer>
    // because admin has its own sidebar-based layout.
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ════════════════════════════════════════
          DESKTOP LEFT SIDEBAR
          ════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/60">
          <Image src="/logo.png" alt="M. P. Gayeta" width={34} height={34} className="rounded-full object-cover shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-serif text-sm font-bold leading-tight text-foreground truncate">M. P. GAYETA</span>
            <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-sans truncate">
              {profile.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Bottom: theme toggle + logout */}
        <div className="px-4 py-4 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN CONTENT AREA
          ════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar — desktop shows page title + notifications / mobile shows hamburger */}
        <header className="flex items-center justify-between h-14 px-5 border-b border-border bg-card shrink-0">
          {/* Left: hamburger (mobile) or page title (desktop) */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop page title */}
            <div className="hidden md:flex flex-col">
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {activeTabMeta?.label ?? 'Admin'}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {profile.role === 'admin' ? 'Administrator' : 'Staff'} · {profile.name}
              </p>
            </div>

            {/* Mobile: brand name */}
            <div className="md:hidden flex items-center gap-2">
              <Image src="/logo.png" alt="logo" width={28} height={28} className="rounded-full object-cover" />
              <span className="font-serif text-sm font-bold text-foreground">M. P. GAYETA</span>
            </div>
          </div>

          {/* Right: notifications + theme toggle (mobile) */}
          <div className="flex items-center gap-2">
            <NotificationPanel />
            {/* Theme toggle visible on mobile in header */}
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Scrollable tab content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
            {tabContent[activeTab]}
          </div>
        </main>


      </div>

      {/* ════════════════════════════════════════
          MOBILE SIDEBAR OVERLAY
          ════════════════════════════════════════ */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Slide-in panel */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col md:hidden animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="logo" width={32} height={32} className="rounded-full object-cover" />
                <div>
                  <p className="font-serif text-sm font-bold text-foreground">M. P. GAYETA</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    {profile.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Bottom */}
            <div className="px-4 py-4 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Appearance</span>
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
