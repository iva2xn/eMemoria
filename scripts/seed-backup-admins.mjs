/**
 * seed-backup-admins.mjs
 * Run once: node scripts/seed-backup-admins.mjs
 *
 * Uses the Supabase Admin API (service role) to create the 3 backup
 * admin accounts and then promotes them in the profiles table.
 */

const SUPABASE_URL        = 'https://nzszkxqofsedfcvpgywo.supabase.co'
const SERVICE_ROLE_KEY    = 'sb_secret_XrlueO9PuZpXcu7W7wWvUg_v8qKx8mQ'

const ADMINS = [
  { email: 'ememoria@admin.com',  password: 'ememoria@adminpassword1', name: 'eMemoria Admin 1', first: 'eMemoria', last: 'Admin 1' },
  { email: 'ememoria2@admin.com', password: 'ememoria@adminpassword2', name: 'eMemoria Admin 2', first: 'eMemoria', last: 'Admin 2' },
  { email: 'ememoria3@admin.com', password: 'ememoria@adminpassword3', name: 'eMemoria Admin 3', first: 'eMemoria', last: 'Admin 3' },
]

async function adminFetch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  return res.json()
}

async function deleteUser(id) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  return res.status
}

async function run() {
  console.log('── Fetching existing users ──')
  const existing = await listUsers()
  const existingUsers = existing.users ?? []

  for (const admin of ADMINS) {
    // Delete any existing broken version
    const old = existingUsers.find(u => u.email === admin.email)
    if (old) {
      console.log(`  Deleting old ${admin.email} (id: ${old.id})`)
      await deleteUser(old.id)
    }

    // Create fresh via Admin API — this is the only reliable method
    console.log(`  Creating ${admin.email}…`)
    const { status, data } = await adminFetch('users', {
      email:            admin.email,
      password:         admin.password,
      email_confirm:    true,
      user_metadata: {
        name:           admin.name,
        first_name:     admin.first,
        last_name:      admin.last,
      },
    })

    if (status === 200 || status === 201) {
      console.log(`  ✓ Created ${admin.email} (id: ${data.id})`)
    } else {
      console.error(`  ✗ Failed ${admin.email}: ${JSON.stringify(data)}`)
      process.exit(1)
    }
  }

  // Promote all 3 to admin in profiles table
  console.log('\n── Promoting profiles to admin ──')
  const emails = ADMINS.map(a => `'${a.email}'`).join(',')
  const sql = `
    INSERT INTO public.profiles (id, email, name, first_name, last_name, role)
    SELECT
      au.id,
      au.email,
      CASE au.email
        WHEN 'ememoria@admin.com'  THEN 'eMemoria Admin 1'
        WHEN 'ememoria2@admin.com' THEN 'eMemoria Admin 2'
        WHEN 'ememoria3@admin.com' THEN 'eMemoria Admin 3'
      END,
      'eMemoria',
      CASE au.email
        WHEN 'ememoria@admin.com'  THEN 'Admin 1'
        WHEN 'ememoria2@admin.com' THEN 'Admin 2'
        WHEN 'ememoria3@admin.com' THEN 'Admin 3'
      END,
      'admin'
    FROM auth.users au
    WHERE au.email IN (${emails})
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  `

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  // Use pg direct via REST SQL endpoint
  const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer':        'return=minimal',
    },
  })

  // Actually run it as raw SQL via the Management API
  const projectRef = SUPABASE_URL.split('.')[0].replace('https://', '')
  const rawSqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (rawSqlRes.ok) {
    console.log('  ✓ Profiles promoted to admin')
  } else {
    const body = await rawSqlRes.text()
    console.log(`  ⚠ SQL API returned ${rawSqlRes.status}. Run this manually in Supabase SQL Editor:`)
    console.log(sql)
  }

  console.log('\n✅ Done! Try logging in now.')
}

run().catch(console.error)
