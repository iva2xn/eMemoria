# eFuneraria

Lagyan natin ng deets later kung ano ba to

---

## Features

### 1. Authentication

**Files:** `app/auth/register/page.tsx`, `app/auth/login/page.tsx`

Starting sa authentication. Yung auth natin need ng name, email, and password. After signing up, may mare-receive na email **verification** may link yung email naka hyperlink naman yon. Di gagana yung user if hindi pipindutin ng user yung verification link.

Pag logged in na, bukod sa allowed na sila mag avail ng products, naka auto fill din yung info nila like email at password sa payment forms.

```
Sign Up → Email Verification → Log In → Open Access Billing & Services
```

May **Forgot Password** feature din, standard forgot password flow lang naman. Gets nyo na to

**Flow behind the scenes:**

After ng sign up eto yung nagsesend ng trigger sa supabase para magsend ng verification email:

```ts
// app/auth/register/page.tsx
await supabase.auth.signUp({
  email,
  password,
  options: { data: { name } },
})
```

After nyan mag run, may database trigger tayo sa server na nagfifill ng row sa 'profiles' table natin na "ayy may nagsubmit ng form name "Ivann Comiso" email "iva2xn@gmail.coom" so naka save na agad yung details pero yung auth natin nagiintay pa yan ng verification from the user. Once ma verify ni user via clicking the link redirect sya sa page (localhost yung reedirection link nya atm kasi hindi pa finalized yung url ng website add natin later). May log din yan sa database kung kelan ba kinonfirm ni user yung account.

```yung sql for user creation:
-- supabase/migrations/001_create_profiles.sql
insert into public.profiles (id, name, email, role)
values (new.id, new.raw_user_meta_data->>'name', new.email, 'client');
```

After ng auth, nag rerefresh yung page para ma save yung session cookie is saved after auth. Para ma retain yung authentication status ng user kahit magpalipat lipat ng page.

```ts
// app/auth/login/page.tsx
await supabase.auth.signInWithPassword({ email, password })
window.location.href = nextUrl
```

---

### 2. Service Pages — Packages, Cremation, Columbarium
**Files:** `app/services/page.tsx`, `app/services/cremation/page.tsx`, `app/columbarium/page.tsx`

- **Funeral Packages** — etong Funeral packages yung may tarp creation.

- **Cremation Services** — Eto yung part na may automatic +25,000 charge. Pwede naman i off ni customer yung +25k if hindi nila need ng cremation like if urn lang yung need nila

- **Columbarium** — eto reservation grid lang to nung columbarium, color coded by availability (available, reserved, occupied). Based yung price na nilagay ko jan from figma

Pag nag click si client ng "Reserve" or "Avail," rekta sila sa billing page naka pre fill na ulit yung form based sa pinili nila na slot.

```
Ganito yung kung pano gumagana. yung pre-fill nung sa form. (Will explain more visually sa chat)
/billing?product=columbarium&slot=R2C05&price=35000&level=Eye+Level
```

**How it works behind the scenes:**

Hindi hardcoded yung columbarium Connected sha sa `columbarium_slots` table sa database so kita nya yung live status nung 72 slots kada page load.

```ts
// app/columbarium/page.tsx
const { data: slots } = await supabase
  .from('columbarium_slots')
  .select('*')
  .order('row_number')
  .order('col_number')
```

Lahat ng changes ng admin or staff like sa pag mark ng columbarium slots, realtime nauupdate. Etong part na to kayo bahala if isasama nyo pa sa explanation pero may pre-seeding logic tayo na ginamit para mailagay lahat ng 72 slot sa database.

```sql
-- filename/loc if need nyo icheck -->>supabase/migrations/002_create_columbarium_slots.sql<<--

-- Row prices: 1=₱25k, 2=₱35k, 3=₱25k, 4-6=₱20k
insert into public.columbarium_slots (row_number, col_number, slot_code, price)
values (r, c, 'R' || r || 'C' || lpad(c::text, 2, '0'), price_map[r]);
```

Yung R = Row horizontal, yung C = Column vertical
Yung prices nya naka base sa row number
    Row prices: 1=₱25k, 2=₱35k, 3=₱25k, 4-6=₱20k
