'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { OverviewTab }    from '@/components/admin/overview-tab'
import { InquiriesTab }   from '@/components/admin/inquiries-tab'
import { BookingsTab }    from '@/components/admin/bookings-tab'
import { PaymentsTab }    from '@/components/admin/payments-tab'
import { ColumbariumTab } from '@/components/admin/columbarium-tab'
import { ObituariesTab }  from '@/components/admin/obituaries-tab'
import { ProfilesTab }    from '@/components/admin/profiles-tab'
import {
  LayoutDashboard, Mail, BookOpen, CreditCard,
  Grid3X3, ScrollText, UserCircle2, ShieldAlert,
} from 'lucide-react'
import type { Profile, UserRole } from '@/lib/supabase/types'

type Tab = 'overview' | 'inquiries' | 'bookings' | 'payments' | 'columbarium' | 'obituaries' | 'profiles'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',    icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'inquiries',   label: 'Inquiries',   icon: <Mail className="h-3.5 w-3.5" /> },
  { id: 'bookings',    label: 'Bookings',    icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'payments',    label: 'Payments',    icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: 'columbarium', label: 'Columbarium', icon: <Grid3X3 className="h-3.5 w-3.5" /> },
  { id: 'obituaries',  label: 'Obituaries',  icon: <ScrollText className="h-3.5 w-3.5" /> },
  { id: 'profiles',    label: 'Profiles',    icon: <UserCircle2 className="h-3.5 w-3.5" /> },
]

export default function AdminPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [profile, setProfile]     = useState<Profile | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

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

  // Loading
  if (profile === undefined) {
    return (
      <>
        <HeroHeader />
        <main className="flex-1 flex items-center justify-center py-32 bg-background">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      </>
    )
  }

  // Access denied
  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    return (
      <>
        <HeroHeader />
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
      </>
    )
  }

  const currentRole = profile.role as UserRole

  const tabContent: Record<Tab, React.ReactNode> = {
    overview:    <OverviewTab currentRole={currentRole} />,
    inquiries:   <InquiriesTab />,
    bookings:    <BookingsTab />,
    payments:    <PaymentsTab currentRole={currentRole} />,
    columbarium: <ColumbariumTab />,
    obituaries:  <ObituariesTab />,
    profiles:    <ProfilesTab currentRole={currentRole} />,
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background min-h-screen">

        {/* Sticky tab bar */}
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-16 z-40">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-0.5 overflow-x-auto no-scrollbar py-1.5 px-3">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-8">
          {tabContent[activeTab]}
        </div>

      </main>
    </>
  )
}
