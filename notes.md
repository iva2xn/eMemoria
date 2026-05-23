# Dev Notes

## Bug Fix: Payment Approval Marking All Bookings as Paid

**File:** `app/admin/page.tsx` — `BookingsTab`

**Date:** 2026-05-23

---

### What Was Wrong

The old logic built two flat sets from all approved payments:

```ts
const approvedEmails  = new Set<string>() // all approved guest_emails
const approvedUserIds = new Set<string>() // all approved user_ids
```

Then for each booking it just checked:

```ts
isPaid = approvedEmails.has(b.guest_email.toLowerCase())
// or
isPaid = approvedUserIds.has(b.user_id)
```

This meant approving **any one payment** for a person would mark **every booking** that person had as paid — regardless of which booking the payment was actually for.

---

### The Fix — Three-Tier Matching

**1. Direct `booking_id` match (most precise)**
If the payment row has a `booking_id` that matches the booking's `id`, it's a confirmed link. This is the correct path for all payments going forward.

```ts
if (approvedByBookingId.has(b.id)) isPaid = true
```

**2. `(identity + product_ref)` fallback**
For older payments without a `booking_id`, match on a composite key of `guest_email|product_ref` or `user_id|product_ref`. This scopes the match to a specific product so approving one item doesn't bleed into unrelated bookings for the same person.

```ts
approvedByEmailRef.add(`${p.guest_email.toLowerCase()}|${ref}`)
approvedByUserRef.add(`${p.user_id}|${ref}`)
```

**3. No match → unpaid**
If neither condition is met, the booking stays unpaid.

---

### Recommended Long-Term Fix

The billing form (`app/billing/page.tsx`) inserts a payment and a booking in the same submit handler but **does not write the `booking_id` back onto the payment row**. Wiring that up would make tier-1 matching work for all new records and eliminate the need for the fallback entirely.

```ts
// In handleSubmit — after inserting the booking, get its id and update the payment
const { data: booking } = await supabase.from('bookings').insert({...}).select('id').single()
await supabase.from('payments').update({ booking_id: booking.id }).eq('id', paymentId)
```
