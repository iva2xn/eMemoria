# Deployment Guide

How to take this project from your local machine to a live URL.

---

## What you need

- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- Your project pushed to a GitHub repository

---

## Step 1 — Set up Supabase

### 1a. Create a new project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Give it a name (e.g. `gayeta-funeral`)
3. Set a strong database password — save it somewhere safe
4. Choose a region close to your users (e.g. Southeast Asia)
5. Click Create Project and wait ~2 minutes

### 1b. Run the database schema

1. In your Supabase project → go to **SQL Editor**
2. Click **New query**
3. Open `supabase/migrations/000_full_schema.sql` from this repo
4. Paste the entire file into the editor
5. Click **Run**

You should see "Success. No rows returned." — that means all tables, triggers, policies, and storage buckets were created.

### 1c. Get your API keys

Go to **Project Settings → API**

You need two values:
- **Project URL** — looks like `https://xyzxyzxyz.supabase.co`
- **anon public key** — a long string starting with `eyJ...`

Keep these handy for Step 3.

### 1d. Enable email confirmations (optional but recommended)

Go to **Authentication → Email Templates** to customize the verification email.

Go to **Authentication → Providers → Email** to configure:
- Enable email confirmations: ON (recommended for production)
- For demo/testing: you can turn this OFF so accounts activate instantly

### 1e. Create your first admin account

1. Go to `/auth/register` on your deployed site (or locally)
2. Register with your admin email
3. Back in Supabase → **SQL Editor** → run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

## Step 2 — Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

Make sure `.env.local` is in your `.gitignore` — it should already be. Never push your environment variables to GitHub.

---

## Step 3 — Deploy to Vercel

### 3a. Import the project

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your GitHub repository
3. Vercel will auto-detect it as a Next.js project

### 3b. Add environment variables

Before clicking Deploy, add these under **Environment Variables**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |

### 3c. Deploy

Click **Deploy**. Vercel will build and deploy the app. Takes about 1–2 minutes.

Your site will be live at something like `https://your-project.vercel.app`

---

## Step 4 — Post-deployment checklist

- [ ] Visit the live URL and confirm the home page loads
- [ ] Register a test account and verify the email flow works
- [ ] Promote your admin account via SQL (see Step 1e)
- [ ] Go to `/admin` and confirm the dashboard loads
- [ ] Submit a test inquiry via `/contact` and check it appears in admin
- [ ] Upload a GCash QR code in the admin PaymentInfoCard
- [ ] Test a payment submission on `/billing`

---

## Local development setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.local.example .env.local
# Then fill in your Supabase URL and anon key

# 4. Start the dev server
npm run dev

# App runs at http://localhost:3000
```

### `.env.local` format

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Redeploying after changes

Vercel auto-deploys every time you push to your main branch on GitHub.

```bash
git add .
git commit -m "your changes"
git push
```

Vercel picks it up automatically — no manual steps needed.

---

## Common issues

| Problem | Fix |
|---|---|
| "Invalid API key" error | Double-check env variables in Vercel settings |
| Images not loading | Make sure the storage buckets were created (run the migration) |
| Admin page redirects to home | Your profile role is still 'client' — run the SQL update |
| Emails not arriving | Check Supabase → Authentication → Logs for errors |
| Build fails on Vercel | Check the build logs — usually a TypeScript error |
