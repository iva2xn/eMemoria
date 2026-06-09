import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback route handler.
 *
 * Supabase sends a one-time `?code=...` (PKCE) param in the reset-password
 * email. Email clients / security scanners will silently "prefetch" that URL,
 * consuming the token before the user ever sees the page.
 *
 * By routing the link here first, the code exchange happens server-side the
 * instant the link is clicked, the resulting session is stored in an HttpOnly
 * cookie, and the user is forwarded to their intended destination already
 * authenticated — prefetch-proof.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // `next` defaults to the reset-password page; can be overridden by the caller
  const next = searchParams.get('next') ?? '/auth/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to the target page — session cookie is now set
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Something went wrong — send the user back to login with a hint
  return NextResponse.redirect(
    new URL('/auth/login?error=invalid_reset_link', origin)
  )
}
