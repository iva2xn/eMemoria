# Master Revision & Feature List
> Tracks all pending and completed tasks across the entire system.
> Items marked with `#finished` have already been implemented.

---

## Wake Schedule (Client)

### Wake Period Form
- **Wake Start Date** *(required)*: MM/DD/YYYY — type input + calendar picker
- **Wake End Date and Time** *(required)*: MM/DD/YYYY HH:MM — type input + calendar picker + time selector. Maximum of one week / 7 days from Wake Start Date.
- **Wake Location** *(required)*: Textbox with a Location Symbol button on the right side — clicking the button auto-locates and auto-fills the textbox.
- **Burial / Interment Location**: Dropdown — Remove "Other Location" (out of scope).
- **Additional Notes**: Textbox

### Crash/Disconnect Recovery
- If internet drops, browser crashes, or unexpected interruption occurs mid-form, the user can return to **Wake Schedule > Pending Schedules** to edit and re-submit.
- Implement **Pending Schedules** section with edit and submit functionality.

### Submit Memorial Tarpaulin (after Wake Schedule)
- This step is optional / skippable.
- Auto-fetch deceased information from the Wake Schedule so the user doesn't need to retype it.
- This auto-fetch only applies post-payment, specifically for **Obituaries > Submit Obituary**.

### Extension Date Rule
- Extension start date must be the day **after** Wake End Date.
- Total extension window is capped at **7 days** from that start date — no stacking allowed.
- A second extension does NOT add another 7 days on top of the first extension's end date; it still counts from the day after the original Wake End Date.
- Remove **Other Location** from Location Change dropdown (out of scope).

### Request History & Pay Extension Fee
- **Request History** must be visible by default.
- **Pay Extension Fee** must also be visible and accessible.
- Pay Extension Fee is connected to the Payments section (All / Pending / Approved / Not Approved) — payment status must be reflected there.

---

## Your Account (Profiles)

1. **Change Email Address** — currently broken ("User not found" error). Fix this.
2. **Suffix field** — must be a dropdown (Jr., Sr., II, III, IV, V, etc. — look up a complete list online). Not required; default value must be **No Suffix** (listed first / prioritized in dropdown).
3. **Contact Number** — default placeholder/value must be **+63 9** (pre-filled with the leading digit).

---

## Notifications

1. Notifications must be **live/real-time** — the bell counter must decrease immediately when a notification is cleared or viewed (no stale counts).
2. All notifications must be **clickable** and redirect to the correct specific location.

---

## Funeral Services (Client-facing)

1. **Traditional Burial** — Remove the "We're Here for You / Ready to arrange a service?" section at the bottom entirely.
2. **Cremation Services** — Remove the "We're Here for You / Let us help you arrange a respectful memorial service." section at the bottom entirely.
3. **Columbarium Slots**:
   - 3.1. Remove the "Reserve a Niche / RESERVE" section at the bottom entirely.
   - 3.2. Slot Legend is redundant — merge/move the description into the existing legend at the bottom columbarium slots section (remove the duplicate).

---

## Obituaries / Submit Memorial Tarpaulin (Client)

1. Add **Suffix** field — dropdown (same list as Profiles suffix). Not required; default is **No Suffix**.
2. **Name fields** (First Name, Middle Initial, Last Name) — must reject numeric input; letters only.
3. Remove **Your Name** and **Your Email** fields — fetch these from the logged-in user's profile instead. If needed in Admin/Staff > Obituaries, fetch from user profiles there too.
4. Tarpaulin image must **not be right-clickable / saveable as image** while status is Pending.
5. Keep the top banner as-is: *"IN MEMORIAM · OBITUARIES · Submit a memorial tarpaulin for your loved one. Our staff will review and publish it."* — must match the style of other pages.

---

## My Bookings

1. Rename status label **"Approved"** → **"Documents Approved"**.
2. Once a payment has been submitted, **"Proceed to Payment"** becomes non-clickable. Replace it with **"Proceed to Pending Payment Review"** — clicking it redirects to **Payments > Pending > Specific Transaction**.
3. Must be **live** — no manual refresh needed.
4. **Pay Extension Fee** button becomes non-clickable once already paid.
5. **View Wake Schedule** — clicking it must highlight the specific wake schedule entry (same behavior as other highlight-on-click items in the system).
6. If status is **Pending** and payment has been submitted, show **"Proceed to Pending Payment Review"** → redirects to **Payments > Pending > Specific Transaction**.

---

## Payments (Client)

