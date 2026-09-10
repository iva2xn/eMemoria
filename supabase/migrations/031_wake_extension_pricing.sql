-- ============================================================
-- Migration 031: Wake Extension Pricing
--
-- 1. wake_extension_price_config — singleton table, admin-editable
--    price per day for wake date extensions.
--
-- 2. Add wake_id FK to payments so date-extension payments can be
--    linked directly to a wake record.
--
-- 3. Add price_per_day + total_amount to wake_extension_requests
--    so the cost is captured at request time.
-- ============================================================

-- ── 1. Wake extension price config ──────────────────────────
CREATE TABLE IF NOT EXISTS public.wake_extension_price_config (
  id                int       PRIMARY KEY DEFAULT 1,
  price_per_day     numeric(10,2) NOT NULL DEFAULT 500.00,
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  updated_by        uuid          REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT wake_extension_price_singleton CHECK (id = 1)
);

-- Seed the single row
INSERT INTO public.wake_extension_price_config (id, price_per_day)
  VALUES (1, 500.00)
  ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER wake_extension_price_config_updated_at
  BEFORE UPDATE ON public.wake_extension_price_config
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.wake_extension_price_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read the price (needed on billing page)
CREATE POLICY "Anyone can read wake extension price"
  ON public.wake_extension_price_config FOR SELECT
  USING (true);

-- Only admins can update it
CREATE POLICY "Admins can update wake extension price"
  ON public.wake_extension_price_config FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── 2. Add wake_id to payments ───────────────────────────────
-- Links a payment to a wake record (used for date-extension payments)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS wake_id uuid REFERENCES public.wakes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_wake_id_idx ON public.payments (wake_id);


-- ── 3. Add pricing info to wake_extension_requests ──────────
-- Captures the locked-in price at the time of request
ALTER TABLE public.wake_extension_requests
  ADD COLUMN IF NOT EXISTS price_per_day  numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_amount   numeric(10,2),
  ADD COLUMN IF NOT EXISTS days_requested int;
