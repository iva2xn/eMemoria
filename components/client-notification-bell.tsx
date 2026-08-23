'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Bell, CreditCard, FileText, Check, CheckCheck,
  X, AlertCircle, Clock,
} from 'lucide-react'
import type { ClientNotification } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotifIcon({ eventType, className }: { eventType: string; className?: string }) {
  const cls = className ?? 'h-3.5 w-3.5'
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

function dotColor(eventType: string): string {
  if (eventType === 'payment_approved' || eventType === 'doc_approved' || eventType === 'wake_request_approved')  return 'bg-primary'
  if (eventType === 'payment_rejected' || eventType === 'doc_rejected' || eventType === 'wake_request_rejected')  return 'bg-destructive'
  if (eventType === 'payment_voided')                                     return 'bg-destructive/60'
  if (eventType === 'payment_pending'  || eventType === 'doc_pending')   return 'bg-muted-foreground'
  return 'bg-muted-foreground'
}

// ── Component ─────────────────────────────────────────────────
export function ClientNotificationBell({ userId }: { userId: string }) {
  const supabase  = createClient()
  const router    = useRouter()
  const panelRef  = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [open,        setOpen]        = useState(false)
  const [items,       setItems]       = useState<ClientNotification[]>([])
  const [loading,     setLoading]     = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // ── Fetch unread count ───────────────────────────────────────
  const fetchCount = useCallback(async () => {
    const { count } = await supabase
      .from('client_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }, [supabase, userId])

  // ── Fetch all notifications ──────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('client_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    const loaded = (data as ClientNotification[]) ?? []
    setItems(loaded)
    setUnreadCount(loaded.filter(n => !n.is_read).length)
    setLoading(false)
  }, [supabase, userId])

  // Mount: fetch count + subscribe to real-time inserts
  useEffect(() => {
    fetchCount()

    const channel = supabase
      .channel(`client-notif-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'client_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as ClientNotification
          setItems(prev => [newNotif, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, fetchCount])

  // Load full list when panel opens
  useEffect(() => {
    if (open) load()
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

  // ── Actions ──────────────────────────────────────────────────
  const markOneRead = async (id: string) => {
    await supabase
      .from('client_notifications')
      .update({ is_read: true })
      .eq('id', id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    const unread = items.filter(n => !n.is_read).map(n => n.id)
    if (!unread.length) return
    await supabase
      .from('client_notifications')
      .update({ is_read: true })
      .in('id', unread)
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleClick = async (notif: ClientNotification) => {
    if (!notif.is_read) await markOneRead(notif.id)
    setOpen(false)
    if (notif.action_url) router.push(notif.action_url)
  }

  const handleViewAll = () => {
    setOpen(false)
    router.push('/notifications')
  }

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
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none pointer-events-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed to top-right so it always appears in the right place
          regardless of where the bell button lives (sidebar, header, etc.) */}
      {open && (
        <div
          ref={panelRef}
          className="fixed top-4 right-4 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
                <p className="text-[10px] text-muted-foreground/60">
                  You&apos;ll be notified about payment and document updates.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {items.map(notif => (
                  <li
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                      !notif.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Icon dot */}
                    <div className={`shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-white ${dotColor(notif.event_type)}`}>
                      <NotifIcon eventType={notif.event_type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!notif.is_read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {timeAgo(notif.created_at)}
                        {notif.action_url && (
                          <span className="ml-1.5 text-primary font-semibold">View →</span>
                        )}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-4 py-3">
            <button
              onClick={handleViewAll}
              className="w-full text-center text-xs font-semibold text-primary hover:underline"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
