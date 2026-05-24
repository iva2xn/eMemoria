'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge, SectionHeader, EmptyState, Spinner } from './admin-primitives'
import { ChevronDown, ChevronUp } from 'lucide-react'
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

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="Inquiries" sub={`${rows.length} total · ${rows.filter(r => !r.is_read).length} unread`} />
      {rows.length === 0 ? <EmptyState message="No inquiries submitted yet." /> : (
        <div className="space-y-2">
          {rows.map(inq => (
            <div key={inq.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => { setExpanded(expanded === inq.id ? null : inq.id); if (!inq.is_read) markRead(inq.id) }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${inq.is_read ? 'bg-border' : 'bg-primary'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{inq.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{inq.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <Badge label={inq.is_read ? 'read' : 'unread'} variant={inq.is_read ? 'muted' : 'amber'} />
                  <span className="text-[9px] font-mono text-muted-foreground hidden sm:block">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </span>
                  {expanded === inq.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </button>
              {expanded === inq.id && (
                <div className="px-5 pb-5 border-t border-border/40 pt-4 space-y-3">
                  <a href={`mailto:${inq.email}`} className="text-[10px] font-mono text-primary hover:underline">{inq.email}</a>
                  <p className="text-sm text-foreground leading-relaxed">{inq.message}</p>
                  <Button asChild size="sm" className="h-8 px-4 text-xs rounded-lg mt-1">
                    <a href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject)}`}>Reply via Email</a>
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
