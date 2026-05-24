# Database ERD — Entity Relationship Diagram

An ERD shows every table, what columns they have, and how they connect to each other.

---

## Tables and their relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                         auth.users (Supabase)                       │
│  id (uuid) PK                                                       │
│  email                                                              │
│  raw_user_meta_data                                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 1
                               │ trigger: handle_new_user()
                               │ creates one profile per user
                               ▼ 1
┌──────────────────────────────────────────────────────────────────────┐
│                            profiles                                  │
│  id (uuid) PK  ←── FK to auth.users.id                              │
│  name          text                                                  │
│  email         text  UNIQUE                                          │
│  role          enum  'client' | 'staff' | 'admin'                   │
│  created_at                                                          │
│  updated_at                                                          │
└────┬──────────────────────────────────────────────────────┬──────────┘
     │ 1                                                    │ 1
     │                                                      │
     │ 0..*                                                 │ 0..*
     ▼                                                      ▼
┌─────────────────────────┐              ┌──────────────────────────────┐
│         bookings        │              │          payments             │
│  id (uuid) PK           │              │  id (uuid) PK                │
│  user_id  FK → profiles │◄─────────────│  user_id  FK → profiles      │
│  guest_name             │  booking_id  │  guest_name                  │
│  guest_email            │◄─────────────│  guest_email                 │
│  guest_phone            │              │  guest_phone                 │
│  package_name           │              │  booking_id FK → bookings    │
│  price                  │              │  product_type  text          │
│  status  enum           │              │  product_ref   text          │
│  notes                  │              │  method  enum                │
│  created_at             │              │  reference_number            │
│  updated_at             │              │  amount                      │
└─────────────────────────┘              │  receipt_file_path           │
                                         │  status  enum                │
                                         │  approved_by FK → profiles   │
                                         │  approved_at                 │
                                         │  created_at                  │
                                         │  updated_at                  │
                                         └──────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         columbarium_slots                            │
│  id (uuid) PK                                                        │
│  row_number  smallint  (1–6)                                         │
│  col_number  smallint  (1–12)                                        │
│  slot_code   text  UNIQUE  e.g. "R2C05"                              │
│  price       numeric                                                 │
│  status      enum  'available' | 'reserved' | 'occupied'            │
│  occupant_name                                                       │
│  occupant_birth_date                                                 │
│  occupant_death_date                                                 │
│  reserved_by_user_id  FK → profiles  (nullable)                     │
│  reserved_at                                                         │
│  created_at / updated_at                                             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                            inquiries                                 │
│  id (uuid) PK                                                        │
│  name    text                                                        │
│  email   text                                                        │
│  subject text                                                        │
│  message text                                                        │
│  is_read boolean  DEFAULT false                                      │
│  created_at                                                          │
│  (no FK — anyone can submit, no account needed)                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                            obituaries                                │
│  id (uuid) PK                                                        │
│  full_name       text                                                │
│  birth_date      date                                                │
│  death_date      date                                                │
│  age             smallint                                            │
│  image_path      text  (Supabase Storage path)                       │
│  venue_address   text                                                │
│  contact_number  text                                                │
│  submitter_name  text  (nullable)                                    │
│  submitter_email text  (nullable)                                    │
│  created_by  FK → profiles  (nullable)                              │
│  is_published  boolean  DEFAULT false                                │
│  created_at / updated_at                                             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           payment_info                               │
│  id  int  PK  DEFAULT 1  (singleton — always exactly one row)        │
│  gcash_name          text                                            │
│  gcash_number        text                                            │
│  gcash_qr_path       text  (Storage path)                            │
│  bank1_name / bank1_account_name / bank1_account_number             │
│  bank2_name / bank2_account_name / bank2_account_number             │
│  bank3_name / bank3_account_name / bank3_account_number             │
│  bank4_name / bank4_account_name / bank4_account_number             │
│  updated_at                                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Relationship summary

| From | To | Type | Notes |
|---|---|---|---|
| auth.users | profiles | 1-to-1 | trigger auto-creates profile on signup |
| profiles | bookings | 1-to-many | nullable — guests have no user_id |
| profiles | payments | 1-to-many | nullable — guests have no user_id |
| bookings | payments | 1-to-many | payment.booking_id links back |
| profiles | columbarium_slots | 1-to-many | reserved_by_user_id (nullable) |
| profiles | obituaries | 1-to-many | created_by (nullable) |
| inquiries | (none) | standalone | no FK, open submission |
| payment_info | (none) | singleton | config table, no FK |

---

## Storage buckets (not SQL tables, but part of the data model)

| Bucket | Public | Used for |
|---|---|---|
| `obituaries` | Yes | Deceased photos for tarp previews |
| `payments` | No | Receipt screenshots from clients |
| `payment-info` | Yes | GCash QR code image |