So imagine 1 by 1 ina add nung sql logic yung row so sisimulan nya from row 1 column 1 = 25k hanggang sa row 1 column 12 = 25k once mag proceed sa row 2 column 1 35k yung price. Basta ganun yung seeding logic.
---

### 3. Billing and Payments
**File:** `app/billing/page.tsx`

Eto naman yung sa transaction page. magfifill out dito si client ng details and pipipli ng payment method (GCash, Bank, (BDO / BPI / etc) or Cash), then enter reference number, pwede rin mag upload ng picture ng receipt.

**Payment behaviors:**

- If di **logged in**, si clienta naka block yung form and may popup sila na makikita to sign in first. Once naka log-in naman na sila gagana na yung page.

- If **logged in**, naman si user, yung name at email ehh naka pre-fill na den like yung sa ibang forms.

- For **columbarium**,  10% reservation fee lang yung nilagay ko na charge upfront then yung iba cash na. Ako na nagdesisyon bida bida ako ehh. Jok, ask ko to mamaya.

- For **urns**, naka default to na may +25k sa fee kasi may service fee sa cremation diba? Pero pwede naman alisin ni user if yung urn lang yung need nya.

After submission nung payment matik naka save yan sa database pero naka **"pending"** status. Need i-review at approve ng admin yung payment since sabi nyo hindi pwede si staff. May booking din na naka add for traditional funeral at sa urn if may "SERVICE" na naka-add sa binayaran ni customr. Otherwise kelangan lang nila iclaim yung urn sa shop. Actually di ko natest pala yung Auto bookings sa urns if may service so check ko din mamaya.

Para sa **package purchases**, dun sa traditional burials.after payment submission, may lalabas na form jan para sa tarp generator mamaya ko eexplain to.

**How it works:**

After ng payment submission, yung receipt which is optional, ehh isasave sa private storage bucket yung storage bucket yung container ng mga media, kasi iba yung table ng user id, product type, payment method, etc. Bale nakalagay pa din sa table yung image pero link lang sha nung image. Yung image is nakalagay talaga sa storage bucket. If hindi naman uungkatin, sabihin nyo na lang naka save sa database.

```ts
// app/billing/page.tsx
await supabase.from('payments').insert({
  user_id:           user?.id ?? null,
  guest_name:        user ? null : name,
  product_type:      preProduct || 'general',
  product_ref:       preSlot || preLabel || null,
  method,
  reference_number:  refNum || null,
  amount:            Number(amount),
  receipt_file_path: receiptPath,
  status:            'pending',
})
```

After non, gumagawa din yung `bookings` (using yung code sa baba) ng booking at the same time kasi similar details lang naman kelangan nila

```ts
await supabase.from('bookings').insert({
  user_id, guest_name, guest_email, guest_phone,
  package_name, price: Number(amount), status: 'pending',
})
```

Yung admin panel natin may smart matching between payments and bookings. If nakalink yung payment sa booking id like if nag "avail" sila via the website matik link yon


### 4. Obituary Submission and Tarpss Preview
**Files:** `app/obituaries/page.tsx`, `components/ui/tarp-preview.tsx`

Lahat ng authenticated user pwede mag submit ng obituary request after nila mag fill up nung payment form.

Yung sa **live tarpaulin preview** hindi sya 1 to 1 dun sa design nung actual tarp design ng client.

```
Fill out form → Preview → Submit → Admin reviews → Publish → Obituary Page
```

Yung submitted obituary rekta yun sa admin as **draft** (not visible to the public) Need pa i approve ng admin or staff para ma view sa Public interface ng Obituary.

**How it works:**

12n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v23412n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v23412n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v23412n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v23412n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v23412n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v23412n34892v748932v79841nv392n419n23v794n137298vn1479823nv714892n923nv49812n374v123v4123v1v234

The tarpaulin preview is rendered entirely in the browser using HTML and CSS — no image generation or server calls needed. It scales automatically to fit any screen size using a `ResizeObserver`.

