import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Service-role client — bypasses RLS so staff can insert
// payments on behalf of any user_id (or as a guest row).
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated staff or admin
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['admin', 'staff'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden — staff or admin only' }, { status: 403 })
  }

  const {
    user_id,
    guest_name,
    guest_email,
    guest_phone,
    product_type,
    product_ref,
    amount,
    notes,
    wake_id,
    senior_pwd_discount,
  } = await req.json()

  // Basic validation
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (!guest_phone && !user_id) {
    return NextResponse.json({ error: 'Phone number or user_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('payments').insert({
    user_id:             user_id             ?? null,
    guest_name:          guest_name          ?? null,
    guest_email:         guest_email         ?? null,
    guest_phone:         guest_phone         ?? null,
    product_type:        product_type        ?? 'general',
    product_ref:         product_ref         ?? null,
    method:              'cash',
    amount:              Number(amount),
    status:              'approved',
    notes:               notes               ?? null,
    wake_id:             wake_id             ?? null,
    senior_pwd_discount: senior_pwd_discount ?? false,
    approved_by:         user.id,
    approved_at:         new Date().toISOString(),
  }).select('id').single()

  if (error) {
    console.error('[record-cash-payment]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}
