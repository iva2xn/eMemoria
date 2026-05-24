# Admin Page (`/admin`)

## About the page
Protected dashboard strictly for staff and admins.

## Access control
```
Role check logic

Page loads
    ↓
supabase.auth.getUser()
    ↓
profile.role === 'admin' or 'staff' → show admin button sa navigation.
if anything else (or not logged in)    → redirect to / lang
```

## Tabs and what each one does

---

### Overview Tab
Reads live counts and recent records from Supabase.

```
READ  payments   → count pending, sum approved revenue
READ  bookings   → count total, get 4 most recent
READ  inquiries  → count total, get 3 most recent
READ  profiles   → count total
      ↓
Displays stat cards + 3 mini-lists

Quick approve button:
UPDATE payments SET status='approved', approved_at=now() WHERE id=?
      ↓
Refreshes the overview data
```

Dito yung last na pinagawa nyo: **PaymentInfoCard** (editable GCash + bank details):
```
READ  payment_info WHERE id=1  → show current details
Edit button clicked             → enter edit mode
Save button clicked:
UPDATE payment_info SET ... WHERE id=1
Upload QR image:
supabase.storage.upload('payment-info', file)  → saves path to draft
```

Also contains **SalesReportModal**:
```
Filters: date range, status, product type, payment method
      ↓
READ payments WHERE created_at BETWEEN ? AND ?
  + optional filters (status, product_type, method)
      ↓
Displays summary cards + transactions table
Export CSV  → builds CSV string, triggers browser download
Export PDF  → uses jsPDF + jspdf-autotable, triggers download
```

---

### Inquiries Tab
```
READ inquiries ORDER BY created_at DESC
      ↓
Accordion list — click to expand

On expand (if unread):
UPDATE inquiries SET is_read=true WHERE id=?
      ↓
Dot changes from green to grey
```

---

### Bookings Tab
```
READ bookings ORDER BY created_at DESC
READ profiles WHERE id IN (user_ids from bookings)
READ payments WHERE status='approved'
      ↓
Enriches each booking with:
  - profile name/email (if logged-in user)
  - paymentStatus: 'paid' or 'unpaid'
    (matched by booking_id, or fallback: email+package_name)

Filter buttons: All / Pending / Active / Completed / Cancelled

Action buttons:
  Pending  → "Finished" → UPDATE bookings SET status='active'
           → "Cancel"   → UPDATE bookings SET status='cancelled'
  Active   → "Complete" → UPDATE bookings SET status='completed'
```

---

### Payments Tab
```
READ payments ORDER BY created_at DESC
READ profiles WHERE id IN (user_ids)
      ↓
Enriches each payment with profile name/email

Search bar: filters by name, email, reference, product, method
Status filter: All / Pending / Approved / Rejected

Approve button (admin only):
UPDATE payments SET status='approved', approved_at=now() WHERE id=?

Reject button (admin only):
UPDATE payments SET status='rejected' WHERE id=?

Products popover: hover to see product_type, product_ref, booking_id, notes, receipt

Record Cash Payment modal:
  Looks up profile by email → INSERT payments (status='approved', method='cash')
```

---

### Columbarium Tab
```
READ columbarium_slots ORDER BY row_number, col_number
      ↓
Visual 6×12 grid — color coded:
  Green  = available
  Yellow = reserved
  Red    = occupied

Click a slot → detail modal shows:
  level, column, price, occupant info (if any)

Update Status buttons:
UPDATE columbarium_slots SET status=? WHERE id=?
  → Available / Reserved / Occupied
```

---

### Obituaries Tab
```
READ obituaries ORDER BY created_at DESC
      ↓
Grid of mini tarp previews

Create Tarp button → modal:
  Fill in deceased info + upload photo
  supabase.storage.upload('obituaries', photo)
  INSERT obituaries (is_published = true or false)

Edit button → inline edit panel with live TarpPreview:
  Type in fields → preview updates in real time
  Save:
  UPDATE obituaries SET full_name, birth_date, ... WHERE id=?

Publish / Unpublish button:
UPDATE obituaries SET is_published=!current WHERE id=?
```

---

### Profiles Tab
```
READ profiles ORDER BY created_at DESC
      ↓
Table of all registered users

Search bar: filters by name, email, role

Change Role dropdown (admin only):
UPDATE profiles SET role=? WHERE id=?
  → client / staff / admin
```

---

## Role differences
| Feature | staff | admin |
|---|---|---|
| View all tabs | ✅ | ✅ |
| Approve/reject payments | ❌ | ✅ |
| Edit payment info | ❌ | ✅ |
| Change user roles | ❌ | ✅ |
| Record cash payments | ✅ | ✅ |
| Publish obituaries | ✅ | ✅ |
