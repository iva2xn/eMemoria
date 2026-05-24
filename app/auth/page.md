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
Error?  → show error banner ("Invalid email or password.") flexible to depende sa error messagee
Success → window.location.href = nextUrl
          (hard refresh/redirect para maupdate ni middleware yung session cookie)
```

### Password Recovery flow
```
User clicks "Forgot password?"
      ↓
Recovery form popss
User enters email → clicks Send Reset Link
      ↓
supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })
      ↓
Error?   → show error banner
Success  → show success banner ("Password reset email sent.")
```

---

## Register Page (`/auth/register`)

### What it does
Creates a new account. Requires email verification before the user can sign in.

### Register flow
```
User fills form with: name, email, password, confirm password
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
           (may popup to na nagnonotify sa users para iverify muna email)
```

### Email verification
Matik may email verification na iseseend si supabase sa email.
If hindi verified email hindi makakapag log in si user (click link lang naman verification).

### Supabase trigger (background)
if sumaksess yung `auth.signUp` , may backend trigger tayo na nag iinitialize ng user profile sa auth and profile page.
```
INSERT INTO profiles (id, name, email, role)
VALUES (auth.uid(), name, email, 'client')
```