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
import { WakeScheduleTab } from '@/components/admin/wake-schedule-tab'
import {
  LayoutDashboard, Mail, CreditCard,
  Grid3X3, ScrollText, UserCircle2, ShieldAlert,
  ClipboardList, LogOut, Menu, X, Receipt,
  ChevronLeft, ChevronRight, Moon,
} from 'lucide-react'
import type { Profile, UserRole } from '@/lib/supabase/types'

const VALID_TABS = ['overview','availments','wake-schedule','columbarium','payments','transactions','obituaries','profiles','inquiries'] as const
type Tab = typeof VALID_TABS[number]

function getTabFromHash(): Tab {
  if (typeof window === 'undefined') return 'overview'
  const hash = window.location.hash.replace('#', '')
  return (VALID_TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'overview'
}

// ── Logical workflow order ────────────────────────────────────
// 1. Overview         — dashboard at a glance
// 2. Funeral Services — core operations: document submissions
// 3. Wake Schedule    — coffin/casket service schedules & extension requests
// 4. Columbarium      — core operations: slot management
// 5. Payments         — financial: payment approvals
// 6. Transactions     — financial: full transaction register
// 7. Obituaries       — content: publish/manage tarps
// 8. Profiles         — settings-type: user management (admin only)
// 9. Inquiries        — always last per spec
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',       label: 'Overview',         icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'availments',     label: 'Funeral Services', icon: <ClipboardList   className="h-4 w-4" /> },
  { id: 'wake-schedule',  label: 'Wake Schedule',    icon: <Moon            className="h-4 w-4" /> },
  { id: 'columbarium',    label: 'Columbarium',      icon: <Grid3X3         className="h-4 w-4" /> },
  { id: 'payments',       label: 'Payments',         icon: <CreditCard      className="h-4 w-4" /> },
  { id: 'transactions',   label: 'Transactions',     icon: <Receipt         className="h-4 w-4" /> },
  { id: 'obituaries',     label: 'Obituaries',       icon: <ScrollText      className="h-4 w-4" /> },
  { id: 'profiles',       label: 'Profiles',         icon: <UserCircle2     className="h-4 w-4" /> },
  { id: 'inquiries',      label: 'Inquiries',        icon: <Mail            className="h-4 w-4" /> },
]

// ── Nav item — works for both expanded and collapsed state ────
function NavItem({
  tab, isActive, collapsed, onClick,
}: {
  tab: typeof TABS[number]
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? tab.label : undefined}
      className={`w-full flex items-center gap-3 rounded-lg font-medium transition-all text-left
        ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
        ${isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
    >
      <span className="shrink-0">{tab.icon}</span>
      {!collapsed && <span className="text-sm truncate">{tab.label}</span>}
    </button>
  )
}

export default function AdminPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile,    setProfile]    = useState<Profile | null | undefined>(undefined)
  const [activeTab,  setActiveTab]  = useState<Tab>(getTabFromHash)

  const setTab = (tab: Tab) => {
    window.location.hash = tab
    setActiveTab(tab)
  }

  // Keep activeTab in sync if the user navigates with browser back/forward
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile overlay
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('admin:sidebarCollapsed') === 'true'
  })
  const setSidebarCollapsedPersist = (v: boolean) => {
    localStorage.setItem('admin:sidebarCollapsed', String(v))
    setSidebarCollapsed(v)
  }
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

  // Staff cannot access profiles tab — redirect to overview
  useEffect(() => {
    if (profile?.role === 'staff' && activeTab === 'profiles') {
      setTab('overview')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeTab])

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
    overview:       <OverviewTab currentRole={currentRole} onNavigate={(tab, paymentId?) => {
                      if (paymentId) setHighlightPaymentId(paymentId)
                      setTab(tab as Tab)
                    }} />,
    availments:     <DocumentSubmissionsTab currentRole={currentRole} />,
    'wake-schedule': <WakeScheduleTab currentRole={currentRole} />,
    columbarium:    <ColumbariumTab />,
    payments:       <PaymentsTab currentRole={currentRole} highlightPaymentId={highlightPaymentId} onHighlightClear={() => setHighlightPaymentId(null)} />,
    transactions:   <TransactionRegisterTab currentRole={currentRole} />,
    obituaries:     <ObituariesTab />,
    profiles:       <ProfilesTab currentRole={currentRole} />,
    inquiries:      <InquiriesTab staffName={profile.name} />,
  }

  const activeTabMeta = TABS.find(t => t.id === activeTab)

  // Staff cannot access the Profiles tab — redirect to overview if they somehow land there
  const visibleTabs = currentRole === 'admin'
    ? TABS
    : TABS.filter(t => t.id !== 'profiles')

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ════════════════════════════════════════
          DESKTOP LEFT SIDEBAR
          ════════════════════════════════════════ */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-border bg-card transition-all duration-200 relative
          ${sidebarCollapsed ? 'w-[60px]' : 'w-[280px]'}`}
      >
        {/* Inner wrapper clips content during animation without hiding the toggle button */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Brand */}
        <div className={`flex items-center border-b border-border/60 transition-all duration-200
          ${sidebarCollapsed ? 'justify-center px-0 py-4' : 'gap-2.5 px-4 py-5'}`}
        >
          <Image src="/logo.png" alt="M. P. Gayeta" width={sidebarCollapsed ? 30 : 34} height={sidebarCollapsed ? 30 : 34} className="rounded-full object-cover shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-serif text-sm font-bold leading-tight text-foreground truncate">M. P. GAYETA</span>
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-sans truncate">
                {profile.role === 'admin' ? 'Admin Panel' : 'Staff Panel'}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${sidebarCollapsed ? 'px-1.5' : 'px-2'}`}>
          {visibleTabs.map(tab => (
            <NavItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              collapsed={sidebarCollapsed}
              onClick={() => setTab(tab.id)}
            />
          ))}
        </nav>

        {/* Bottom: theme toggle + logout */}
        <div className={`border-t border-border/60 space-y-2 py-3 ${sidebarCollapsed ? 'px-1.5' : 'px-3'}`}>
          {sidebarCollapsed ? (
            <div className="flex justify-center py-1">
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Appearance</span>
              <ThemeToggle />
            </div>
          )}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all
              ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>

        </div>{/* end inner overflow-hidden wrapper */}

        {/* ── Collapse toggle — vertical pill on the right edge, vertically centered ── */}
        <button
          onClick={() => setSidebarCollapsedPersist(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-1/2 -translate-y-1/2 -right-[20px] z-20
            h-16 w-5 rounded-r-lg
            bg-card border-y border-r border-border/60
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-all duration-150"
        >
          {sidebarCollapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft  className="h-4 w-4" />
          }
        </button>
      </aside>

      {/* ════════════════════════════════════════
          MAIN CONTENT AREA
          ════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-5 border-b border-border bg-card shrink-0">
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

          <div className="flex items-center gap-2">
            <NotificationPanel />
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
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col md:hidden animate-in slide-in-from-left duration-200">
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

            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setTab(tab.id); setSidebarOpen(false) }}
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
