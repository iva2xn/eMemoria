# Auth Flow

How authentication works from sign-up all the way to protected pages.

---

## Overview

The app uses **Supabase Auth** for all authentication. Supabase handles passwords, sessions, email verification, and password resets. We just call their SDK.

Sessions are stored in **cookies** (not localStorage) so the Next.js middleware can read them on the server side.

---

## Registration flow

```
/auth/register
      ↓
User fills: name, email, password, confirm password
      ↓
Client-side checks (before any network call):
  ✗ Any field empty?       → "Please fill in all fields."
  ✗ Passwords don't match? → "Passwords do not match."
  ✗ Password < 6 chars?    → "Password must be at least 6 characters."
      ↓
supabase.auth.signUp({
  email,
  password,
  options: { data: { name } }   ← name stored in user metadata
})
      ↓
Error from Supabase?
  → Show error banner (e.g. "Email already registered")

Success?
  → Supabase sends a verification email automatically
  → DB trigger fires: INSERT INTO profiles (id, name, email, role='client')
  → EmailVerifyModal shown — user must click the email link before logging in
      ↓
User clicks link in email
  → Account activated in Supabase
  → User goes to /auth/login
```

---

## Login flow

```
/auth/login
      ↓
User fills: email, password
      ↓
supabase.auth.signInWithPassword({ email, password })
      ↓
Error?
  → "Invalid email or password." (we don't say which is wrong — security)

Success?
  → Supabase sets a session cookie
  → window.location.href = nextUrl
    (hard redirect — NOT router.push)

Why hard redirect?
  router.push() is client-side navigation.
  The session cookie needs to be written by the server.
  A hard redirect forces a full page load so middleware.ts
  can read and refresh the session properly.

nextUrl:
  Comes from ?next= query param.
  Example: /auth/login?next=/billing?product=columbarium
  After login, user lands back on the billing page they came from.
  Defaults to '/' if no ?next= param.
```

---

## Password recovery flow

```
/auth/login → "Forgot password?" link
      ↓
Recovery form appears (same page, toggled by state)
      ↓
User enters email → clicks Send Reset Link
      ↓
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://yoursite.com/auth/reset-password'
})
      ↓
Supabase sends a password reset email
      ↓
User clicks link → lands on /auth/reset-password
  (this page is not yet built — Supabase handles the token validation)
```

---

## Session management (middleware)

```
Every single request to the app goes through middleware.ts first.

middleware.ts:
  1. Creates a Supabase server client using the request cookies
  2. Calls supabase.auth.getUser() to validate + refresh the session
  3. Writes the refreshed session back to the response cookies
  4. Passes the request through to the actual page

This means:
  - Sessions auto-refresh before they expire (no surprise logouts)
  - Every page can trust that cookies are up to date
  - No manual token management needed anywhere
```

---

## How pages check auth

```
Client component (most pages):

const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  // Option A: redirect
  router.push('/auth/login')

  // Option B: show a gate modal (billing page)
  setAuthReady(false)  → <AuthGateModal> renders
}
```

---

## Auth states in the app

| State | What happens |
|---|---|
| Not logged in, public page | Page loads normally |
| Not logged in, /billing | AuthGateModal blocks the form |
| Not logged in, /admin | Redirect to / |
| Logged in as client, /admin | Redirect to / |
| Logged in as staff, /admin | Full dashboard (limited actions) |
| Logged in as admin, /admin | Full dashboard (all actions) |

---

## JWT and RLS

When a user is logged in, Supabase includes their `user_id` and `role` in a JWT (JSON Web Token) that travels with every request.

PostgreSQL's Row Level Security policies use `auth.uid()` to get the current user's ID from that JWT. This is how the database knows who is allowed to read or write each row — without any extra code in the app.

```
Example RLS policy:
"Users can view their own payments"
  → USING (auth.uid() = user_id)

This means even if someone tried to query all payments directly,
the database would only return rows where user_id matches their JWT.
```