When the obituary is submitted, the photo is uploaded to a storage bucket and only the file path is saved. This snippet talks to the `obituaries` table in the database so it can store the record as a draft, waiting for admin review:

```ts
// app/obituaries/page.tsx
await supabase.from('obituaries').insert({
  full_name:    fullName,
  birth_date:   birthDate || null,
  death_date:   deathDate || null,
  image_path:   imagePath,       // storage path, not a URL
  is_published: false,           // draft until admin publishes it
  venue_address, contact_number,
})
```

On the public page, this snippet talks to the `obituaries` table so it can fetch only the published ones and resolve each photo path into a real displayable URL:

```ts
// app/obituaries/page.tsx
const { data } = await supabase
  .from('obituaries')
  .select('*')
  .eq('is_published', true)
  .order('created_at', { ascending: false })

// convert storage path → public URL
supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
```

The slideshow renders all obituaries in the DOM at once and animates by sliding the entire strip left or right — that's what makes the transition smooth instead of a hard cut.

---

### 5. Admin and Staff Panel
**File:** `app/admin/page.tsx`

Only users with the `admin` or `staff` role can access `/admin`. Everyone else is redirected away. The panel has seven tabs:

| Tab | What it does |
|---|---|
| **Overview** | Live counts of pending payments, bookings, inquiries, and total revenue. Shows a quick-approve list for pending payments. |
| **Inquiries** | All contact form submissions. Staff can mark them as read and reply via email. |
| **Bookings** | All service reservations — both from logged-in users and guests. |
| **Payments** | All payment submissions with status (pending/approved/rejected). Admins can approve or reject. Staff can only view. |
| **Columbarium** | The full slot grid. Staff/admin can update slot status and add occupant details. |
| **Obituaries** | All submitted obituaries. Staff/admin can edit details, update the photo, and publish or unpublish. |
| **Profiles** | All registered user accounts. Admins can change a user's role (client → staff → admin). |

**How it works behind the scenes:**

When the Overview tab loads, this snippet talks to multiple tables in the database at the same time so it can pull all the live counts and recent activity in a single round trip — no waiting for one query to finish before starting the next:

```ts
// app/admin/page.tsx — OverviewTab
const [
  { count: pending },
  { count: totalBookings },
  { data: approvedPayments },
] = await Promise.all([
  supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  supabase.from('bookings').select('*', { count: 'exact', head: true }),
  supabase.from('payments').select('amount').eq('status', 'approved'),
])
```

When an admin approves a payment, this snippet talks to the `payments` table in the database so it can update the status and record who approved it and when:

```ts
// app/admin/page.tsx — PaymentsTab
await supabase.from('payments')
  .update({ status: 'approved', approved_at: new Date().toISOString() })
  .eq('id', paymentId)
```

The sales report PDF is generated entirely in the browser using `jspdf` — it's only loaded when the admin actually clicks export, so it doesn't slow down the rest of the page.

---

### 6. Role-Based Access Control
**Files:** `app/admin/page.tsx`, `supabase/migrations/010_add_staff_role.sql`

The system has three user roles:

| Role | What they can do |
|---|---|
| **Client** | Browse services, submit payments, view their own records |
| **Staff** | Everything above + access the admin panel, manage obituaries, bookings, columbarium |
| **Admin** | Everything above + approve/reject payments, edit payment info (GCash/bank details), change user roles |

**How it works behind the scenes:**

The first layer of protection is in the app itself. When the admin page loads, this snippet talks to the `profiles` table in the database so it can check the current user's role — if they're not admin or staff, they get sent back to the homepage:

```ts
// app/admin/page.tsx
const { data: profile } = await supabase
  .from('profiles').select('*').eq('id', user.id).single()

if (profile.role !== 'admin' && profile.role !== 'staff') {
  router.push('/')
}
```

But the real protection is the second layer — inside the database itself. These are called Row Level Security policies. For example, this policy on the `payments` table means only admins can approve or reject payments, even if someone tried to bypass the app entirely:

```sql
-- supabase/migrations/005_create_payments.sql
create policy "Admins can update payment status"
  on public.payments for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
```

