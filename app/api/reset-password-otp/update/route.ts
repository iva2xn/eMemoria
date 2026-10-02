import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

function verifyToken(email: string, token: string): boolean {
  try {
    const secret  = process.env.OTP_SIGN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret'
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const lastPipe = decoded.lastIndexOf('|')
    if (lastPipe === -1) return false
    const payload  = decoded.slice(0, lastPipe)
    const sig      = decoded.slice(lastPipe + 1)
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    if (sig.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    if (diff !== 0) return false
    // payload format: reset:<email>:<expiresAt>
    const parts = payload.split(':')
    if (parts[0] !== 'reset') return false
    const expiresAt = Number(parts[parts.length - 1])
    if (Date.now() > expiresAt) return false
    // reconstruct email (may contain colons in edge cases)
    const tokenEmail = parts.slice(1, -1).join(':')
    return tokenEmail === email.toLowerCase().trim()
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const { email, password, verifiedToken } = await req.json()

  if (!email || !password || !verifiedToken) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  if (!verifyToken(email, verifiedToken)) {
    return NextResponse.json({ error: 'Verification expired or invalid. Please start over.' }, { status: 403 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Look up user by email
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    return NextResponse.json({ error: 'Failed to look up user.' }, { status: 500 })
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
  if (!user) {
    return NextResponse.json({ error: 'No account found for this email.' }, { status: 404 })
  }

  const { error: updateErr } = await db.auth.admin.updateUserById(user.id, { password })
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
