'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from './admin-primitives'
import { SalesReportModal } from './sales-report-modal'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { BarChart3, ArrowRight, CreditCard, Mail, ChevronDown, ChevronUp, Users, TrendingUp } from 'lucide-react'
import type { Inquiry, Payment, UserRole } from '@/lib/supabase/types'

const G = ['#2f872b', '#3da637', '#5cbf57']
const PLACEHOLDER_PIE = [
  { name: 'Burial', value: 1 },
  { name: 'Cremation', value: 1 },
  { name: 'Columbarium', value: 1 },
]

function DonutTip({ active, payload, isPlaceholder }: { active?: boolean; payload?: { name: string; value: number }[]; isPlaceholder?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-lg text-[11px]">
      <p className="font-semibold text-muted-foreground capitalize">{payload[0].name}</p>
      <p className="font-bold text-primary">{isPlaceholder ? '0%' : `₱${Number(payload[0].value).toLocaleString('en-PH')}`}</p>
    </div>
  )
}

function AreaTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-lg text-[11px]">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-primary">₱{Number(payload[0].value).toLocaleString('en-PH')}</p>
    </div>
  )
}

function buildDailyTrend(payments: { amount: number; approved_at: string | null }[]) {
  const now = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i))
    const key = d.toISOString().slice(0, 10)
    return { day: `${d.getMonth() + 1}/${d.getDate()}`, revenue: payments.filter(p => p.approved_at?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0) }
  })
}

