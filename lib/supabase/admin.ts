import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Supabase Admin client (service role).
 * SERVER-SIDE ONLY — never import this in client components.
 * Used for operations that bypass RLS (e.g. auto-confirming emails).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
