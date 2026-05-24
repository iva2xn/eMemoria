# Billing Page (`/billing`)

## What this page does
Payment submission form. Clients fill in their contact info, choose a payment method, upload a receipt, and submit. The page also handles columbarium reservations, urn purchases, and package bookings.

## Auth gate
```
Page loads
    ↓
supabase.auth.getUser()
    ↓
Not logged in → AuthGateModal appears (blocked yung form)
               User must Sign In or Register first for all payments

Logged in    → Pre-fill name + email from their profile
               Form is usable
```

## URL params (set by other pages)
| Param | Example | Meaning |
|---|---|---|
| `product` | `columbarium` | What they're paying for |
| `slot` | `R2C05` | Columbarium slot code |
| `level` | `Eye Level (Upper)` | Row label |
| `price` | `35000` | Full price |
| `label` | `Traditional Burial Package` | Display name |

## Amount calculation
```
product = columbarium → amount = price × 10%  (reservation fee only)
product = urn         → amount = urn price + ₱25,000 service fee
                        (toggle to remove service fee)
anything else         → amount = price from URL param
                        (locked, can't be changed)
```

## Submit flow
```
User fills form → clicks Submit Payment
      ↓
Validation:
  name, email, phone required
  reference number required (unless cash)
  amount > 0
      ↓
Upload receipt (if provided):
  supabase.storage.upload('payments', file)
  → receiptPath saved
      ↓
INSERT payments {
  user_id, guest_name, guest_email, guest_phone,
  product_type, product_ref, method,
  reference_number, amount, receipt_file_path,
  notes (auto-built from level/price/fee info),
  status: 'pending'
}
      ↓
Auto-create booking (if not urn-only):
INSERT bookings {
  user_id / guest info,
  package_name, price,
  status: 'pending'
}
      ↓
product = 'package' → show ObituaryModal (tarp details)
anything else       → redirect to /?payment=success
```

## ObituaryModal (package purchases only)
```
Shown after ng payment submission for traditional burial package
      ↓
User fills deceased info + uploads photo
supabase.storage.upload('obituaries', photo)
INSERT obituaries { ..., is_published: false }
      ↓
Admin reviews and publishes from the admin panel
      ↓
User clicks Continue → redirect to /?payment=success
User clicks Skip     → redirect to /?payment=success
```

## Payment sidebar
Reads `payment_info` table (id=1) and shows:
- GCash QR code + account name + number
- Up to 4 bank accounts
- Help contact info

This is read-only on the billing page. Admins edit it from the admin panel.