### Pending > Specific Transaction > View Linked Submission
- Replace the **"Proceed to Payment"** button with a **"Show Receipt"** button that reflects current payment status:
  1. **Your Payment is Under Review** (not yet accepted by admin/staff) → redirects to **Payments > Pending > Specific Transaction**
  2. **Payment Successful** (accepted by admin/staff) → redirects to **Payments > Approved > Specific Transaction**
  3. **Payment Not Approved** (voided by admin/staff) → redirects to **Payments > Not Approved > Specific Transaction**
- Fix the security gap: this section is accessible via notifications after documents are approved — ensure it no longer allows bypassing the payment flow.
- Wake **Pay Extension Fee** payments must also reflect here (Pending / Approved / Not Approved).

---

## ADMIN

### Overview
1. Must be **live/real-time** — stats update automatically as new data comes in.
2. **Remove**: Paid Invoices and Funds Received (redundant).
3. **Wake extension payments** must be included in Revenue totals.
4. **Total Inquiries** — wake extension must appear in the legend and the entry must be clickable (currently shows in the circle but not in the legend).

### Funeral Services (Admin)
1. Changes made in **Funeral Service Settings** must take effect immediately and reflect live on the client side.
2. Add a **review step** before any price/description/image change goes live.
3. Add **high-level security gate** before entering Funeral Service Settings and before saving any price/description/image change per product type.

### Payments (Admin)
1. Fix **Receipt layout** — overlapping elements. Make receipts formal and professional, including the print/PDF version.
2. **Record Cash Payment** bug — "new row violates row-level security policy for table 'payments'". Fix this. Name field: letters only. Phone number format: **+63 9XX-XXX-XXXX**. Apply same validation rules to all similar fields.
3. Cash payments must appear in the Payments list and update Overview totals **live**.
4. Implement **QR Code upload** for BDO Bank (it has a QR option).
5. Add **high-level security gate** before accessing Payment Receiving Details and before saving any change to any payment receiving detail type.

### Wake Schedule (Admin)
**Schedules columns:**
- 1.1. Deceased
- 1.2. Client (Full Name, Email, Phone Number — email and phone must be clickable to contact/reply; auto-updates when client updates their profile)
- 1.3. Wake Start
- 1.4. Wake End and Time
- 1.5. Wake Location
- 1.6. Burial Location
- 1.7. Status: `Ongoing | X day/s remaining` / `Ended` / `New Request` / `Rejected`
- 1.8. Actions:
  - **Edit**: Edit wake info → dropdown reason (required) for why it's being changed → save triggers client notification (in-app + email)
  - **Notify**: Send notification to client via email using a dropdown template (e.g., "Wake end date approaching", etc.) with review before sending
  - **Add to Calendar**: Add Wake End Date and Time to external calendar (Google Calendar, iPhone Calendar, etc.) for offline reference
  - If wake has lapsed (past Wake End Date and Time): Actions become **View only** (no editing) + **Delete**

2. **New Requests** — merge into the main Schedules table (no separate tab). Status shows as `New Request`. Actions button shows **Review**:
   - Inside Review: can edit info, Approve, or Reject (with required reason)
   - On Approve: client notified in-app + email
   - On Reject: client notified in-app + email with reason
   - After Approve: Actions switch to Edit / Notify / Add to Calendar
   - After Reject: Actions become View only + Delete
   - Wake schedule rows must be **clickable** (highlight on click, usable for admin/staff notification targeting)

3. **Recently Deleted** tab:
   - Can **Recover** or **Permanently Delete**
   - Checkbox support for bulk selection
   - Confirmation review before Recover or Permanent Delete

### Obituaries (Admin)
1. **Edit function** is broken — fix it. #finished
2. **Create Tarp**: #finished
   - Implement client Obituary rules #1 and #2 (Suffix dropdown, no numbers in name fields) #finished
   - Remove Contact Number and Venue/Wake Address fields #finished
   - **Publish Immediately** toggle: if ON → publish immediately; if OFF → Save as Draft #finished
   - **Publish To**: Dropdown (Client Name – Email) with a review step before creating #finished
3. **Recently Deleted**: Add checkbox for bulk deletion. #finished

### Columbarium (Admin)
1. Price changes must take effect **immediately and live** on the client side — no refresh needed. #finished
2. Slot status changes (Reserved / Occupied / Available) must reflect **live** on client and landing page — no refresh needed. #finished
3. Phone number format: **+63 9XX-XXX-XXXX** #finished
4. Fix **"new row violates row-level security policy for table 'payments'"** bug. #finished
5. Columbarium payments must appear in Payments and update Overview totals **live**. #finished
6. Add **level of security** before accessing and saving price changes. #finished