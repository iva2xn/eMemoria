'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell, CreditCard, Mail, FileText, ScrollText, Grid3X3,
  Check, Activity, ShieldAlert, UserCircle2, CheckCheck,
  ExternalLink, Trash2, Download, X,
} from 'lucide-react'
import type { LogEntry } from '@/lib/activity-log'

// ── Icon map by event_type ────────────────────────────────────
function EventIcon({ eventType }: { eventType: string }) {
  const cls = 'h-3.5 w-3.5'
  const icons: Record<string, React.ReactNode> = {
    payment_submitted:          <CreditCard  className={cls} />,
    payment_approved:           <Check       className={cls} />,
    payment_rejected:           <CreditCard  className={cls} />,
    inquiry_received:           <Mail        className={cls} />,
    doc_submission_received:    <FileText    className={cls} />,
    doc_submission_approved:    <CheckCheck  className={cls} />,
    doc_submission_rejected:    <FileText    className={cls} />,
    obituary_submitted:         <ScrollText  className={cls} />,
    obituary_published:         <ScrollText  className={cls} />,
    slot_reserved:              <Grid3X3     className={cls} />,
    slot_occupied:              <Grid3X3     className={cls} />,
    slot_available:             <Grid3X3     className={cls} />,
    booking_updated:            <Activity    className={cls} />,
    role_changed:               <UserCircle2 className={cls} />,
    account_deletion_requested: <Trash2      className={cls} />,
  }
  return <>{icons[eventType] ?? <ShieldAlert className={cls} />}</>
}

