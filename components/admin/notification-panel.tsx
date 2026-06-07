'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CreditCard, Mail, FileText, ScrollText, Grid3X3, Check, Activity, ShieldAlert, UserCircle2, CheckCheck } from 'lucide-react'
import type { LogEntry } from '@/lib/activity-log'

// ── Icon map by event_type ────────────────────────────────────
function EventIcon({ eventType }: { eventType: string }) {
  const cls = 'h-3.5 w-3.5'
  const icons: Record<string, React.ReactNode> = {
    payment_submitted:      <CreditCard className={cls} />,
    payment_approved:       <Check className={cls} />,
    payment_rejected:       <CreditCard className={cls} />,
    inquiry_received:       <Mail className={cls} />,
    doc_submission_received:<FileText className={cls} />,
    doc_submission_approved:<CheckCheck className={cls} />,
    doc_submission_rejected:<FileText className={cls} />,
    obituary_submitted:     <ScrollText className={cls} />,
    obituary_published:     <ScrollText className={cls} />,
    slot_reserved:          <Grid3X3 className={cls} />,
    slot_occupied:          <Grid3X3 className={cls} />,
    slot_available:         <Grid3X3 className={cls} />,
    booking_updated:        <Activity className={cls} />,
    role_changed:           <UserCircle2 className={cls} />,
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
  // log category
  if (entry.event_type.includes('approved'))  return 'bg-green-500'
  if (entry.event_type.includes('rejected'))  return 'bg-red-500'
  if (entry.event_type.includes('occupied'))  return 'bg-red-400'
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

// ── Main component ────────────────────────────────────────────
export function NotificationPanel() {
  const supabase   = createClient()
  const panelRef   = useRef<HTMLDivElement>(null)
  const buttonRef  = useRef<HTMLButtonElement>(null)

  const [open,        setOpen]        = useState(false)
  const [tab,         setTab]         = useState<'notification' | 'log'>('notification')
  const [entries,     setEntries]     = useState<LogEntry[]>([])
  const [loading,     setLoading]     = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const notifications = entries.filter(e => e.category === 'notification')
  const logs          = entries.filter(e => e.category === 'log')

  // Fetch just the unread count on mount + poll every 30s regardless of panel open state
  const fetchUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'notification')
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }, [supabase])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80)
    const loaded = (data as LogEntry[]) ?? []
    setEntries(loaded)
    setUnreadCount(loaded.filter(e => !e.is_read && e.category === 'notification').length)
    setLoading(false)
  }, [supabase])

  // Full load when panel opens, poll every 30s while open
  useEffect(() => {
    if (!open) return
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [open, load])

  // Close on outside click
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

  const markAllRead = async () => {
    const unread = entries.filter(e => !e.is_read).map(e => e.id)
    if (unread.length === 0) return
    await supabase.from('activity_log').update({ is_read: true }).in('id', unread)
    setEntries(prev => prev.map(e => ({ ...e, is_read: true })))
    setUnreadCount(0)
  }

  const markOneRead = async (id: string) => {
    await supabase.from('activity_log').update({ is_read: true }).eq('id', id)
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const displayed = tab === 'notification' ? notifications : logs

  return (
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
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="
            fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-sm
            sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-10 sm:w-96
            bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          ">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-foreground">Activity</h3>
            <button
              onClick={markAllRead}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Mark all read
            </button>
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
                <p className="text-xs text-muted-foreground">No {tab === 'notification' ? 'notifications' : 'logs'} yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {displayed.map(entry => (
                  <li
                    key={entry.id}
                    onClick={() => { if (!entry.is_read) markOneRead(entry.id) }}
                    className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                      !entry.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Icon bubble */}
                    <div className={`shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-white ${dotColor(entry)}`}>
                      <EventIcon eventType={entry.event_type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!entry.is_read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {entry.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(entry.created_at)}</p>
                    </div>

                    {/* Unread dot */}
                    {!entry.is_read && (
                      <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-4 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              Showing latest {displayed.length} entries · refreshes every 30s
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
