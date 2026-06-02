-- ============================================================
-- eMemoria — M. P. Gayeta Funeral Services
-- FULL DATABASE SCHEMA  (single consolidated migration)
--
-- What is this file?
--   This is a SQL migration file. It creates every table,
--   function, trigger, and security rule the app needs.
--   Run this once on a fresh Supabase project and the whole
--   database is ready to go.
--
-- What is a migration?
--   A migration is just a script that sets up or changes your
--   database. Instead of clicking around in a GUI, you write
--   SQL so the setup is repeatable and version-controlled.
--
-- How to run it:
--   Supabase Dashboard → SQL Editor → paste this file → Run
--   OR: supabase db push  (if using the Supabase CLI)
--
-- Table of contents:
--   1.  Shared helpers        (reusable functions + triggers)
--   2.  profiles              (user accounts)
--   3.  columbarium_slots     (the 6×12 niche grid)
--   4.  inquiries             (contact form submissions)
--   5.  bookings              (service reservations)
--   6.  document_submissions  (pre-payment document review)
--   7.  payments              (payment submissions)
--   8.  obituaries            (tarp / memorial records)
--   9.  payment_info          (GCash + bank details, single row)
--   10. Storage buckets       (file uploads)
-- ============================================================


-- ============================================================
-- 1. SHARED HELPERS
-- ============================================================

-- ── What is an ENUM? ─────────────────────────────────────────
-- An enum is a column type that only accepts a fixed list of
-- values. Like a dropdown — you can't put anything else in.

-- Roles a user can have in the system
CREATE TYPE public.user_role AS ENUM (
  'client',   -- regular user (default)
  'staff',    -- funeral home employee — can view/manage most things
  'admin'     -- full access including approving payments and changing roles
);

-- Possible statuses for a columbarium slot
CREATE TYPE public.slot_status AS ENUM (
  'available',  -- open, can be reserved
  'reserved',   -- someone has paid a reservation fee, pending confirmation
  'occupied'    -- permanently assigned to a deceased
);

-- Possible statuses for a service booking
CREATE TYPE public.booking_status AS ENUM (
  'pending',    -- just submitted, waiting for staff to confirm
  'active',     -- service is in progress / confirmed
  'completed',  -- service has been fully rendered
  'cancelled'   -- booking was cancelled
);

-- Possible statuses for a payment submission
CREATE TYPE public.payment_status AS ENUM (
  'pending',    -- submitted by client, waiting for admin to verify
  'approved',   -- admin confirmed the payment
  'rejected'    -- admin rejected it (wrong amount, fake receipt, etc.)
);

-- Status enum for document submission workflow
CREATE TYPE public.document_submission_status AS ENUM (
  'pending_review',  -- submitted, waiting for staff to check docs
  'approved',        -- docs verified, customer may proceed to payment
  'rejected'         -- docs rejected, reason stored in rejection_reason
);

-- Payment methods clients can use
CREATE TYPE public.payment_method AS ENUM (
  'gcash',      -- GCash mobile wallet
  'bdo_bank',   -- BDO bank transfer
  'bpi_bank',   -- BPI bank transfer
  'cash'        -- cash paid at the counter (recorded by staff)
);

-- ── set_updated_at ───────────────────────────────────────────
-- A trigger function that automatically sets the updated_at
-- column to the current time whenever a row is changed.
-- We attach this to every table that has an updated_at column.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── is_admin ─────────────────────────────────────────────────
-- Returns true if the currently logged-in user is an admin.
-- SECURITY DEFINER means it runs as the function owner (bypasses
-- RLS) so it can read profiles without causing infinite loops.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ── is_staff_or_admin ────────────────────────────────────────
-- Returns true if the current user is staff OR admin.
-- Most management features are available to both roles.
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$;


-- ============================================================
-- 2. PROFILES
-- ============================================================
-- What is this table?
--   Supabase gives us an auth.users table for login info
--   (email, password hash, etc.) but we can't add custom
--   columns to it. So we create our own profiles table that
--   mirrors it — one row per user — and store app-specific
--   data like name and role here.
--
-- The link: profiles.id = auth.users.id  (same UUID)
-- ============================================================

