# Website Revision Notes
> Internal revision document — Admin & Client/Customer Portal

---

## ADMIN PANEL

### Overview Tab

1. **Clickable stat cards** — Pending Payments already redirects; Approved Payments, Registered Users, and Total Inquiries should also redirect to their respective tabs.
2. **Rename "Month Total" → "Monthly Total"** — both Monthly Total and Total Revenue should be clickable and open the new Report Tab.
3. **Clarify Monthly Total vs Total Revenue** — Monthly Total = sum of approved payments within the current calendar month. Total Revenue = all-time sum of all approved payments. These should be clearly distinguished in the UI.
4. **Paid Invoices and Funds Received** — should be clickable and redirect to the relevant report/payment view.
5. **Year label** — update "2024" in Sales Dynamics and Overall User Activity to **2026**.

---

DONE

### Report Tab *(New)*

1. **Transaction list** — list all transactions (online and cash) in a modern, formal, invoice-register format. Reference: https://www.spreadsheet123.com/ExcelTemplates/invoice-register.html. Use the same accent/color system as the admin UI.
2. **Filter function** — flexible filtering (by date range, type, status, client name, etc.) for easy lookup.
3. **Sort order** — default latest-to-oldest. Filterable and re-sortable.
4. **Export function** — supports PDF, Excel (XLSX), and DOCX export. Each format should have a formal template.
5. **Export options** — dropdown to select which data to export (filtered/specific records). Must show a **preview** of the output before saving/downloading.
6. **Void function** — allows voiding a specific transaction. On clicking void:
   - Popup appears asking for a reason (dropdown of preset reasons + "Other" option).
   - If "Other" is selected, a required text box appears for a custom comment.
   - Void button to confirm. Required to provide a reason before proceeding.
7. **Void/Deleted tab** — tracks all voided/deleted transactions with reasons and timestamps. Has a **Recover** function with a confirmation popup before proceeding.
8. **Void records in export** — voided transactions (with comments/reasons) are included when exporting reports.

---

### Inquiries Tab

1. **Move to end** of the navigation tab list.
2. **Reply via Email button is not functioning** — fix this.
3. **Compose popup** — clicking Reply opens a modal with:
   - A preset dropdown (common Q&A responses pre-filled).
   - "Reply on your own" option — shows a plain text area.
   - Formal email format design.
4. **Review before sending** — a review/confirm popup appears before the email is actually sent to prevent accidental sends.

---

### Doc Submissions Tab → Rename: "Funeral Services"

1. **Rename tab** from "Doc Submissions" to **"Funeral Services"**.
2. **2-Step approval review** — before approving, a review popup shows:
   - Preview of all submitted documents/images.
   - Images are clickable/enlargeable to fullscreen.
   - Reject button is also available inside the review popup.
3. **Delete function** — same rules as void (popup with reason + dropdown). Has a **Recently Deleted** tab:
   - Items auto-delete forever after **30 days**.
   - Individual deletion with confirmation popup ("Delete forever?").
   - Bulk delete with confirmation.
4. **Individual record view** — records should be clickable, each opening its own form/detail view. Status and date visible from the list view.
5. **Senior/PWD 20% discount checkbox** — before proceeding to payment, admin/staff can check if the client is eligible. If checked:
   - 20% is automatically deducted from the total.
   - Reflected in the client's payment form with a breakdown.
   - Logically accurate — only applies when the checkbox is checked (separate computation).
   - Review button required before approval.
6. **Print/Export function** — save/export/print individual records or filtered sets as PDF or DOCX. Preset formal template required.

---

### Payments Tab

1. **2-Step verification** — review popup before approving any payment. Void function (same rules as above).
2. **Record Cash button** — improve UI: make it noticeable/prominent. Inside the form:
   - Client Name *(required)*
   - Client Email *(optional)*
   - Phone Number *(required)*
   - Funeral Services dropdown — auto-fills price when a service is selected
   - Fixed amount (auto-calculated)
   - 20% Discount checkbox (if eligible)
   - Total breakdown shown on review before recording
   - Remove OR/Notes and Product Ref fields
   - 2-Step review before submission
3. **Print Receipts function** — save/export/print individual receipts or filtered sets as PDF or DOCX. Preset formal receipt template required.
4. **Individual record view** — each record is clickable and opens its own form. Status and date visible from the list.

---

### Obituaries Tab

1. Can **create, edit, publish** (to a chosen client, with confirmation), and **delete**.
2. **Recently Deleted tab** — same 30-day auto-delete rule as above.

---

### Profiles Tab

1. **Delete Account button** — admin can delete or accept/decline a client's deletion request. 2-step confirmation required.
2. **Role change** — 2-step confirmation popup before applying a role change.

---

### Columbarium Tab

1. **Amount not reflecting in overview** — fix the connection so payments made in columbarium (including walk-in/cash) are recorded and reflected in overview stats.
2. **Record Cash for walk-in customers** — same form structure as Payments > Record Cash (Client Name, Email optional, Phone, Service dropdown, Fixed amount, Discount checkbox, Total breakdown, 2-step review before recording). Remove OR/Notes and Product Ref.
3. **Payment portal (client-facing)** — fixed price per level, non-editable.
4. **Level pricing** — each level has its own amount, displayed clearly.
5. **2-Step verification** for all columbarium slot actions (status changes, reservations, etc.).