Role changes are protected by a database trigger. This snippet runs automatically inside the database whenever anyone tries to change a user's role — if the person making the change isn't an admin, the database rejects it with an error:

```sql
-- supabase/migrations/010_add_staff_role.sql
if new.role is distinct from old.role then
  if auth.uid() is not null and not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can change user roles';
  end if;
end if;
```

---

### 7. Payment Info Management (GCash & Bank Details)
**File:** `app/admin/page.tsx` → Overview tab

Admins can update the funeral home's GCash name, number, and QR code image, plus up to 4 bank transfer accounts — all from the admin panel without touching any code. These details are displayed on the billing page so clients know where to send their payment.

**How it works behind the scenes:**

All payment details are stored in a single row in the `payment_info` table — it can be updated but never deleted or duplicated (enforced by the database). When the admin saves changes, this snippet talks to the `payment_info` table so it can update the details immediately across the whole site:

```ts
// app/admin/page.tsx — PaymentInfoCard
await supabase.from('payment_info').update(draft).eq('id', 1)
```

The QR code image is uploaded to a public storage bucket and only the file path is saved. Uploading a new QR always replaces the same file, so old images don't pile up in storage.

---

### 8. Sales Report
**File:** `app/admin/page.tsx` → Payments tab

Admins can generate a sales report filtered by date range, product type, payment method, and status. The report shows total revenue, number of approved/pending/rejected transactions, and a full transaction list.

It can be exported as:
- **CSV** — opens in Excel or Google Sheets
- **PDF** — a formatted report with the funeral home's logo and branding

**How it works behind the scenes:**

When the admin sets their filters, this snippet talks to the `payments` table in the database so it can fetch only the matching records — nothing more, nothing less:

```ts
// app/admin/page.tsx — SalesReportModal
let q = supabase
  .from('payments')
  .select('id, created_at, guest_name, product_type, amount, status, ...')
  .gte('created_at', `${dateFrom}T00:00:00`)
  .lte('created_at', `${dateTo}T23:59:59`)

if (statusFilt !== 'all') q = q.eq('status', statusFilt)
if (product    !== 'all') q = q.eq('product_type', product)
```

The CSV and PDF are both built entirely in the browser — no server involved. The PDF library (`jspdf`) is only loaded when the admin actually clicks export so it doesn't slow down the rest of the page.

---

### 9. Contact / Inquiry Form
**File:** `app/contact/page.tsx`

Anyone can send a message to the funeral home through the contact page. The message is saved to the database and appears in the admin panel's Inquiries tab, where staff can read and respond.

**How it works behind the scenes:**

No account is needed to send a message. This snippet talks to the `inquiries` table in the database so it can save the message with an "unread" status — the database allows anyone to insert a message, but only staff and admins can read them:

```ts
// app/contact/page.tsx
await supabase.from('inquiries').insert({
  name, email, subject, message,
  is_read: false,
})
```

When a staff member opens an inquiry in the admin panel, this snippet talks to the `inquiries` table so it can mark it as read automatically:

```ts
// app/admin/page.tsx — InquiriesTab
await supabase.from('inquiries').update({ is_read: true }).eq('id', inq.id)
```

Replying opens the staff member's email client with the subject and recipient already filled in — no extra setup needed.

---

## How the Data is Stored

All data lives in a **PostgreSQL database** hosted on Supabase — a cloud platform that also handles file storage and user authentication. Here's what each table holds:

| Table | What's stored |
|---|---|
| `profiles` | User accounts (name, email, role) |
| `columbarium_slots` | All 72 niche slots with status and occupant info |
| `bookings` | Service reservations |
| `payments` | Payment submissions with receipt and status |
| `obituaries` | Obituary records with photo path and publish status |
| `inquiries` | Contact form messages |
| `payment_info` | The funeral home's GCash and bank details (one row only) |

The database is set up so that **each user can only see their own data** — a client cannot see another client's payments or bookings. Only staff and admins can see everything. This protection lives inside the database itself, not just in the app, so it holds even if someone tries to access the data directly.

---

## How to Run the Project

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You'll need a `.env.local` file with your Supabase project URL and anon key:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
