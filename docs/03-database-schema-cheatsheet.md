# Database Schema Cheat Sheet

Quick reference for every table — columns, types, and what they're for.

---

## profiles
> One row per registered user. Linked to Supabase's auth system.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Same as auth.users.id |
| name | text | Full name from registration |
| email | text UNIQUE | Login email |
| role | enum | `client` / `staff` / `admin` |
| created_at | timestamptz | Auto-set on insert |
| updated_at | timestamptz | Auto-updated by trigger |

---

## columbarium_slots
> The 6×12 grid of niches. Pre-seeded with 72 rows.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| row_number | smallint | 1–6 (1 = top, 6 = ground) |
| col_number | smallint | 1–12 |
| slot_code | text UNIQUE | e.g. `R2C05` |
| price | numeric(10,2) | Varies by row |
| status | enum | `available` / `reserved` / `occupied` |
| occupant_name | text | Filled when occupied |
| occupant_birth_date | date | Filled when occupied |
| occupant_death_date | date | Filled when occupied |
| occupant_age | smallint | Filled when occupied |
| occupant_photo_url | text | Storage path |
| occupant_notes | text | Any extra info |
| reserved_by_user_id | uuid FK | → profiles (nullable) |
| reserved_at | timestamptz | When reservation was made |
| created_at / updated_at | timestamptz | Auto-managed |

---

## inquiries
> Contact form submissions. No account needed to submit.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Submitter's name |
| email | text | Submitter's email |
| subject | text | Dropdown selection |
| message | text | Full message body |
| is_read | boolean | Default false; flips when admin opens it |
| created_at | timestamptz | |

---

## bookings
> Service reservations. Auto-created when a payment is submitted.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → profiles (nullable for guests) |
| guest_name | text | Filled if not logged in |
| guest_email | text | Filled if not logged in |
| guest_phone | text | Filled if not logged in |
| package_name | text | e.g. "Traditional Burial Package" |
| price | numeric(10,2) | Amount paid |
| status | enum | `pending` / `active` / `completed` / `cancelled` |
| notes | text | Auto-built from payment details |
| created_at / updated_at | timestamptz | Auto-managed |

---

## payments
> Payment submissions from clients. Admin approves or rejects.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | → profiles (nullable for guests) |
| guest_name / email / phone | text | Filled if not logged in |
| booking_id | uuid FK | → bookings (nullable) |
| product_type | text | `columbarium` / `package` / `cremation` / `urn` / `general` |
| product_ref | text | Slot code or package name |
| method | enum | `gcash` / `bdo_bank` / `bpi_bank` / `cash` |
| reference_number | text | GCash/bank transaction ref |
| amount | numeric(10,2) | Must be > 0 |
| receipt_file_path | text | Storage path to uploaded receipt |
| status | enum | `pending` / `approved` / `rejected` |
| notes | text | Auto-built (level, fees, etc.) |
| approved_by | uuid FK | → profiles (nullable) |
| approved_at | timestamptz | When admin approved |
| created_at / updated_at | timestamptz | Auto-managed |

---

## obituaries
> Memorial tarp records. Must be published by admin before going live.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| full_name | text | Deceased's full name |
| birth_date | date | |
| death_date | date | |
| age | smallint | |
| image_path | text | Storage path (default: placeholder) |
| venue_address | text | Wake location for the tarp |
| contact_number | text | Family contact shown on tarp |
| submitter_name | text | Who submitted (optional) |
| submitter_email | text | For follow-up (optional) |
| created_by | uuid FK | → profiles (nullable) |
| is_published | boolean | Default false — admin must publish |
| created_at / updated_at | timestamptz | Auto-managed |

---

## payment_info
> Single-row config table for GCash and bank details.

| Column | Type | Notes |
|---|---|---|
| id | int PK | Always 1 (singleton) |
| gcash_name | text | Account holder name |
| gcash_number | text | GCash number |
| gcash_qr_path | text | Storage path to QR image |
| bank1_name | text | Bank name (e.g. BDO) |
| bank1_account_name | text | Account holder |
| bank1_account_number | text | Account number |
| bank2–4 | text × 3 | Same structure, up to 4 banks |
| updated_at | timestamptz | Auto-updated by trigger |

---

## Enums quick reference

```sql
user_role:      client | staff | admin
slot_status:    available | reserved | occupied
booking_status: pending | active | completed | cancelled
payment_status: pending | approved | rejected
payment_method: gcash | bdo_bank | bpi_bank | cash
```

---

## Indexes

| Table | Index | Purpose |
|---|---|---|
| columbarium_slots | (row_number, col_number) UNIQUE | Prevent duplicate grid positions |
| bookings | user_id, status | Fast lookups by user and status |
| payments | user_id, status, booking_id | Fast lookups and joins |
| obituaries | (is_published, created_at DESC) | Fast public page query |