// ── Colour dot by category / event ───────────────────────────
function dotColor(entry: LogEntry): string {
  if (entry.category === 'notification') {
    if (entry.event_type.includes('payment'))  return 'bg-primary'
    if (entry.event_type.includes('inquiry'))  return 'bg-blue-500'
    if (entry.event_type.includes('doc'))      return 'bg-amber-500'
    if (entry.event_type.includes('obituary')) return 'bg-purple-500'
    if (entry.event_type.includes('slot'))     return 'bg-green-500'
    return 'bg-primary'
  }
  if (entry.event_type.includes('approved'))  return 'bg-primary'
  if (entry.event_type.includes('rejected'))  return 'bg-destructive'
  if (entry.event_type.includes('occupied'))  return 'bg-destructive/60'
  if (entry.event_type.includes('role'))      return 'bg-blue-500'
  return 'bg-muted-foreground'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Deep-link URL per event type ──────────────────────────────
function actionUrl(entry: LogEntry): string | null {
  const id = entry.entity_id
  switch (entry.event_type) {
    case 'doc_submission_received':
    case 'doc_submission_approved':
    case 'doc_submission_rejected':
      return id ? `/admin?submission=${id}#availments` : '/admin#availments'
    case 'payment_submitted':
    case 'payment_approved':
    case 'payment_rejected':
      return id ? `/admin#payments` : '/admin#payments'
    case 'inquiry_received':
      return id ? `/admin#inquiries` : '/admin#inquiries'
    case 'obituary_submitted':
    case 'obituary_published':
      return '/admin#obituaries'
    case 'slot_reserved':
    case 'slot_occupied':
    case 'slot_available':
      return '/admin#columbarium'
    case 'account_deletion_requested':
      return '/admin#profiles'
    case 'role_changed':
      return '/admin#profiles'
    default:
      return null
  }
}

// ── CSV log download ──────────────────────────────────────────
type DownloadFilter = {
  type: 'all' | 'user' | 'date' | 'action'
  value?: string
}

function buildCsvRows(entries: LogEntry[]): string {
  const HEADER = ['Date', 'Time', 'Category', 'Event Type', 'Actor', 'Message', 'Entity ID', 'Metadata']
  const escape = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`
  const rows = entries.map(e => {
    const d = new Date(e.created_at)
    return [
      d.toLocaleDateString('en-PH'),
      d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      e.category,
      e.event_type,
      e.actor_name ?? '',
      e.message,
      e.entity_id ?? '',
      e.metadata ? JSON.stringify(e.metadata) : '',
    ].map(escape).join(',')
  })
  return [HEADER.map(escape).join(','), ...rows].join('\r\n')
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Download modal ────────────────────────────────────────────
function DownloadModal({
  entries,
  onClose,
}: {
  entries: LogEntry[]
  onClose: () => void
}) {
  const supabase = createClient()
  const [filterType, setFilterType] = useState<'all' | 'user' | 'date_range' | 'action'>('all')
  const [actorName,  setActorName]  = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [actionVal,  setActionVal]  = useState('')
  const [downloading, setDownloading] = useState(false)

  const uniqueActors  = Array.from(new Set(entries.map(e => e.actor_name).filter(Boolean))) as string[]
  const uniqueActions = Array.from(new Set(entries.map(e => e.event_type)))

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Fetch ALL logs from DB (not just the 80 loaded in panel)
      let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false })

      if (filterType === 'user'       && actorName)  query = query.eq('actor_name', actorName)
      if (filterType === 'action'     && actionVal)   query = query.eq('event_type', actionVal)
      if (filterType === 'date_range' && dateFrom)    query = query.gte('created_at', dateFrom + 'T00:00:00')
      if (filterType === 'date_range' && dateTo)      query = query.lte('created_at', dateTo   + 'T23:59:59')

      const { data } = await query.limit(5000)
      const allEntries = (data as LogEntry[]) ?? []

      const now  = new Date()
      const date = now.toISOString().slice(0, 10)
      let filename = `ememoira-logs-${date}`
      if (filterType === 'user'       && actorName)  filename += `-${actorName.replace(/\s+/g, '_')}`
      if (filterType === 'action'     && actionVal)   filename += `-${actionVal}`
      if (filterType === 'date_range' && (dateFrom || dateTo)) filename += `-${dateFrom || ''}_${dateTo || ''}`
      filename += '.csv'

      downloadCsv(buildCsvRows(allEntries), filename)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-bold text-foreground">Download Activity Logs</p>
            <p className="text-[10px] text-muted-foreground">Export sorted by user, date, or action type</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Filter type */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter Type</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'all',        l: 'All Logs' },
                { v: 'user',       l: 'By User' },
                { v: 'date_range', l: 'By Date Range' },
                { v: 'action',     l: 'By Action' },
              ] as const).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setFilterType(v)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    filterType === v
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* User filter */}
          {filterType === 'user' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User / Actor Name</label>
              <select
                value={actorName}
                onChange={e => setActorName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none"
              >
                <option value="">— All users —</option>
                {uniqueActors.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {/* Date range filter */}
          {filterType === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none"
                />
              </div>
            </div>
          )}

          {/* Action filter */}
          {filterType === 'action' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action / Event Type</label>
              <select
                value={actionVal}
                onChange={e => setActionVal(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none"
              >
                <option value="">— All actions —</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {downloading
              ? <><div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> Generating…</>
              : <><Download className="h-3.5 w-3.5" /> Download CSV</>
            }
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            Exports up to 5,000 records. UTF-8 encoded CSV.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
type NotificationPanelProps = {
  onNavigate?: (submissionId: string) => void
  currentRole?: string
}

const ADMIN_ONLY_EVENTS = new Set(['account_deletion_requested'])

export function NotificationPanel({ onNavigate, currentRole = 'admin' }: NotificationPanelProps) {
  const supabase  = createClient()
  const router    = useRouter()
  const panelRef  = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [open,           setOpen]           = useState(false)
  const [tab,            setTab]            = useState<'notification' | 'log'>('notification')
  const [entries,        setEntries]        = useState<LogEntry[]>([])
  const [loading,        setLoading]        = useState(false)
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [showDownload,   setShowDownload]   = useState(false)

  const visibleEntries = currentRole === 'admin'
    ? entries
    : entries.filter(e => !ADMIN_ONLY_EVENTS.has(e.event_type))

  const notifications = visibleEntries.filter(e => e.category === 'notification')
  const logs          = visibleEntries.filter(e => e.category === 'log')

  // ── Unread count — realtime + polling ────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'notification')
      .eq('is_read', false)
    if (!error) setUnreadCount(count ?? 0)
  }, [supabase])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // ── Real-time: new activity_log rows bump the badge instantly ─
  useEffect(() => {
    const channel = supabase
      .channel('admin-activity-log-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          const entry = payload.new as LogEntry
          // Filter for role
          if (currentRole !== 'admin' && ADMIN_ONLY_EVENTS.has(entry.event_type)) return
          // Bump badge for notification-category entries
          if (entry.category === 'notification' && !entry.is_read) {
            setUnreadCount(prev => prev + 1)
          }
          // Prepend to list if panel is already open
          setEntries(prev => [entry, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, currentRole])

  // ── Full load (when panel opens) ──────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80)
    const loaded = (data as LogEntry[]) ?? []
    setEntries(loaded)
    const visible = currentRole === 'admin'
      ? loaded
      : loaded.filter(e => !ADMIN_ONLY_EVENTS.has(e.event_type))
    setUnreadCount(visible.filter(e => !e.is_read && e.category === 'notification').length)
    setLoading(false)
  }, [supabase, currentRole])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  // ── Outside click closes panel ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Mark read ─────────────────────────────────────────────────
  const markAllRead = async () => {
    const unread = entries.filter(e => !e.is_read).map(e => e.id)
    if (!unread.length) return
    await supabase.from('activity_log').update({ is_read: true }).in('id', unread)
    setEntries(prev => prev.map(e => ({ ...e, is_read: true })))
    setUnreadCount(0)
  }

  const markOneRead = async (id: string) => {
    await supabase.from('activity_log').update({ is_read: true }).eq('id', id)
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // ── Click on an entry ─────────────────────────────────────────
  const handleEntryClick = async (entry: LogEntry) => {
    if (!entry.is_read) await markOneRead(entry.id)
    const url = actionUrl(entry)
    if (!url) return
    setOpen(false)

    const isDocSubmission = (
      entry.event_type === 'doc_submission_received' ||
      entry.event_type === 'doc_submission_approved' ||
      entry.event_type === 'doc_submission_rejected'
    )
    if (isDocSubmission && entry.entity_id && onNavigate) {
      onNavigate(entry.entity_id)
      return
    }

    router.push(url)
  }

  const displayed = tab === 'notification' ? notifications : logs

  return (
    <>
      {showDownload && (
        <DownloadModal entries={entries} onClose={() => setShowDownload(false)} />
      )}

      <div className="relative">
        {/* Bell button */}
        <button
          ref={buttonRef}
          onClick={() => setOpen(o => !o)}
          className="relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none pointer-events-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            ref={panelRef}
            className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-sm sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-10 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-sm font-bold text-foreground">Activity</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setOpen(false); setShowDownload(true) }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  title="Download logs"
                >
                  <Download className="h-3 w-3" /> Logs
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pb-2 border-b border-border/50">
              {(['notification', 'log'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    tab === t
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t === 'notification' ? 'Notifications' : 'Logs'}
                  {t === 'notification' && unreadCount > 0 && (
                    <span className="ml-1.5 bg-primary-foreground/20 text-primary-foreground rounded-full px-1 text-[9px]">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading && displayed.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : displayed.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-muted-foreground">
                    No {tab === 'notification' ? 'notifications' : 'logs'} yet
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {displayed.map(entry => {
                    const url    = actionUrl(entry)
                    const isLink = !!url
                    return (
                      <li
                        key={entry.id}
                        onClick={() => handleEntryClick(entry)}
                        className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${
                          isLink ? 'cursor-pointer' : 'cursor-default'
                        } ${!entry.is_read ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-white ${dotColor(entry)}`}>
                          <EventIcon eventType={entry.event_type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${!entry.is_read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                            {entry.message}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-muted-foreground/70">{timeAgo(entry.created_at)}</p>
                            {isLink && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                                View <ExternalLink className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                        {!entry.is_read && (
                          <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
              <button
                onClick={() => { setOpen(false); setShowDownload(true) }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download Logs CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
