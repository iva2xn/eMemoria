# API / Query Map

Every Supabase query in the app — what it reads or writes, and where it lives.

> There is no custom REST API. All data access goes through the Supabase JavaScript client, which talks directly to PostgreSQL via PostgREST.

---

## profiles

| Operation | Query | Where |
|---|---|---|
| Read own profile | `.from('profiles').select('*').eq('id', user.id).single()` | Admin page (auth check), Billing page (pre-fill) |
| Read all profiles | `.from('profiles').select('*').order('created_at', desc)` | Admin → Profiles tab |
| Read profiles by IDs | `.from('profiles').select('id,name,email').in('id', userIds)` | Admin → Bookings tab, Payments tab |
| Read by email | `.from('profiles').select('id').eq('email', email).maybeSingle()` | Admin → Cash modal |
| Update role | `.from('profiles').update({ role }).eq('id', userId)` | Admin → Profiles tab |

---

## columbarium_slots

| Operation | Query | Where |
|---|---|---|
| Read all slots | `.from('columbarium_slots').select('*').order('row_number').order('col_number')` | Columbarium page, Admin → Columbarium tab |
| Update status | `.from('columbarium_slots').update({ status }).eq('id', id)` | Admin → Columbarium tab |

---

## inquiries

| Operation | Query | Where |
|---|---|---|
| Insert inquiry | `.from('inquiries').insert({ name, email, subject, message })` | Contact page |
| Read all | `.from('inquiries').select('*').order('created_at', desc)` | Admin → Inquiries tab |
| Mark as read | `.from('inquiries').update({ is_read: true }).eq('id', id)` | Admin → Inquiries tab |

---

## bookings

| Operation | Query | Where |
|---|---|---|
| Insert booking | `.from('bookings').insert({ user_id/guest_*, package_name, price, status: 'pending' })` | Billing page (auto after payment) |
| Read all | `.from('bookings').select('*').order('created_at', desc)` | Admin → Bookings tab |
| Read recent 4 | `.from('bookings').select('...').order('created_at', desc).limit(4)` | Admin → Overview tab |
| Count total | `.from('bookings').select('*', { count: 'exact', head: true })` | Admin → Overview tab |
| Update status | `.from('bookings').update({ status }).eq('id', id)` | Admin → Bookings tab |

---

## payments

| Operation | Query | Where |
|---|---|---|
| Insert payment | `.from('payments').insert({ ...payload, status: 'pending' })` | Billing page |
| Insert cash payment | `.from('payments').insert({ ...payload, status: 'approved', method: 'cash' })` | Admin → Cash modal |
| Read all | `.from('payments').select('*').order('created_at', desc)` | Admin → Payments tab |
| Read pending | `.from('payments').select('...').eq('status', 'pending').limit(5)` | Admin → Overview tab |
| Read approved amounts | `.from('payments').select('amount').eq('status', 'approved')` | Admin → Overview tab (revenue sum) |
| Count pending | `.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending')` | Admin → Overview tab |
| Read filtered (report) | `.from('payments').select('...').gte('created_at', from).lte('created_at', to)` + filters | Admin → Sales Report modal |
| Approve | `.from('payments').update({ status: 'approved', approved_at: now() }).eq('id', id)` | Admin → Payments tab, Overview tab |
| Reject | `.from('payments').update({ status: 'rejected' }).eq('id', id)` | Admin → Payments tab |

---

## obituaries

| Operation | Query | Where |
|---|---|---|
| Insert obituary | `.from('obituaries').insert({ full_name, ..., is_published: false })` | Obituaries page, Billing page, Traditional page |
| Insert (admin) | `.from('obituaries').insert({ ..., is_published: true/false })` | Admin → Create Tarp modal |
| Read published | `.from('obituaries').select('*').eq('is_published', true).order('created_at', desc)` | Obituaries page |
| Read all | `.from('obituaries').select('*').order('created_at', desc)` | Admin → Obituaries tab |
| Update fields | `.from('obituaries').update({ full_name, birth_date, ... }).eq('id', id)` | Admin → Obituaries tab (edit) |
| Publish/unpublish | `.from('obituaries').update({ is_published: !current }).eq('id', id)` | Admin → Obituaries tab |

---

## payment_info

| Operation | Query | Where |
|---|---|---|
| Read | `.from('payment_info').select('*').eq('id', 1).single()` | Billing page sidebar, Admin → PaymentInfoCard |
| Update | `.from('payment_info').update({ ...draft }).eq('id', 1)` | Admin → PaymentInfoCard (edit mode) |

---

## Storage operations

| Operation | Call | Where |
|---|---|---|
| Upload obituary photo | `supabase.storage.from('obituaries').upload(path, file)` | Obituaries modal, Billing modal, Admin tarp modal |
| Get obituary photo URL | `supabase.storage.from('obituaries').getPublicUrl(path)` | Obituaries page, Admin obituaries tab |
| Upload receipt | `supabase.storage.from('payments').upload(path, file)` | Billing page |
| Upload GCash QR | `supabase.storage.from('payment-info').upload(path, file, { upsert: true })` | Admin → PaymentInfoCard |
| Get GCash QR URL | `supabase.storage.from('payment-info').getPublicUrl(path)` | Billing sidebar, Admin PaymentInfoCard |

---

## Auth operations

| Operation | Call | Where |
|---|---|---|
| Sign up | `supabase.auth.signUp({ email, password, options: { data: { name } } })` | Register page |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` | Login page |
| Get current user | `supabase.auth.getUser()` | Admin page, Billing page, Login form |
| Send password reset | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` | Login page (recovery form) |
