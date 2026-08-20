'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Spinner, MiniSelect } from './admin-primitives'
import { SalesReportModal } from './sales-report-modal'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts'
import {
  BarChart3, ArrowRight, Mail,
  ChevronDown, ChevronUp,
  Inbox, Wallet
} from 'lucide-react'
import type { Inquiry, Payment, UserRole } from '@/lib/supabase/types'

const G = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

const PLACEHOLDER_PIE = [
  { name: 'Burial',      value: 1 },
  { name: 'Cremation',   value: 1 },
  { name: 'Columbarium', value: 1 },
]

function DonutTip({ active, payload, isPlaceholder }: { active?: boolean; payload?: { name: string; value: number }[]; isPlaceholder?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-lg text-[11px]">
      <p className="font-semibold text-muted-foreground capitalize">{payload[0].name}</p>
      <p className="font-bold text-primary">{isPlaceholder ? '0%' : `₱${Number(payload[0].value).toLocaleString('en-PH')}`}</p>
    </div>
  )
}

function BarTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-lg text-[11px]">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-primary">₱{Number(payload[0].value).toLocaleString('en-PH')}</p>
    </div>
  )
}

function buildDailyTrend(payments: { amount: number; approved_at: string | null }[], days = 14) {
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    return {
      day:     `${d.getMonth() + 1}/${d.getDate()}`,
      revenue: payments.filter(p => p.approved_at?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0),
    }
  })
}

// Human-readable labels for product_type values used in the breakdown chart
const PRODUCT_LABELS: Record<string, string> = {
  package:      'Burial',
  cremation:    'Cremation',
  columbarium:  'Columbarium',
  urn:          'Urn',
  general:      'General',
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year',  label: 'This Year' },
] as const
type PeriodFilter = typeof PERIOD_OPTIONS[number]['value']