CREATE TABLE public.profiles (
  -- id matches the auth.users row exactly (same UUID)
  id          uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text        NOT NULL UNIQUE,

  -- role controls what the user can do in the admin panel
  -- starts as 'client'; admins can promote to 'staff' or 'admin'
  role        user_role   NOT NULL DEFAULT 'client',

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every change
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── Auto-create profile on sign-up ───────────────────────────
-- When someone registers via Supabase Auth, this trigger fires
-- and inserts a matching row in profiles automatically.
-- The name comes from the metadata the register form sends.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Guard: only admins can change someone's role ─────────────
-- This trigger runs before any profile update. If the role
-- column is being changed, it checks that the caller is an
-- admin. Staff and clients cannot promote themselves.
CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- auth.uid() is NULL when the Supabase dashboard or CLI runs
    -- the migration — allow those through unconditionally.
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.guard_role_change();

-- ── RLS (Row Level Security) ──────────────────────────────────
-- What is RLS?
--   By default, anyone with the database URL can read/write
--   everything. RLS lets you add per-row rules so users can
--   only see and change what they're allowed to.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- A user can always read and update their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Staff and admins can read all profiles (needed for the admin panel)
CREATE POLICY "Staff and admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff_or_admin());


-- ============================================================
-- 3. COLUMBARIUM SLOTS
-- ============================================================
-- What is this table?
--   The columbarium is a 6-row × 12-column grid of niches
--   (small compartments that hold cremation urns).
--   Each slot has a code like "R2C05" (row 2, column 5),
--   a price, a status, and optional occupant details.
--
-- The 72 slots are seeded at the bottom of this section.
-- ============================================================

CREATE TABLE public.columbarium_slots (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grid position — row 1 is top, row 6 is ground level
  row_number  smallint    NOT NULL CHECK (row_number BETWEEN 1 AND 6),
  col_number  smallint    NOT NULL CHECK (col_number BETWEEN 1 AND 12),

  -- Human-readable code shown in the UI, e.g. "R1C03"
  slot_code   text        NOT NULL UNIQUE,

  -- Price varies by row (eye-level rows cost more)
  price       numeric(10,2) NOT NULL,

  -- Current status of the slot
  status      slot_status NOT NULL DEFAULT 'available',

  -- Occupant info — only filled when status = 'occupied'
  occupant_name       text,
  occupant_birth_date date,
  occupant_death_date date,
  occupant_age        smallint,
  occupant_photo_url  text,   -- Supabase Storage path
  occupant_notes      text,

  -- Reservation info — only filled when status = 'reserved'
  reserved_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reserved_at         timestamptz,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Prevent two slots from sharing the same grid position
CREATE UNIQUE INDEX columbarium_slots_grid_idx
  ON public.columbarium_slots (row_number, col_number);

CREATE TRIGGER columbarium_slots_updated_at
  BEFORE UPDATE ON public.columbarium_slots
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.columbarium_slots ENABLE ROW LEVEL SECURITY;

-- Anyone (even guests) can view the grid
CREATE POLICY "Anyone can view slots"
  ON public.columbarium_slots FOR SELECT
  USING (true);

-- Only staff/admins can change slot status or occupant details
CREATE POLICY "Staff and admins can manage slots"
  ON public.columbarium_slots FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- ── Seed: insert all 72 slots ─────────────────────────────────
-- This DO block runs once and fills the grid.
-- Row prices: top=25k, eye-upper=35k, eye-lower=25k, rest=20k
DO $$
DECLARE
  r          smallint;
  c          smallint;
  price_map  numeric(10,2)[];
  slot_code  text;
BEGIN
  price_map := ARRAY[25000, 35000, 25000, 20000, 20000, 20000];

  FOR r IN 1..6 LOOP
    FOR c IN 1..12 LOOP
      slot_code := 'R' || r || 'C' || LPAD(c::text, 2, '0');
      INSERT INTO public.columbarium_slots (row_number, col_number, slot_code, price)
      VALUES (r, c, slot_code, price_map[r]);
    END LOOP;
  END LOOP;
END;
$$;


-- ============================================================
-- 4. INQUIRIES
-- ============================================================
-- What is this table?
--   Every message submitted through the Contact page lands
--   here. Staff read them in the admin panel and reply by
--   email. is_read tracks whether someone has opened it.
-- ============================================================

CREATE TABLE public.inquiries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  subject     text        NOT NULL,
  message     text        NOT NULL,

  -- Flips to true when a staff member opens the inquiry
  is_read     boolean     NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now()
  -- No updated_at needed — inquiries are never edited, only read
);

-- RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (guests included) can submit a contact form
CREATE POLICY "Anyone can submit an inquiry"
  ON public.inquiries FOR INSERT
  WITH CHECK (true);

-- Only staff/admins can read and mark inquiries
CREATE POLICY "Staff and admins can read inquiries"
  ON public.inquiries FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Staff and admins can mark inquiries read"
  ON public.inquiries FOR UPDATE
  USING (public.is_staff_or_admin());


-- ============================================================
-- 5. BOOKINGS
-- ============================================================
-- What is this table?
--   A booking is created automatically when a client submits
--   a payment for a service (package, columbarium, urn+service).
--   It tracks the service name, price, and current status.
--
-- Guest support:
--   Logged-in users → user_id is set, guest_* columns are null
--   Guest users     → user_id is null, guest_* columns are filled
-- ============================================================

CREATE TABLE public.bookings (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Either user_id (logged-in) or guest_* fields (not logged in)
  user_id     uuid            REFERENCES public.profiles (id) ON DELETE CASCADE,
  guest_name  text,
  guest_email text,
  guest_phone text,

  package_name  text            NOT NULL,
  price         numeric(10,2)   NOT NULL,
  status        booking_status  NOT NULL DEFAULT 'pending',
  notes         text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bookings_user_id_idx ON public.bookings (user_id);
CREATE INDEX bookings_status_idx  ON public.bookings (status);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Logged-in users can see and create their own bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Guests (not logged in) can also create bookings
CREATE POLICY "Guests can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND user_id IS NULL);

-- Staff/admins can see and update all bookings
CREATE POLICY "Staff and admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Staff and admins can update bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_staff_or_admin());


-- ============================================================
-- 6. DOCUMENT SUBMISSIONS
-- ============================================================
-- What is this table?
--   Before a customer can pay for a traditional burial package,
--   they must first submit required documents for staff review.
--   Once approved, they receive an email with a link to the
--   billing page and can proceed to pay.
--
-- Required documents:
--   - Death Certificate
--   - Barangay Indigency
--   - Valid ID
--   - Medico Legal (optional — only if death was non-natural)
--
-- Status flow:
--   pending_review → approved  (staff confirms docs are valid)
--                 → rejected   (staff rejects with a reason)
--
-- Guest support: same pattern as bookings — user_id OR guest_*
-- ============================================================

CREATE TABLE public.document_submissions (
  id  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who submitted — either a logged-in user or a guest
  user_id     uuid  REFERENCES public.profiles (id) ON DELETE CASCADE,
  guest_name  text,
  guest_email text,
  guest_phone text,

  -- What package they want to avail
  product_type  text          NOT NULL,  -- 'package', 'cremation', etc.
  product_ref   text,                    -- package name e.g. 'OMB'
  product_label text,                    -- display label e.g. 'OMB — ₱25,000'
  product_price numeric(10,2),

  -- Required document storage paths (Supabase Storage: 'document-submissions' bucket)
  doc_death_certificate   text,   -- required
  doc_barangay_indigency  text,   -- required
  doc_valid_id            text,   -- required
  doc_medico_legal        text,   -- optional (non-natural death)

  -- Workflow
  status            document_submission_status  NOT NULL DEFAULT 'pending_review',
  rejection_reason  text,                        -- filled when status = 'rejected'
  reviewed_by       uuid  REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at       timestamptz,

  -- Email notification tracking — prevents double-sending
  notified_at  timestamptz,

  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX document_submissions_user_id_idx ON public.document_submissions (user_id);
CREATE INDEX document_submissions_status_idx  ON public.document_submissions (status);

CREATE TRIGGER document_submissions_updated_at
  BEFORE UPDATE ON public.document_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.document_submissions ENABLE ROW LEVEL SECURITY;

-- Logged-in users can view and create their own submissions
CREATE POLICY "Users can view their own document submissions"
  ON public.document_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create document submissions"
  ON public.document_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL));

-- Staff and admins can view and update all submissions
CREATE POLICY "Staff and admins can view all document submissions"
  ON public.document_submissions FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Staff and admins can update document submissions"
  ON public.document_submissions FOR UPDATE
  USING (public.is_staff_or_admin());


-- ============================================================
-- 7. PAYMENTS
-- ============================================================
-- What is this table?
--   When a client submits a payment (GCash, bank, or cash),
--   a row is inserted here with status = 'pending'.
--   An admin then reviews the receipt and approves or rejects.
--
-- Guest support: same pattern as bookings — user_id OR guest_*
--
-- product_type tells us what was paid for:
--   'columbarium' — slot reservation (10% fee)
--   'package'     — traditional burial package
--   'cremation'   — cremation service
--   'urn'         — urn purchase (optionally + service fee)
--   'general'     — anything else
-- ============================================================

CREATE TABLE public.payments (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Either user_id (logged-in) or guest_* fields (not logged in)
  user_id     uuid            REFERENCES public.profiles (id) ON DELETE CASCADE,
  guest_name  text,
  guest_email text,
  guest_phone text,

  -- Optional link to a booking row (set when auto-booking is created)
  booking_id              uuid  REFERENCES public.bookings (id) ON DELETE SET NULL,

  -- Optional link to the document submission that preceded this payment
  document_submission_id  uuid  REFERENCES public.document_submissions (id) ON DELETE SET NULL,

  -- What was paid for
  product_type  text          NOT NULL, -- see values above
  product_ref   text,                   -- slot code, package name, etc.

  -- Payment details
  method              payment_method  NOT NULL,
  reference_number    text,             -- GCash/bank transaction ref
  amount              numeric(10,2)   NOT NULL CHECK (amount > 0),
  receipt_file_path   text,             -- Supabase Storage path to uploaded receipt

  -- Workflow status
  status      payment_status  NOT NULL DEFAULT 'pending',
  notes       text,
  approved_by uuid            REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at timestamptz,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_user_id_idx    ON public.payments (user_id);
CREATE INDEX payments_status_idx     ON public.payments (status);
CREATE INDEX payments_booking_id_idx ON public.payments (booking_id);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Logged-in users can see and submit their own payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Guests can also submit payments
CREATE POLICY "Guests can submit payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND user_id IS NULL);

-- Staff/admins can view all payments
CREATE POLICY "Staff and admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_staff_or_admin());

-- Only admins can approve or reject (update status)
CREATE POLICY "Admins can update payment status"
  ON public.payments FOR UPDATE
  USING (public.is_admin());

-- Staff can insert cash payments (Record Cash Payment feature)
CREATE POLICY "Staff and admins can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_staff_or_admin());


-- ============================================================
-- 8. OBITUARIES
-- ============================================================
-- What is this table?
--   Stores memorial tarpaulin records. Each row has the
--   deceased's info and a photo stored in Supabase Storage.
--
-- is_published controls visibility:
--   false → only visible in the admin panel (draft / pending review)
--   true  → shows up in the public Obituaries page slideshow
--
-- How obituaries are created:
--   1. Visitor submits via the Obituaries page (is_published = false)
--   2. Client submits after a package payment (is_published = false)
--   3. Admin creates directly from the admin panel (can set either)
--   In all cases, an admin must publish it before it goes live.
-- ============================================================

CREATE TABLE public.obituaries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deceased info
  full_name   text        NOT NULL,
  birth_date  date,
  death_date  date,
  age         smallint,

  -- Photo stored in the 'obituaries' Supabase Storage bucket
  -- Default path used when no photo is uploaded
  image_path  text        NOT NULL DEFAULT 'obituaries/placeholder.png',

  -- Wake / tarp details
  venue_address   text,   -- where the wake is held
  contact_number  text,   -- family contact for the tarp

  -- Who submitted this (optional — guests may leave these blank)
  submitter_name  text,
  submitter_email text,

  -- Admin link (set when an admin creates it directly)
  created_by  uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- Visibility — admin must flip this to true to publish
  is_published  boolean   NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for the public page query (published only, newest first)
CREATE INDEX obituaries_published_idx
  ON public.obituaries (is_published, created_at DESC);

CREATE TRIGGER obituaries_updated_at
  BEFORE UPDATE ON public.obituaries
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.obituaries ENABLE ROW LEVEL SECURITY;

-- Anyone can view published obituaries (the public slideshow)
CREATE POLICY "Anyone can view published obituaries"
  ON public.obituaries FOR SELECT
  USING (is_published = true);

-- Anyone (guests too) can submit an obituary for review
CREATE POLICY "Anyone can submit an obituary"
  ON public.obituaries FOR INSERT
  WITH CHECK (true);

-- Staff/admins can see all (including drafts) and edit/publish
CREATE POLICY "Staff and admins can manage all obituaries"
  ON public.obituaries FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());


-- ============================================================
-- 9. PAYMENT INFO
-- ============================================================
-- What is this table?
--   A single-row config table that stores the funeral home's
--   GCash and bank transfer details. These are shown on the
--   billing page sidebar so clients know where to send money.
--
-- Why a table and not just hardcoded text?
--   Because the admin can update them from the admin panel
--   without touching any code.
--
-- Singleton pattern:
--   The table always has exactly one row (id = 1).
--   The CHECK constraint prevents any other row from being added.
-- ============================================================

CREATE TABLE public.payment_info (
  -- Locked to a single row — id must always be 1
  id  int  PRIMARY KEY DEFAULT 1,

  -- GCash details
  gcash_name    text  NOT NULL DEFAULT '',
  gcash_number  text  NOT NULL DEFAULT '',
  -- Path to the QR code image in Supabase Storage
  -- e.g. "payment-info/gcash-qr.png"
  gcash_qr_path text,

  -- Up to 4 bank accounts (name, account holder, account number)
  bank1_name            text NOT NULL DEFAULT '',
  bank1_account_name    text NOT NULL DEFAULT '',
  bank1_account_number  text NOT NULL DEFAULT '',

  bank2_name            text NOT NULL DEFAULT '',
  bank2_account_name    text NOT NULL DEFAULT '',
  bank2_account_number  text NOT NULL DEFAULT '',

  bank3_name            text NOT NULL DEFAULT '',
  bank3_account_name    text NOT NULL DEFAULT '',
  bank3_account_number  text NOT NULL DEFAULT '',

  bank4_name            text NOT NULL DEFAULT '',
  bank4_account_name    text NOT NULL DEFAULT '',
  bank4_account_number  text NOT NULL DEFAULT '',

  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- This constraint enforces the singleton — id can only ever be 1
  CONSTRAINT payment_info_singleton CHECK (id = 1)
);

-- Seed the one and only row so it always exists
-- ON CONFLICT DO NOTHING means re-running this file won't break anything
INSERT INTO public.payment_info (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER payment_info_updated_at
  BEFORE UPDATE ON public.payment_info
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.payment_info ENABLE ROW LEVEL SECURITY;

-- Everyone (guests included) can read payment details
-- so the billing page sidebar always shows the QR and bank info
CREATE POLICY "Anyone can read payment info"
  ON public.payment_info FOR SELECT
  USING (true);

-- Only admins can edit GCash / bank details
CREATE POLICY "Admins can update payment info"
  ON public.payment_info FOR UPDATE
  USING (public.is_admin());


-- ============================================================
-- 10. STORAGE BUCKETS
-- ============================================================
-- What are storage buckets?
--   Supabase Storage is like a file hosting service built into
--   your project. Buckets are folders. We use four:
--
--   obituaries            — photos of the deceased for tarp generation
--   document-submissions  — sensitive legal documents (private)
--   payments              — receipt screenshots uploaded by clients
--   payment-info          — the GCash QR code image (public)
--
-- Public vs private:
--   public = true  → anyone with the URL can view the file
--   public = false → requires auth (we handle this via policies)
-- ============================================================

-- Obituary photos bucket (public so tarp previews load without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obituaries',
  'obituaries',
  true,
  5242880,  -- 5 MB max per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Document submissions bucket (private — sensitive legal documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-submissions',
  'document-submissions',
  false,
  10485760,  -- 10 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Payment receipts bucket (private — only staff/admins should see these)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payments',
  'payments',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- GCash QR code bucket (public so the billing page can show the QR)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-info',
  'payment-info',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage policies: obituaries bucket ──────────────────────
-- Anyone can read (photos are public for the slideshow)
CREATE POLICY "Public read obituaries bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'obituaries');

-- Anyone can upload (guests submit obituaries too)
CREATE POLICY "Anyone can upload obituary photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'obituaries');

-- Staff/admins can delete or replace photos
CREATE POLICY "Staff and admins can manage obituary photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'obituaries'
    AND public.is_staff_or_admin()
  );

-- ── Storage policies: payments bucket ────────────────────────
-- Anyone can upload their own receipt
CREATE POLICY "Anyone can upload payment receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payments');

-- Only staff/admins can view receipts
CREATE POLICY "Staff and admins can view receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payments'
    AND public.is_staff_or_admin()
  );

-- ── Storage policies: document-submissions bucket ────────────
-- Anyone can upload their own documents
CREATE POLICY "Anyone can upload submission documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'document-submissions');

-- Only staff/admins can view submitted documents
CREATE POLICY "Staff and admins can view submission documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'document-submissions'
    AND public.is_staff_or_admin()
  );

-- ── Storage policies: payment-info bucket ────────────────────
-- Anyone can read the QR code (it's public)
CREATE POLICY "Public read payment-info bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-info');

-- Only admins can upload/replace/delete the QR image
CREATE POLICY "Admins can upload payment-info"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-info'
    AND public.is_admin()
  );

CREATE POLICY "Admins can update payment-info"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-info'
    AND public.is_admin()
  );

CREATE POLICY "Admins can delete payment-info"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-info'
    AND public.is_admin()
  );
