# Demo Credentials

Test accounts for demonstrating the system during presentations.

> **Important:** Change these passwords before deploying to production. These are for demo/grading purposes only.

---

## How to create demo accounts

Demo accounts are not seeded automatically. You need to create them manually:

### Step 1 — Register the accounts

Go to `/auth/register` and create these three accounts:

| Role | Name | Email | Password |
|---|---|---|---|
| Admin | Admin User | admin@gayeta.demo | Demo@1234 |
| Staff | Staff User | staff@gayeta.demo | Demo@1234 |
| Client | Client User | client@gayeta.demo | Demo@1234 |

### Step 2 — Verify the emails

Each account will receive a verification email. Click the link in each one to activate the accounts.

> If you're using a local Supabase instance, you can skip email verification by going to: **Supabase Dashboard → Authentication → Users** and manually confirming each user.

### Step 3 — Promote admin and staff

After the accounts are created (they start as `client`), promote them:

1. Log in as the admin account
2. Go to `/admin` → Profiles tab
3. Find `staff@gayeta.demo` → change role to `staff`
4. Find `admin@gayeta.demo` → change role to `admin`

> You'll need to do this from the **Supabase Dashboard → SQL Editor** for the very first admin, since no admin exists yet to use the UI:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@gayeta.demo';
```

---

## What each account can demonstrate

### Admin (`admin@gayeta.demo`)
- Full access to all 7 admin tabs
- Can approve and reject payments
- Can edit GCash / bank details (PaymentInfoCard)
- Can change user roles in the Profiles tab
- Can generate and export the Sales Report (CSV + PDF)
- Can create, edit, publish, and unpublish obituaries

### Staff (`staff@gayeta.demo`)
- Access to all 7 admin tabs (view only for some)
- Can mark inquiries as read and reply
- Can update booking statuses (Finished / Cancel / Complete)
- Can record cash payments
- Can update columbarium slot statuses
- Can publish / unpublish obituaries
- **Cannot** approve/reject payments, edit payment info, or change roles

### Client (`client@gayeta.demo`)
- Can log in and use the billing page
- Name and email pre-filled from profile
- Can submit payments for any service
- Can view their own bookings and payments
- **Cannot** access `/admin` (redirected to home)

---

## Demo flow suggestion (for presentations)

```
1. Open /columbarium as a guest
   → Show the slot grid, click a slot, show the modal

2. Click "Reserve" → lands on /billing
   → AuthGateModal appears (not logged in)
   → Click Sign In → log in as client@gayeta.demo
   → Redirected back to /billing with params intact
   → Fill the form, submit a payment

3. Log out, log in as admin@gayeta.demo
   → Go to /admin → Overview tab
   → Show the pending payment in the list
   → Approve it

4. Go to Payments tab → show search and filter
5. Go to Sales Report → generate, export CSV

6. Go to Obituaries tab → Create Tarp
   → Show live preview updating as you type

7. Go to Profiles tab → show role management
```
