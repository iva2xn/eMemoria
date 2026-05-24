# Feature Flow Diagrams

Visual step-by-step flows for every major feature in the system.

---

## 1. User Registration & Login

```
REGISTER
────────
Fill name, email, password, confirm
            ↓
Client-side validation
  (all fields, passwords match, min 6 chars)
            ↓
supabase.auth.signUp()
            ↓
Supabase sends verification email
            ↓
DB trigger auto-creates profiles row
  (role = 'client')
            ↓
EmailVerifyModal shown
  → user clicks link in email
  → account activated
  → user goes to /auth/login

LOGIN
─────
Fill email + password
            ↓
supabase.auth.signInWithPassword()
            ↓
Error? → show banner
Success → window.location.href = nextUrl
          (hard redirect so middleware writes session cookie)
```

---

## 2. Payment Submission

```
User arrives at /billing
  (from a service page, columbarium, or direct link)
            ↓
Auth check: supabase.auth.getUser()
  Not logged in → AuthGateModal blocks the form
  Logged in     → pre-fill name + email from profile
            ↓
URL params parsed:
  ?product=columbarium&slot=R2C05&price=35000
  → amount auto-calculated (columbarium = 10% of price)
            ↓
User fills contact info + picks payment method
User uploads receipt (optional)
            ↓
handleSubmit():
  1. Validate fields
  2. Upload receipt to storage (if provided)
  3. INSERT payments (status = 'pending')
  4. INSERT bookings (auto-created for most product types)
            ↓
product = 'package'?
  YES → ObituaryModal (fill tarp details)
        → INSERT obituaries (is_published = false)
        → redirect /?payment=success
  NO  → redirect /?payment=success
            ↓
Home page shows success toast for 6 seconds
```

---

## 3. Admin Payment Approval

```
Admin opens /admin → Payments tab
            ↓
Table shows all payments (pending / approved / rejected)
Admin can search by name, email, reference, product
            ↓
Pending payment row:
  "Approve" clicked
    → UPDATE payments SET status='approved', approved_at=now()
    → Row updates in UI immediately (optimistic update)

  "Reject" clicked
    → UPDATE payments SET status='rejected'
    → Row updates in UI immediately
            ↓
Overview tab stats update on next load
```

---

## 4. Columbarium Reservation

```
User visits /columbarium
            ↓
READ columbarium_slots (all 72)
            ↓
Grid renders:
  Green  = available  (clickable)
  Yellow = reserved   (clickable, info only)
  Red    = occupied   (disabled)
            ↓
User clicks an available slot
            ↓
SlotModal opens:
  Shows slot code, level, price
  "Reserve" button → /billing?product=columbarium
                      &slot=R2C05
                      &level=Eye+Level+(Upper)
                      &price=35000
  "Inquire" button → /contact?slot=R2C05&action=inquire
            ↓
On billing page:
  Amount locked to 10% of price (reservation fee)
  Payment submitted → booking created
            ↓
Admin manually updates slot status in admin panel:
  available → reserved → occupied
  (slot status is NOT auto-updated by payment submission)
```

---

## 5. Obituary / Tarp Lifecycle

```
THREE ways an obituary is created:
─────────────────────────────────

A. Visitor submits via /obituaries page
   → ObituarySubmitModal
   → INSERT obituaries (is_published = false)

B. Client submits after package payment on /billing
   → ObituaryModal shown post-payment
   → INSERT obituaries (is_published = false)

C. Admin creates directly in admin panel
   → CreateTarpModal
   → INSERT obituaries (is_published = true or false)

─────────────────────────────────
All paths lead to the admin panel:

Admin opens Obituaries tab
            ↓
Sees all records (including drafts)
            ↓
"Publish" clicked
  → UPDATE obituaries SET is_published = true
            ↓
Obituary now appears in the public slideshow at /obituaries

Admin can also:
  Edit fields (name, dates, venue, contact) with live preview
  Unpublish → UPDATE obituaries SET is_published = false
```

---

## 6. Contact Form → Inquiry

```
User fills contact form at /contact
            ↓
handleSubmit():
  Validate name, email, message
  INSERT inquiries (is_read = false)
            ↓
Success state shown ("Message Received")
Form fields cleared
            ↓
Admin opens Inquiries tab
  Unread dot = green
  Read dot   = grey
            ↓
Admin clicks to expand
  → UPDATE inquiries SET is_read = true
  → "Reply via Email" opens mailto: link
```

---

## 7. Sales Report Generation

```
Admin clicks "Sales Report" in Overview tab
            ↓
SalesReportModal opens
            ↓
Filters available:
  Date range (from / to)
  Status (all / approved / pending / rejected)
  Product type (all / columbarium / package / urn / etc.)
  Payment method (all / gcash / bdo_bank / bpi_bank / cash)
  Quick presets: Today / This Week / This Month / Last Month / This Year
            ↓
READ payments WHERE created_at BETWEEN ? AND ?
  + optional WHERE clauses for each active filter
            ↓
Summary cards computed from results:
  Total revenue (approved only)
  Pending amount
  Transaction count
  Revenue by product type
  Revenue by payment method
            ↓
Export CSV  → builds comma-separated string → browser download
Export PDF  → jsPDF renders branded PDF with table → browser download
```

---

## 8. Admin Role Management

```
Admin opens Profiles tab
            ↓
Table shows all registered users
Admin searches by name / email / role
            ↓
Role dropdown changed for a user
            ↓
UPDATE profiles SET role = 'staff' WHERE id = ?
            ↓
guard_role_change() trigger fires:
  Is the caller an admin? YES → allow
  Is the caller staff or client? → RAISE EXCEPTION
            ↓
UI updates the badge immediately
```