---

### Navigation Bar — Admin

- **Logically reorder** the nav tab list (arrange by workflow: Overview → relevant operations → settings-type tabs at the end, Inquiries last).
- **Collapsible** navigation bar.

---

### General Admin Notes

- **2-Step verification** — implement on all sensitive/important actions (approvals, voids, deletions, role changes, etc.). Not required on every action — use judgment.
- **Staff access restrictions:**
  - Cannot access Payment Receiving Details (edit).
  - Profile tab is hidden for staff.
  - Apply logical role-based access control throughout.

---

## CLIENT / CUSTOMER PORTAL

### General

1. **Tab persistence on refresh** — user should return to the same tab they left, not be redirected to login.
2. **Back button behavior** — should navigate to the last visited page, not reset to login.
3. **In-site notifications** — all communication (payment status, approvals, rejections, etc.) should happen within the site via a notification system. Notifications should be clickable and redirect logically. Email is only for: (a) inquiries from landing page (non-logged-in users) and (b) OTP.
4. **Client notification tab** — implement notifications for the client side.

### Account / Profile Tab *(New)*

- Profile picture upload (max 10MB).
- Edit: First name, Middle initial, Last name, Suffix (separate fields).
- Edit phone number.
- Edit email — requires OTP verification:
  - Editing/clearing the email field reveals a "Send OTP" button.
  - OTP input appears inline after sending.
  - Email only changes after correct OTP entry.
  - Auto-detects duplicate emails ("This email has already been taken").
- **Account deletion request** — client can request account deletion. 30-day grace period before permanent deletion.

### Registration / Sign Up

- Separate fields: First Name, Middle Initial, Last Name, Suffix (if any).
- Checkbox to agree to Terms & Conditions before account creation.
- Email duplicate detection ("This email has already been taken").
- **Password complexity** — must include uppercase, lowercase, number, and special character.

### Forgot Password

- Same OTP verification flow as email change (enter email → send OTP → verify → change password).

### Obituaries (Client-facing)

- **No longer public** — only the client who uploaded/was published to can see their obituary.
- **2-tab layout inside Obituaries:**
  - Tab 1: Create obituary (with auto background removal on uploaded photo).
  - Tab 2: Approved obituaries (approved by admin/staff).
- **Auto-compute age** from date of birth and date of death.
- Age display fix: "1 year old" not "1 years old". If under 1 year: display in months (e.g., "3 months old").
- **Tarp template green section** must contain:
  ```
  Main Branch: MAHARLIKA HIGHWAY, BRGY. SAMPALOC 2, SARIAYA, QUEZON
  Branch: BRGY. MAYUWI TAYABAS CITY
  Contact No.: 0916-797-8416
  ```
- **2-Step review before submission** (client confirms info before sending to admin).
- **Admin/staff 2-step review before approval**.

### Payment Status Tab *(New)*

- Client can view payment status/progress within the site (not via email).
- Payment portal pre-fills available info. Amount is fixed/calculated — not editable by client.
- Payment proof is required.

### Wake Schedule Tab *(New)*

**Client:**
- View their scheduled wake.
- Request to change location (dropdown: cemeteries in Sariaya + "Other Location" text input).
- Request date extension (max 2 weeks, selectable from a calendar starting from current date).
- Extend button with date picker.
- Notifications for approval/rejection of requests.
- If rejected: dropdown reason from admin/staff is shown to the client.

**Admin/Staff:**
- See all clients who availed coffin/casket services.
- Modify pickup date/time and burial location.
- Burial location: dropdown of cemeteries in Sariaya + "Other Location" option.
- Approve/reject client extension requests (2-step review before approving/rejecting).
- If rejecting: dropdown reason + optional comment.

---

## UI / UX

1. **Mobile optimization** — properly align and order elements on mobile. Not just desktop layout scaled down — actual mobile-first responsive design.
2. **Font size** — increase base font size slightly across the site. Not extreme, but big enough for comfortable reading.
3. **Animations/transitions** — add smooth, fast, noticeable (but not slow) transitions between tabs and clicks.
4. **Dropdowns** — all dropdown menus must be custom-styled to match the site's accent/UI, not browser-native.
5. **Clickable elements** — make it visually obvious what is and isn't clickable (cursors, hover states, etc.).
6. **Input validation:**
   - Numeric-only fields: numbers only with appropriate limits.
   - Phone number: 11-digit limit (PH format).
   - Bank account: valid format with character limit.
   - Address: use structured dropdowns (City/Municipality → Barangay, etc.).
   - Image uploads: **10MB maximum** on all upload fields.
7. **All product type/service selections** must use dropdowns.
8. **Valid ID field** — rename to "Valid ID of the deceased person" in document submission.
9. **UI consistency** — align client/customer UI style with the admin/staff UI. Fix alignment and layout of Obituaries, Funeral Services, About Us, and Contacts pages.
10. **Navigation bar** — collapsible on both admin and client sides.

---

*Last updated: See git history for revision date.*
