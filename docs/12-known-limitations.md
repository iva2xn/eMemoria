# Known Limitations

Honest list of things the system doesn't do, edge cases to be aware of, and things that could be improved in a future version.

---

## Functional limitations

### Payments are manually verified
The system does not connect to GCash or any bank API. When a client submits a payment, they upload a screenshot of their receipt. An admin then manually checks the screenshot and approves or rejects it. There is no automatic payment confirmation.

**Why:** Integrating with GCash or bank APIs requires business registration, API agreements, and fees — not feasible for a college project scope.

---

### Columbarium slots are not auto-updated after payment
When a client reserves a columbarium slot and submits a payment, the slot status does **not** automatically change from `available` to `reserved`. An admin must manually update the slot status in the admin panel.

**Why:** The payment is still `pending` when submitted. Auto-updating the slot before the payment is verified could cause confusion if the payment is later rejected.

---

### No real-time updates in the admin panel
If two admins are using the panel at the same time, they won't see each other's changes until they refresh the page. There are no live subscriptions (Supabase Realtime is not used).

**Why:** Realtime subscriptions add complexity and were out of scope. For a single-admin setup this is not an issue.

---

### No delete operations
None of the tables support deletion from the UI. Payments, bookings, inquiries, obituaries, and profiles can only be created or updated — never deleted.

**Why:** Deletion of financial records is generally a bad practice. For a funeral service, keeping a full audit trail matters. Deletion can be done directly in the Supabase dashboard if truly needed.

---

### No pagination
The admin panel loads all records at once. If the database grows to thousands of payments or bookings, the tables will become slow to load.

**Why:** Pagination was not implemented to keep the UI simple. For the expected scale of a small funeral home, this is acceptable.

---

### Password reset page not built
The "Forgot password?" flow sends a reset email, but the `/auth/reset-password` page that the link points to does not exist yet. Supabase handles the token, but there's no UI to enter the new password.

**Workaround:** Admins can reset passwords directly from the Supabase Dashboard → Authentication → Users.

---

### No email notifications
When a payment is approved or rejected, the client does not receive an email notification. They have to check back manually or wait for a phone call.

**Why:** Sending transactional emails requires a configured email provider (SendGrid, Resend, etc.) and a server-side function. This was out of scope.

---

### Obituary photos must be manually prepared
The tarp preview works best with PNG images that have a transparent background (so the subject blends into the tarp design). Most phone photos are JPEGs with a solid background. Clients need to prepare the photo themselves or ask staff to do it.

**Why:** Background removal requires an AI/image processing API (e.g. remove.bg). Not implemented.

---

### No booking-to-slot link
When a columbarium slot is reserved via the billing page, the booking record does not store which specific slot was reserved (only the slot code appears in the notes field). There is no direct foreign key from bookings to columbarium_slots.

**Why:** The booking system was designed generically for all service types. A dedicated columbarium reservation table would be cleaner but was not built.

---

### Sales report only covers the payments table
The Sales Report shows payment records only. It does not include bookings that have no associated payment, or cash payments recorded before the cash payment feature was added.

---

## Technical limitations

### No server-side rendering for protected pages
All auth checks happen client-side. This means there's a brief flash (spinner) before a redirect fires on protected pages. A proper implementation would use Next.js server components or middleware redirects.

### jsPDF table layout can overflow on large datasets
If a report has hundreds of rows, the PDF table may not paginate perfectly. The `jspdf-autotable` library handles most cases but very long text in notes fields can cause layout issues.

### No input sanitization beyond basic validation
Form inputs are validated for presence and format but not sanitized against XSS or SQL injection. Supabase's parameterized queries prevent SQL injection, and React's JSX escapes HTML by default, so the risk is low — but a production system should add explicit sanitization.

### Mobile admin panel is usable but not optimized
The admin panel was designed primarily for desktop use. Tables scroll horizontally on mobile, which works but is not ideal for frequent use on a phone.

---

## Out of scope (intentionally not built)

- Online payment gateway (GCash API, PayMongo, etc.)
- SMS notifications
- Inventory management (caskets, urns stock)
- Staff scheduling / calendar
- Multi-branch support
- Customer portal (clients viewing their own booking history in a dedicated UI)
- Printed receipt generation
- Automated slot assignment
