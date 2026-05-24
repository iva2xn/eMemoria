# System Architecture Diagram

This shows how all the pieces of the app fit together — from the browser all the way to the database.

---

## High-level overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                             │
│                                                                     │
│   Next.js App (React)                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │  Public Pages│  │  Auth Pages  │  │      Admin Panel         │ │
│   │  / about     │  │  /auth/login │  │      /admin              │ │
│   │  /services   │  │  /auth/reg.. │  │  (staff + admin only)    │ │
│   │  /columbarium│  └──────────────┘  └──────────────────────────┘ │
│   │  /contact    │                                                  │
│   │  /obituaries │  ┌──────────────────────────────────────────┐   │
│   │  /billing    │  │           Shared Components               │   │
│   └──────────────┘  │  Header, Footer, TarpPreview, Cards, etc. │   │
│                     └──────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │  HTTPS  (Supabase JS client)
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                         SUPABASE (Backend)                          │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │   Auth Service  │  │   PostgreSQL DB   │  │  Storage Buckets  │  │
│  │                 │  │                  │  │                   │  │
│  │  - Sign up      │  │  - profiles      │  │  - obituaries/    │  │
│  │  - Sign in      │  │  - bookings      │  │  - payments/      │  │
│  │  - Sessions     │  │  - payments      │  │  - payment-info/  │  │
│  │  - Email verify │  │  - inquiries     │  │                   │  │
│  │  - Password     │  │  - obituaries    │  │  Files stored and │  │
│  │    reset        │  │  - columbarium   │  │  served from here │  │
│  │                 │  │    _slots        │  │                   │  │
│  │  JWT tokens     │  │  - payment_info  │  │                   │  │
│  │  stored in      │  │                 │  │                   │  │
│  │  cookies by     │  │  Row Level       │  │                   │  │
│  │  middleware     │  │  Security (RLS)  │  │                   │  │
│  └─────────────────┘  │  enforces who    │  └───────────────────┘  │
│                       │  can read/write  │                          │
│                       └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │  (optional, for PDF export)
                               ▼
                    jsPDF + jspdf-autotable
                    (runs in the browser,
                     no server needed)
```

---

## Tech stack

| Layer | Technology | What it does |
|---|---|---|
| Framework | Next.js 15 (App Router) | Routing, server/client components, middleware |
| Language | TypeScript | Type safety across the whole codebase |
| Styling | Tailwind CSS | Utility-first CSS classes |
| UI components | Custom + Lucide icons | Reusable cards, buttons, modals |
| Animation | Framer Motion (motion-primitives) | Infinite slider, progressive blur |
| Database | Supabase (PostgreSQL) | All data storage and querying |
| Auth | Supabase Auth | Email/password login, sessions, email verification |
| File storage | Supabase Storage | Photos, receipts, QR codes |
| PDF export | jsPDF + jspdf-autotable | Sales report PDF generation (client-side) |
| Hosting | Vercel (recommended) | Deploys the Next.js app |

---

## Request lifecycle (example: submitting a payment)

```
1. User fills the billing form and clicks Submit
         ↓
2. BillingForm component runs handleSubmit()
         ↓
3. Supabase JS client sends INSERT to PostgreSQL
   via HTTPS to your Supabase project URL
         ↓
4. RLS policy checks: is this user allowed to insert?
   → Logged-in user: user_id matches auth.uid() ✓
   → Guest: user_id is null and auth.uid() is null ✓
         ↓
5. Row inserted into payments table (status = 'pending')
         ↓
6. App redirects to /?payment=success
         ↓
7. Admin sees the new pending payment in the admin panel
   and approves or rejects it
```

---

## Middleware (route protection)

```
Every request hits middleware.ts first

middleware.ts:
  → Reads the Supabase session from cookies
  → Refreshes the session token if it's about to expire
  → Passes the request through to the page

The page itself then checks:
  supabase.auth.getUser()
  → No user → redirect or show auth gate modal
  → Wrong role → redirect to /
```

---

## Environment variables needed

```
NEXT_PUBLIC_SUPABASE_URL      → your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY → public anon key (safe to expose)
```

These go in `.env.local` for local dev and in Vercel's environment settings for production.
