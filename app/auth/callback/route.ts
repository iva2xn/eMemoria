import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback route handler.
 *
 * Handles two flows:
 *
 * 1. token_hash flow (preferred for reset-password emails)
 *    The email link points here with ?token_hash=...&type=recovery
 *    We call verifyOtp() server-side to exchange it for a session.
 *    Because the link is NOT a direct supabase.co/auth/v1/verify URL,
 *    Gmail and other email scanners cannot silently consume the token
 *    by prefetching — they only fetch plain URLs, not interpret app logic.
 *
 * 2. PKCE code flow (OAuth, magic links, etc.)
 *    The link arrives with ?code=... and we call exchangeCodeForSession().
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next       = searchParams.get('next') ?? '/auth/reset-password'
  const tokenHash  = searchParams.get('token_hash')
  const type       = searchParams.get('type') as 'recovery' | 'signup' | 'magiclink' | 'email' | null
  const code       = searchParams.get('code')

  const supabase = await createClient()

  // Flow 1: token_hash (reset-password emails)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Flow 2: PKCE code (OAuth / magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Both flows failed — redirect to login with error hint
  return NextResponse.redirect(
    new URL('/auth/login?error=invalid_reset_link', origin)
  )
}