function buildProductBreakdown(payments: { amount: number; product_type: string }[]) {
  const map: Record<string, number> = {}
  payments.forEach(p => {
    const label = PRODUCT_LABELS[p.product_type] ?? p.product_type
    map[label] = (map[label] ?? 0) + Number(p.amount)
  })
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 4)
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ── Metrics Stat Card ─────────────────────────── */
function MetricCard({
  label, value, subtitle, trend, trendType = 'up', onClick, accent = 'default'
}: {
  label: string; value: string | number; subtitle?: string; trend?: string; trendType?: 'up' | 'down'
  onClick?: () => void; accent?: 'default' | 'amber' | 'emerald'
}) {
  const accentColor = accent === 'amber' ? 'text-amber-500' : accent === 'emerald' ? 'text-emerald-500' : 'text-foreground'
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.99]' : ''
      }`}
    >
      <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">{label}</p>
      <p className={`text-[32px] font-bold leading-none tracking-tight ${accentColor}`}>{value}</p>
      <div className="flex items-center gap-1.5 min-h-[18px]">
        {trend ? (
          trendType === 'up' ? (
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">▲ {trend}</span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">▼ {trend}</span>
          )
        ) : null}
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
export function OverviewTab({ currentRole, onNavigate }: { currentRole: UserRole; onNavigate: (tab: string, paymentId?: string) => void }) {
  const supabase = createClient()

  const [stats,            setStats]            = useState({ pending: 0, inquiries: 0, profiles: 0, thisMonthRevenue: 0, totalRevenue: 0, approvedCount: 0 })
  const [approvedPayments, setApprovedPayments] = useState<{ amount: number; approved_at: string | null; product_type: string }[]>([])
  const [pendingPayments,  setPendingPayments]  = useState<(Payment & { guest_name?: string })[]>([])
  const [recentInquiries,  setRecentInquiries]  = useState<Inquiry[]>([])
  const [dailyTrend,       setDailyTrend]       = useState<{ day: string; revenue: number }[]>([])
  const [productBreakdown, setProductBreakdown] = useState<{ name: string; value: number }[]>([])
  const [loading,          setLoading]          = useState(true)
  const [showReport,       setShowReport]       = useState(false)
  const [expandedInq,      setExpandedInq]      = useState<string | null>(null)
  const [periodFilter,     setPeriodFilter]     = useState<PeriodFilter>('month')
  const [chartDays,        setChartDays]        = useState<7 | 14 | 30 | 90>(14)

  // Dynamic state for percentages
  const [paidInvoicesPct,  setPaidInvoicesPct]  = useState(0)
  const [fundsReceivedPct, setFundsReceivedPct] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { count: pending }, { count: inquiries }, { count: profiles },
      { data: pendingRows }, { data: recentInq }, { data: approvedRaw },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('inquiries').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('id,method,reference_number,amount,user_id,guest_name,product_type,created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('inquiries').select('id,name,email,subject,message,is_read,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('payments').select('amount,approved_at,product_type').eq('status', 'approved'),
    ])

    const approved    = (approvedRaw ?? []) as { amount: number; approved_at: string | null; product_type: string }[]
    const pendingList = (pendingRows ?? []) as (Payment & { guest_name?: string })[]
    const totalRevenue = approved.reduce((s, p) => s + Number(p.amount), 0)
    const pendingRevenue = pendingList.reduce((s, p) => s + Number(p.amount), 0)
    const totalPossible  = totalRevenue + pendingRevenue

    const now = new Date()
    const mk  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisMonthRevenue = approved.filter(p => p.approved_at?.startsWith(mk)).reduce((s, p) => s + Number(p.amount), 0)

    const totalCount = (pending ?? 0) + approved.length
    setPaidInvoicesPct(totalCount > 0 ? Math.round((approved.length / totalCount) * 100) : 0)
    setFundsReceivedPct(totalPossible > 0 ? Math.round((totalRevenue / totalPossible) * 100) : 0)

    setApprovedPayments(approved)
    setStats({ pending: pending ?? 0, inquiries: inquiries ?? 0, profiles: profiles ?? 0, thisMonthRevenue, totalRevenue, approvedCount: approved.length })
    setPendingPayments(pendingList)
    setRecentInquiries((recentInq ?? []) as Inquiry[])
    setDailyTrend(buildDailyTrend(approved))
    setProductBreakdown(buildProductBreakdown(approved)); setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── Period revenue computation (client-side from stored approvedPayments) ──
  const periodRevenue = (() => {
    const now   = new Date()
    const today = now.toISOString().slice(0, 10)
    if (periodFilter === 'today') {
      return approvedPayments.filter(p => p.approved_at?.startsWith(today)).reduce((s, p) => s + Number(p.amount), 0)
    }
    if (periodFilter === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6)
      return approvedPayments.filter(p => p.approved_at && p.approved_at >= weekAgo.toISOString().slice(0, 10)).reduce((s, p) => s + Number(p.amount), 0)
    }
    if (periodFilter === 'month') {
      const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return approvedPayments.filter(p => p.approved_at?.startsWith(mk)).reduce((s, p) => s + Number(p.amount), 0)
    }
    // year
    return approvedPayments.filter(p => p.approved_at?.startsWith(String(now.getFullYear()))).reduce((s, p) => s + Number(p.amount), 0)
  })()

  // Recompute trend whenever chartDays changes (no extra DB call)
  const chartTrend = buildDailyTrend(approvedPayments, chartDays)

  const CHART_RANGES = [
    { days: 7  as const, label: '7d'  },
    { days: 14 as const, label: '14d' },
    { days: 30 as const, label: '30d' },
    { days: 90 as const, label: '90d' },
  ]

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
  const totalPieRev   = productBreakdown.reduce((s, p) => s + p.value, 0)

  return (
    <div className="space-y-6 p-1">
      {showReport && <SalesReportModal onClose={() => setShowReport(false)} />}

      {/* ── ROW 1: Metric Overview Blocks ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Col 1 Stack */}
        <div className="flex flex-col gap-4">
          <MetricCard
            label="Pending Payments"
            value={stats.pending}
            trend={stats.pending > 0 ? `${stats.pending} awaiting` : 'All clear'}
            trendType={stats.pending > 0 ? 'down' : 'up'}
            accent={stats.pending > 0 ? 'amber' : 'default'}
            onClick={() => onNavigate('payments')}
          />

          {/* Revenue card with period dropdown */}
          <div
            onClick={() => setShowReport(true)}
            className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.99] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Revenue</p>
              <MiniSelect
                value={periodFilter}
                options={PERIOD_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                onChange={v => setPeriodFilter(v as PeriodFilter)}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <p className="text-[32px] font-bold leading-none tracking-tight text-foreground">
              ₱{periodRevenue.toLocaleString('en-PH')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label} · approved
            </p>
          </div>
        </div>

        {/* Col 2 Stack */}
        <div className="flex flex-col gap-4">
          <MetricCard
            label="Approved"
            value={stats.approvedCount}
            trend="All time"
            trendType="up"
            accent="emerald"
            onClick={() => onNavigate('payments')}
          />
          <MetricCard
            label="Total Revenue"
            value={`₱${stats.totalRevenue.toLocaleString('en-PH')}`}
            subtitle="All-time approved"
            onClick={() => setShowReport(true)}
          />
        </div>

        {/* Col 3 Tall Card: Users (With Donut) */}
        <div
          onClick={() => onNavigate('profiles')}
          className="bg-card border border-border/60 rounded-[24px] p-6 flex flex-col justify-between shadow-sm min-h-[280px] cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div>
            <p className="text-xs text-muted-foreground font-semibold tracking-wide uppercase mb-1">Registered Users</p>
            <p className="text-3xl font-bold text-foreground leading-none tracking-tight">{stats.profiles}</p>
            <span className="text-[10px] text-muted-foreground">active client accounts</span>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="shrink-0" style={{ width: 84, height: 84 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ value: stats.profiles || 1 }, { value: Math.max(1, stats.profiles * 0.4) }]} cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    <Cell fill="#f59e0b" />
                    <Cell fill="var(--color-border)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              <button
                onClick={e => { e.stopPropagation(); onNavigate('profiles') }}
                className="w-full flex items-center gap-2 hover:opacity-70 transition-opacity text-left"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[10px] text-foreground font-medium">Registered</span>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">72%</span>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onNavigate('inquiries') }}
                className="w-full flex items-center gap-2 hover:opacity-70 transition-opacity text-left"
              >
                <span className="h-2 w-2 rounded-full bg-border shrink-0" />
                <span className="text-[10px] text-muted-foreground">Guest inquiries</span>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">28%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Col 4 Tall Card: Total Inquiries (With Donut) */}
        <div
          onClick={() => onNavigate('inquiries')}
          className="bg-card border border-border/60 rounded-[24px] p-6 flex flex-col justify-between shadow-sm min-h-[280px] cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
        >
          <div>
            <p className="text-xs text-muted-foreground font-semibold tracking-wide uppercase mb-1">Total Inquiries</p>
            <p className="text-3xl font-bold text-foreground leading-none tracking-tight">{stats.inquiries}</p>
            <span className="text-[10px] text-muted-foreground">customer requests received</span>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="shrink-0" style={{ width: 84, height: 84 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={isPlaceholder ? G[i] + '55' : G[i % G.length]} />)}
                  </Pie>
                  <RechartsTooltip content={<DonutTip isPlaceholder={isPlaceholder} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {pieData.slice(0, 3).map((item, i) => {
                const pct = isPlaceholder ? 33.3 : totalPieRev > 0 ? (item.value / totalPieRev) * 100 : 0
                return (
                  <button
                    key={item.name}
                    onClick={e => { e.stopPropagation(); onNavigate('funeral-services') }}
                    className="w-full flex items-center gap-2 hover:opacity-70 transition-opacity text-left"
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: isPlaceholder ? G[i] + '88' : G[i % G.length] }} />
                    <span className="text-[10px] text-foreground capitalize truncate flex-1">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{isPlaceholder ? '0%' : `${pct.toFixed(0)}%`}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── ROW 2: Graph Panels & Activity Tables ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left Area (7 columns) */}
        <div className="xl:col-span-7 space-y-5">
          
          {/* Sales Dynamics (Bar Chart) */}
          <div className="bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Sales Dynamics</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Daily approved revenue</p>
              </div>
              <MiniSelect
                value={chartDays}
                options={CHART_RANGES.map(r => ({ value: r.days, label: `Last ${r.label}` }))}
                onChange={v => setChartDays(v as typeof chartDays)}
              />
            </div>
            <div className="px-4 py-5" style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={11}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} interval={Math.floor(chartDays / 7)} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} width={32} />
                  <RechartsTooltip content={<BarTip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overall User Activity (Area Chart) */}
          <div className="bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Overall User Activity</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Active customer submissions &amp; updates</p>
              </div>
              <MiniSelect
                value={chartDays}
                options={CHART_RANGES.map(r => ({ value: r.days, label: `Last ${r.label}` }))}
                onChange={v => setChartDays(v as typeof chartDays)}
              />
            </div>
            <div className="px-4 py-5" style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} interval={Math.floor(chartDays / 7)} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={32} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Area (5 columns) */}
        <div className="xl:col-span-5 space-y-5">
          
          {/* Dynamic Progress Micro Cards */}
          <div className="grid grid-cols-2 gap-4">
            
            <div
              onClick={() => setShowReport(true)}
              className="bg-card border border-border/60 rounded-[20px] p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground/80 truncate uppercase tracking-wider">Paid Invoices</p>
                <p className="text-lg font-bold text-foreground mt-1 truncate">₱{stats.totalRevenue.toLocaleString('en-PH')}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Current Financial Year</p>
              </div>
              <div className="relative shrink-0 ml-3 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" className="stroke-muted/40" strokeWidth="4" fill="transparent" />
                  <circle cx="24" cy="24" r="20" className="stroke-violet-500" strokeWidth="4" fill="transparent"
                          strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - paidInvoicesPct / 100)} strokeLinecap="round" />
                </svg>
                <span className="absolute text-[10px] font-bold text-violet-500">{paidInvoicesPct}%</span>
              </div>
            </div>

            <div
              onClick={() => onNavigate('payments')}
              className="bg-card border border-border/60 rounded-[20px] p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground/80 truncate uppercase tracking-wider">Funds Received</p>
                <p className="text-lg font-bold text-foreground mt-1 truncate">₱{stats.totalRevenue.toLocaleString('en-PH')}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Current Financial Year</p>
              </div>
              <div className="relative shrink-0 ml-3 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" className="stroke-muted/40" strokeWidth="4" fill="transparent" />
                  <circle cx="24" cy="24" r="20" className="stroke-emerald-500" strokeWidth="4" fill="transparent"
                          strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - fundsReceivedPct / 100)} strokeLinecap="round" />
                </svg>
                <span className="absolute text-[10px] font-bold text-emerald-500">{fundsReceivedPct}%</span>
              </div>
            </div>

          </div>

          {/* Customer Orders / Pending payments */}
          <div className="bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
              <div>
                <p className="text-sm font-semibold text-foreground">Customer Orders</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting authorization & documentation</p>
              </div>
              <button onClick={() => onNavigate('payments')} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {pendingPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-10">No pending payments.</p>
            ) : (
              <div className="divide-y divide-border/40">
                {pendingPayments.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onNavigate('payments', p.id)}
                    className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">
                          {(p.guest_name ?? 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.guest_name ?? 'Registered User'}</p>
                        <p className="text-[10px] text-muted-foreground truncate capitalize">{p.product_type} · {p.method}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs font-bold text-foreground">₱{Number(p.amount).toLocaleString('en-PH')}</p>
                      <span className="inline-flex items-center text-[9px] font-semibold text-amber-500 mt-0.5">
                        ● Pending
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inquiries Widget Area */}
          <div className="bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
              <div className="flex items-center gap-2">
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
            <div className="divide-y divide-border/40 overflow-y-auto max-h-[220px]">
              {recentInquiries.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-10">No inquiries yet.</p>
              ) : recentInquiries.map(inq => (
                <div key={inq.id}>
                  <button className="w-full flex items-start gap-3 px-6 py-3 hover:bg-muted/10 transition-colors text-left"
                    onClick={() => toggleInquiry(inq.id, inq.is_read)}>
                    <div className={`mt-2 h-1.5 w-1.5 rounded-full shrink-0 ${inq.is_read ? 'bg-border' : 'bg-primary'}`} />
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{inq.name.charAt(0).toUpperCase()}</span>
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
                    <div className="px-6 pb-4 bg-muted/10 border-t border-border/30">
                      <p className="text-xs text-foreground leading-relaxed pt-3">{inq.message}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <a href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject)}`}
                          className="inline-flex items-center gap-1.5 h-6 px-3 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors">
                          <Mail className="h-2.5 w-2.5" /> Reply
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

      </div>

    </div>
  )
}