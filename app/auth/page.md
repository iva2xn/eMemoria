# Auth Pages (`/auth/login` and `/auth/register`)

---

## Login Page (`/auth/login`)

### What it does
Lets existing users sign in. Also has a password recovery flow.

### Sign In flow
```
User fills email + password → clicks Sign In
      ↓
supabase.auth.signInWithPassword({ email, password })
      ↓
Error?  → show error banner ("Invalid email or password.")
Success → window.location.href = nextUrl
          (hard redirect so middleware writes the session cookie)
          nextUrl comes from ?next= param, defaults to '/'
```

### Password Recovery flow
```
User clicks "Forgot password?"
      ↓
Recovery form appears
User enters email → clicks Send Reset Link
      ↓
supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })
      ↓
Error?   → show error banner
Success  → show success banner ("Password reset email sent.")
```

### ?next= param
When billing or another protected page redirects to login, it appends `?next=/billing?product=...`
After login, the user is sent back to exactly where they were.

---

## Register Page (`/auth/register`)

### What it does
Creates a new account. Requires email verification before the user can sign in.

### Register flow
```
User fills name, email, password, confirm password
      ↓
Client-side validation:
  - All fields filled?
  - Passwords match?
  - Password >= 6 chars?
      ↓
supabase.auth.signUp({ email, password, options: { data: { name } } })
      ↓
Error?   → show error banner
Success  → show EmailVerifyModal
           (tells user to check their inbox before signing in)
```

### Email verification
Supabase sends a confirmation email automatically.
The user must click the link before they can log in.
The modal just informs them — it has a "Go to Sign In" button.

### Supabase trigger (background)
When `auth.signUp` succeeds, a Supabase database trigger automatically:
```
INSERT INTO profiles (id, name, email, role)
VALUES (auth.uid(), name, email, 'client')
```
So the profile row is created without any extra code in the page.
