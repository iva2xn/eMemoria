'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import {
  Bell, Check, CheckCheck, FileText, CreditCard,
  AlertCircle, Clock, ArrowRight, CheckCircle2,
} from 'lucide-react'
import type { ClientNotification } from '@/lib/supabase/types'
import { usePersistTab } from '@/lib/hooks/use-persist-tab'

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function NotifIcon({ eventType }: { eventType: string }) {
  const cls = 'h-4 w-4'
  if (eventType === 'payment_approved')       return <Check        className={cls} />
  if (eventType === 'payment_rejected')       return <AlertCircle  className={cls} />
  if (eventType === 'payment_voided')         return <AlertCircle  className={cls} />
  if (eventType === 'payment_pending')        return <Clock        className={cls} />
  if (eventType === 'doc_approved')           return <CheckCheck   className={cls} />
  if (eventType === 'doc_rejected')           return <FileText     className={cls} />
  if (eventType === 'doc_pending')            return <FileText     className={cls} />
  if (eventType === 'wake_request_approved')  return <Check        className={cls} />
  if (eventType === 'wake_request_rejected')  return <AlertCircle  className={cls} />
  return <CreditCard className={cls} />
}

function iconBg(eventType: string): string {
  if (eventType === 'payment_approved' || eventType === 'doc_approved' || eventType === 'wake_request_approved')  return 'bg-primary text-primary-foreground'
  if (eventType === 'payment_rejected' || eventType === 'doc_rejected' || eventType === 'wake_request_rejected')  return 'bg-red-500 text-white'
  if (eventType === 'payment_voided')                                     return 'bg-red-400 text-white'
  if (eventType === 'payment_pending'  || eventType === 'doc_pending')   return 'bg-amber-500 text-white'
  return 'bg-muted text-muted-foreground'
}

function typeLabel(eventType: string): string {
  const map: Record<string, string> = {
    payment_approved:      'Payment Approved',
    payment_rejected:      'Payment Not Approved',
    payment_voided:        'Payment Voided',
    payment_pending:       'Payment Received',
    doc_approved:          'Documents Approved',
    doc_rejected:          'Documents Not Approved',
    doc_pending:           'Documents Received',
    wake_request_approved: 'Wake Request Approved',
    wake_request_rejected: 'Wake Request Not Approved',
  }
  return map[eventType] ?? 'Update'
}

type FilterTab = 'all' | 'unread' | 'payments' | 'documents'

// ── Notification card ─────────────────────────────────────────
function NotifCard({
  notif,
  onRead,
}: {
  notif: ClientNotification
  onRead: (id: string) => void
}) {
  const router = useRouter()

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id)
    if (notif.action_url) router.push(notif.action_url)
  }

  return (
    <div
      onClick={notif.action_url ? handleClick : undefined}
      className={`relative group flex gap-4 p-5 rounded-2xl border transition-all ${
        notif.action_url ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        notif.is_read
          ? 'bg-card border-border/60'
          : 'bg-primary/[0.03] border-primary/20'
      }`}
    >
      {/* Unread indicator bar */}
      {!notif.is_read && (
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary" />
      )}

      {/* Icon */}
      <div className={`shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center ${iconBg(notif.event_type)}`}>
        <NotifIcon eventType={notif.event_type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
            notif.is_read ? 'text-muted-foreground' : 'text-primary'
          }`}>
            {typeLabel(notif.event_type)}
          </p>
          <span className="text-[10px] text-muted-foreground/70 shrink-0">
            {timeAgo(notif.created_at)}
          </span>
        </div>
        <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
          {notif.message}
        </p>
        {notif.action_url && (
          <p className="text-[11px] text-primary font-semibold mt-1.5 flex items-center gap-1 group-hover:underline">
            View details <ArrowRight className="h-3 w-3" />
          </p>
        )}
      </div>

      {/* Unread dot */}
      {!notif.is_read && (
        <div className="shrink-0 mt-1 h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function NotificationsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [userId,  setUserId]  = useState<string | null>(null)
  const [items,   setItems]   = useState<ClientNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = usePersistTab<FilterTab>('notifications-filter', 'all')

  // ── Auth check ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/login?next=/notifications'); return }
      setUserId(user.id)
    })
  }, [supabase, router])

  // ── Load notifications ───────────────────────────────────────
  const load = useCallback(async (uid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('client_notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(100)
    setItems((data as ClientNotification[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!userId) return
    load(userId)

    // Real-time: new notifications arrive without refresh
    const channel = supabase
      .channel(`notif-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'client_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems(prev => [payload.new as ClientNotification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, load, supabase])

  // ── Mark read ────────────────────────────────────────────────
  const markOneRead = async (id: string) => {
    await supabase
      .from('client_notifications')
      .update({ is_read: true })
      .eq('id', id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    const unread = items.filter(n => !n.is_read).map(n => n.id)
    if (!unread.length) return
    await supabase
      .from('client_notifications')
      .update({ is_read: true })
      .in('id', unread)
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  // ── Filtering ────────────────────────────────────────────────
  const displayed = items.filter(n => {
    if (filter === 'unread')    return !n.is_read
    if (filter === 'payments')  return n.event_type.startsWith('payment')
    if (filter === 'documents') return n.event_type.startsWith('doc')
    return true
  })

  const unreadCount = items.filter(n => !n.is_read).length

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',       label: `All (${items.length})` },
    { id: 'unread',    label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'payments',  label: 'Payments' },
    { id: 'documents', label: 'Documents' },
  ]

  // ── Loading / auth pending ────────────────────────────────────
  if (!userId || loading) {
    return (
      <ClientLayout>
  
        <main className="flex-1 flex items-center justify-center py-32">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>

      <main className="flex-1 bg-background">

        {/* Hero strip */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Your Account
                </p>
                <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
                  <Bell className="h-7 w-7 text-primary" />
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    You have <span className="font-bold text-primary">{unreadCount} unread</span> notification{unreadCount !== 1 ? 's' : ''}.
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex items-center gap-1.5"
                  onClick={markAllRead}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === t.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          {displayed.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center mx-auto border border-border/60">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                {filter === 'unread'
                  ? 'No unread notifications at this time.'
                  : 'Payment confirmations, document approvals, and other updates will appear here.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map(notif => (
                <NotifCard
                  key={notif.id}
                  notif={notif}
                  onRead={markOneRead}
                />
              ))}
            </div>
          )}

          {/* Back link */}
          <div className="pt-4 text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </main>
    </ClientLayout>
  )
}
