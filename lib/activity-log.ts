import { createClient } from '@/lib/supabase/client'

export type LogCategory = 'notification' | 'log'

export interface LogEntry {
  id: string
  category: LogCategory
  event_type: string
  entity_table: string
  entity_id: string | null
  actor_id: string | null
  actor_name: string | null
  message: string
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

/**
 * Write a log entry from admin panel client-side actions.
 * Used for staff/admin-triggered events (approvals, rejections, status changes).
 * Customer-triggered notifications are written by DB triggers automatically.
 */
export async function logActivity(params: {
  category: LogCategory
  event_type: string
  entity_table: string
  entity_id?: string
  actor_id?: string | null
  actor_name?: string | null
  message: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createClient()
  await supabase.from('activity_log').insert({
    category:     params.category,
    event_type:   params.event_type,
    entity_table: params.entity_table,
    entity_id:    params.entity_id ?? null,
    actor_id:     params.actor_id ?? null,
    actor_name:   params.actor_name ?? null,
    message:      params.message,
    metadata:     params.metadata ?? null,
    is_read:      false,
  })
}