function buildProductBreakdown(payments: { amount: number; product_type: string }[]) {
  const map: Record<string, number> = {}
  payments.forEach(p => { map[p.product_type] = (map[p.product_type] ?? 0) + Number(p.amount) })
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 3)
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function OverviewTab({ currentRole, onNavigate }: { currentRole: UserRole; onNavigate: (tab: string) => void }) {
  const supabase = createClient()
  const [stats,            setStats]            = useState({ pending: 0, inquiries: 0, profiles: 0, thisMonthRevenue: 0 })
  const [pendingPayments,  setPendingPayments]  = useState<(Payment & { guest_name?: string })[]>([])
  const [recentInquiries,  setRecentInquiries]  = useState<Inquiry[]>([])
  const [dailyTrend,       setDailyTrend]       = useState<{ day: string; revenue: number }[]>([])
  const [productBreakdown, setProductBreakdown] = useState<{ name: string; value: number }[]>([])
  const [loading,          setLoading]          = useState(true)
  const [showReport,       setShowReport]       = useState(false)
  const [expandedInq,      setExpandedInq]      = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { count: pending }, { count: inquiries }, { count: profiles },
      { data: pendingRows }, { data: recentInq }, { data: approvedPayments },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('inquiries').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('id,method,reference_number,amount,user_id,guest_name,product_type').eq('status', 'pending').order('created_at', { ascending: false }).limit(6),
      supabase.from('inquiries').select('id,name,email,subject,message,is_read,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('payments').select('amount,approved_at,product_type').eq('status', 'approved'),
    ])
    const approved = (approvedPayments ?? []) as { amount: number; approved_at: string | null; product_type: string }[]
    const now = new Date()
    const mk  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisMonthRevenue = approved.filter(p => p.approved_at?.startsWith(mk)).reduce((s, p) => s + Number(p.amount), 0)
    setStats({ pending: pending ?? 0, inquiries: inquiries ?? 0, profiles: profiles ?? 0, thisMonthRevenue })
    setPendingPayments((pendingRows ?? []) as (Payment & { guest_name?: string })[])
    setRecentInquiries((recentInq ?? []) as Inquiry[])
    setDailyTrend(buildDailyTrend(approved))
    setProductBreakdown(buildProductBreakdown(approved))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const markRead = async (id: string) => {
    await supabase.from('inquiries').update({ is_read: true }).eq('id', id)
    setRecentInquiries(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i))
  }
  const toggleInquiry = (id: string, isRead: boolean) => {
    setExpandedInq(prev => prev === id ? null : id)
    if (!isRead) markRead(id)
  }

  if (loading) return <Spinner />

  const pieData       = productBreakdown.length > 0 ? productBreakdown : PLACEHOLDER_PIE
  const isPlaceholder = productBreakdown.length === 0
  const totalRevenue  = productBreakdown.reduce((s, p) => s + p.value, 0)

  return (
    <div className="space-y-5">
      {showReport && <SalesReportModal onClose={() => setShowReport(false)} />}

      {/* ROW 1 — Revenue by Service + Inquiries, equal halves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Revenue by Service */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <p className="text-sm font-semibold text-foreground">Revenue by Service</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isPlaceholder ? 'No payments yet — showing service breakdown' : 'Approved payments by type'}
                </p>
              </div>
              <button onClick={() => setShowReport(true)}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors">
                <BarChart3 className="h-3 w-3" /> Report
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-5">
              <div className="shrink-0" style={{ width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={isPlaceholder ? G[i] + '55' : G[i % G.length]} />)}
                    </Pie>
                    <RechartsTooltip content={<DonutTip isPlaceholder={isPlaceholder} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-3 min-w-0">
                {pieData.map((item, i) => {
                  const pct = isPlaceholder ? 33.3 : totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: isPlaceholder ? G[i] + '88' : G[i % G.length] }} />
                          <span className="text-foreground font-medium capitalize truncate">{item.name}</span>
                        </div>
                        <span className="text-muted-foreground font-mono shrink-0 ml-2">{isPlaceholder ? '0%' : `${pct.toFixed(0)}%`}</span>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${isPlaceholder ? 33.3 : pct}%`, background: isPlaceholder ? G[i] + '55' : G[i % G.length] }} />
                      </div>
                      {!isPlaceholder && <p className="text-[10px] text-muted-foreground font-mono">₱{item.value.toLocaleString('en-PH')}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        {/* Inquiries */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Inquiries</p>
                {recentInquiries.filter(i => !i.is_read).length > 0 && (
                  <span className="inline-flex px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                    {recentInquiries.filter(i => !i.is_read).length} new
                  </span>
                )}
              </div>
              <button onClick={() => onNavigate('inquiries')} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y divide-border/50">
              {recentInquiries.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-10">No inquiries yet.</p>
              ) : recentInquiries.map(inq => (
                <div key={inq.id}>
                  <button className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors text-left"
                    onClick={() => toggleInquiry(inq.id, inq.is_read)}>
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${inq.is_read ? 'bg-border' : 'bg-primary'}`} />
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">{inq.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${!inq.is_read ? 'font-semibold' : ''} text-foreground`}>{inq.name}</p>
                        <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(inq.created_at)}</span>
                      </div>
                      <p className="text-[10px] text-primary font-medium truncate mt-0.5">{inq.subject}</p>
                      {expandedInq !== inq.id && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{inq.message}</p>}
                    </div>
                    <div className="shrink-0 mt-1 text-muted-foreground">
                      {expandedInq === inq.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                  {expandedInq === inq.id && (
                    <div className="px-5 pb-4 bg-muted/10 border-t border-border/40">
                      <p className="text-xs text-foreground leading-relaxed pt-3">{inq.message}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <a href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject)}`}
                          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors">
                          <Mail className="h-3 w-3" /> Reply
                        </a>
                        <span className="text-[10px] text-muted-foreground font-mono">{inq.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
      </div>

      {/* ROW 2 — 4 equal stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-muted-foreground">Month Total</p>
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-primary" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">₱{stats.thisMonthRevenue.toLocaleString('en-PH')}</p>
              <p className="text-[10px] text-muted-foreground mt-1">this month</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-amber-400/50 transition-colors"
              onClick={() => onNavigate('payments')}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-muted-foreground">Pending Payments</p>
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-3 w-3 text-amber-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.pending}</p>
              <p className={`text-[10px] mt-1 ${stats.pending > 0 ? 'text-amber-500' : 'text-primary'}`}>
                {stats.pending > 0 ? `${stats.pending} awaiting →` : 'all clear'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onNavigate('profiles')}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-muted-foreground">Registered Users</p>
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-3 w-3 text-primary" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.profiles}</p>
              <p className="text-[10px] text-muted-foreground mt-1">clients →</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onNavigate('inquiries')}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-muted-foreground">Total Inquiries</p>
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-3 w-3 text-primary" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.inquiries}</p>
              <p className="text-[10px] text-muted-foreground mt-1">submitted →</p>
            </div>
      </div>

      {/* ROW 3 — Revenue Trend full width */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60">
          <p className="text-sm font-semibold text-foreground">Revenue Trend</p>
          <p className="text-[10px] text-muted-foreground">Last 14 days · daily approved</p>
        </div>
        <div className="px-2 py-4" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2f872b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2f872b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`} width={44} />
              <RechartsTooltip content={<AreaTip />} cursor={{ stroke: '#2f872b', strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area type="monotone" dataKey="revenue" stroke="#2f872b" strokeWidth={2} fill="url(#revGrad)" dot={false}
                activeDot={{ r: 4, fill: '#2f872b', stroke: 'var(--color-card)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
