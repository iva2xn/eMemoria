'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge, SectionHeader, EmptyState, Spinner } from './admin-primitives'
import { ChevronDown, ChevronUp, Mail } from 'lucide-react'
import type { Inquiry } from '@/lib/supabase/types'

export function InquiriesTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('inquiries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const markRead = async (id: string) => {
    await supabase.from('inquiries').update({ is_read: true }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  const unreadCount = rows.filter(r => !r.is_read).length

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader
        title="Inquiries"
        sub={`${rows.length} total · ${unreadCount} unread`}
      />

      {rows.length === 0 ? <EmptyState message="No inquiries submitted yet." /> : (
        <div className="space-y-2">
          {rows.map(inq => (
            <div key={inq.id}
              className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                !inq.is_read ? 'border-primary/30' : 'border-border'
              }`}
            >
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => {
                  setExpanded(expanded === inq.id ? null : inq.id)
                  if (!inq.is_read) markRead(inq.id)
                }}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{inq.name.charAt(0).toUpperCase()}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${!inq.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {inq.name}
                    </p>
                    {!inq.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{inq.subject}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge label={inq.is_read ? 'Read' : 'New'} variant={inq.is_read ? 'muted' : 'amber'} />
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </span>
                  {expanded === inq.id
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </button>

              {expanded === inq.id && (
                <div className="px-5 pb-5 pt-3 border-t border-border/40 bg-muted/10 space-y-3">
                  <a href={`mailto:${inq.email}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline underline-offset-2">
                    <Mail className="h-3 w-3" /> {inq.email}
                  </a>
                  <p className="text-sm text-foreground leading-relaxed">{inq.message}</p>
                  <Button asChild size="sm" className="h-8 px-4 text-xs rounded-xl gap-1.5">
                    <a href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject)}`}>
                      <Mail className="h-3 w-3" /> Reply via Email
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
