'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from './admin-primitives'
import { PaymentInfoCard } from './payment-info-card'
import { SalesReportModal } from './sales-report-modal'
import { Clock, Mail, Users, Landmark, TrendingUp, BarChart3 } from 'lucide-react'
import type { Inquiry, Payment, UserRole } from '@/lib/supabase/types'

export function OverviewTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()
  const [stats, setStats] = useState({ pending: 0, inquiries: 0, profiles: 0, totalRevenue: 0 })
  const [pendingPayments, setPendingPayments] = useState<(Payment & { guest_name?: string; guest_email?: string })[]>([])
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { count: pending },
      { count: inquiries },
      { count: profiles },
      { data: pendingRows },
      { data: recentInq },
      { data: approvedPayments },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('inquiries').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('id,method,reference_number,amount,user_id,guest_name,guest_email').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('inquiries').select('id,name,email,subject,message,is_read,created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('payments').select('amount').eq('status', 'approved'),
    ])

    const totalRevenue = (approvedPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

    setStats({ pending: pending ?? 0, inquiries: inquiries ?? 0, profiles: profiles ?? 0, totalRevenue })
    setPendingPayments((pendingRows ?? []) as (Payment & { guest_name?: string; guest_email?: string })[])
    setRecentInquiries(recentInq ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await supabase.from('payments').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {showReport && <SalesReportModal onClose={() => setShowReport(false)} />}

      <PaymentInfoCard canEdit={currentRole === 'admin'} />

      {/* Stats container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Overview</span>
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Sales Report
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-border/60">
          {[
            { icon: <Clock className="h-5 w-5" />,    label: 'Pending Payments',  value: String(stats.pending),                              sub: 'awaiting review' },
            { icon: <Mail className="h-5 w-5" />,     label: 'Inquiries',         value: String(stats.inquiries),                            sub: 'submitted' },
            { icon: <Users className="h-5 w-5" />,    label: 'Registered Users',  value: String(stats.profiles),                             sub: 'accounts' },
            { icon: <Landmark className="h-5 w-5" />, label: 'Total Revenue',     value: `₱${stats.totalRevenue.toLocaleString('en-PH')}`,   sub: 'approved payments' },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
                <p className="text-xl font-serif font-bold text-foreground mt-0.5 truncate">{value}</p>
                <p className="text-[10px] text-muted-foreground/70">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending approvals */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Pending Approvals</h3>
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                {stats.pending} awaiting
              </span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {pendingPayments.length === 0
              ? <p className="text-xs text-muted-foreground italic text-center py-6">All payments processed.</p>
              : pendingPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/10">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.method} · {p.reference_number ?? 'no ref'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-serif font-bold text-primary text-xs">₱{Number(p.amount).toLocaleString()}</span>
                    {currentRole === 'admin' && (
                      <button onClick={() => approve(p.id)} className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent inquiries */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Recent Inquiries</h3>
          </div>
          <div className="p-4 space-y-2">
            {recentInquiries.length === 0
              ? <p className="text-xs text-muted-foreground italic text-center py-6">No inquiries yet.</p>
              : recentInquiries.map(inq => (
                <div key={inq.id} className="p-3 rounded-xl border border-border bg-background">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-semibold text-foreground">{inq.name}</p>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0">{new Date(inq.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{inq.email}</p>
                  <p className="text-[10px] text-primary font-medium mt-0.5">{inq.subject}</p>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
