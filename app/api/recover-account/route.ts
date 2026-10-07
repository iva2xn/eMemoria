import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/recover-account
 *
 * Sends a Supabase magic-link invite to the given email so the user can
 * set a new password and regain access. Used by the admin "Recover Account"
 * flow after a user's auth.users row was hard-deleted.
 *
 * Body: { email: string; name: string; actorName: string; deletedAccountId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name, actorName, deletedAccountId } = await req.json()

    if (!email || !deletedAccountId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 1. Invite the user — creates a fresh auth.users row and sends a
    //       magic-link email they can use to set their password. ──────────
    const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      data: { name: name ?? email },
    })

    // "User already exists" is fine — means they already re-registered;
    // we still mark as restored in the DB.
    const alreadyExists =
      inviteError?.message?.toLowerCase().includes('already') ||
      inviteError?.message?.toLowerCase().includes('exists') ||
      inviteError?.status === 422

    if (inviteError && !alreadyExists) {
      console.error('[recover-account] inviteUserByEmail:', inviteError)
      return NextResponse.json(
        { error: inviteError.message ?? 'Failed to send recovery invitation.' },
        { status: 500 }
      )
    }

    // ── 2. Mark the deleted_accounts row as restored ─────────────────────
    const { error: dbError } = await db
      .from('deleted_accounts')
      .update({
        restored_at:      new Date().toISOString(),
        restored_by_name: actorName ?? 'Admin',
      })
      .eq('id', deletedAccountId)

    if (dbError) {
      console.error('[recover-account] mark restored:', dbError)
      // Non-fatal — the invite already went out
    }

    return NextResponse.json({
      ok: true,
      alreadyExists: alreadyExists ?? false,
    })
  } catch (err: unknown) {
    console.error('[recover-account]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}
