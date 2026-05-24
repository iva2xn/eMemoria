# Route Protection

Which pages are protected, who can access them, and exactly how the protection works.

---

## Quick reference

| Route | Who can access | Protection method |
|---|---|---|
| `/` | Everyone | None |
| `/about` | Everyone | None |
| `/services` | Everyone | None |
| `/services/traditional` | Everyone | None |
| `/services/cremation` | Everyone | None |
| `/columbarium` | Everyone | None |
| `/contact` | Everyone | None |
| `/obituaries` | Everyone | None |
| `/privacy` | Everyone | None |
| `/terms` | Everyone | None |
| `/auth/login` | Everyone | None |
| `/auth/register` | Everyone | None |
| `/billing` | **Logged-in users only** | AuthGateModal (soft gate) |
| `/admin` | **Staff and admins only** | Hard redirect to `/` |

---

## How `/billing` is protected

The billing page uses a **soft gate** — the page loads, but a modal blocks the form until the user logs in.

```
BillingForm mounts
      ↓
useEffect runs:
  supabase.auth.getUser()
      ↓
authReady = null   → nothing shown yet (loading)
authReady = false  → <AuthGateModal> renders over the form
authReady = true   → form is usable, name/email pre-filled
```

The `AuthGateModal` shows two buttons:
- **Sign In** → `/auth/login?next=/billing?product=...`
- **Create Account** → `/auth/register?next=/billing?product=...`

The `?next=` param captures the full current URL so after login the user lands back exactly where they were, with all the product params intact.

Why a modal instead of a redirect?
- Better UX — the user can see what they're about to pay for
- The URL params are preserved through the login flow

---

## How `/admin` is protected

The admin page uses a **hard redirect** — if you're not staff or admin, you get sent away immediately.

```
AdminPage mounts
      ↓
useEffect runs:
  supabase.auth.getUser()
      ↓
No user?
  → setProfile(null)

User found?
  → READ profiles WHERE id = user.id
  → setProfile(data)
      ↓
Second useEffect watches profile:
  profile = undefined  → still loading (spinner shown)
  profile = null       → not logged in → router.push('/')
  profile.role = 'client' → router.push('/')
  profile.role = 'staff'  → dashboard shown (limited actions)
  profile.role = 'admin'  → dashboard shown (full access)
```

While loading, a spinner is shown. If access is denied, an "Access Restricted" screen appears briefly before the redirect fires.

---

## How middleware fits in

`middleware.ts` runs on **every request** before any page loads.

```typescript
// What middleware does:
1. Creates a Supabase server client from the request cookies
2. Calls supabase.auth.getUser() to validate the session
3. Refreshes the session token if it's about to expire
4. Writes the updated session back to response cookies
5. Passes the request through to the page
```

Middleware does **not** redirect anyone — it only manages the session cookie. The actual access checks happen inside each page component.

---

## Role-based access inside `/admin`

Even after getting into the admin panel, some actions are role-restricted:

| Action | staff | admin |
|---|---|---|
| View all tabs | ✅ | ✅ |
| Approve / reject payments | ❌ | ✅ |
| Edit GCash / bank details | ❌ | ✅ |
| Change user roles | ❌ | ✅ |
| Record cash payments | ✅ | ✅ |
| Publish / unpublish obituaries | ✅ | ✅ |
| Update columbarium slot status | ✅ | ✅ |
| Mark inquiries as read | ✅ | ✅ |
| Update booking status | ✅ | ✅ |

These restrictions are enforced in two places:
1. **UI** — approve/reject buttons only render if `currentRole === 'admin'`
2. **Database** — RLS policies block the actual SQL if the role is wrong

---

## Database-level protection (RLS)

Even if someone bypassed the UI entirely and sent raw SQL queries, the database would still enforce access rules.

```
Example: a staff member tries to approve a payment directly

UPDATE payments SET status = 'approved' WHERE id = '...'

RLS policy: "Admins can update payment status"
  USING (public.is_admin())
  → is_admin() checks profiles WHERE id = auth.uid() AND role = 'admin'
  → staff user has role = 'staff' → returns false
  → PostgreSQL blocks the query
  → Error returned to the client
```

This means the database is the final line of defense, regardless of what the frontend does.
