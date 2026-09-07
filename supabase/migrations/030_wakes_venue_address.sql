-- ============================================================
-- Migration 030: Add venue_address to wakes
--
-- The wake venue (where the body lies in state) belongs on the
-- wake schedule, not the memorial tarpaulin submission form.
-- This column lets admin/staff set it when editing a wake record.
-- ============================================================

ALTER TABLE public.wakes
  ADD COLUMN IF NOT EXISTS venue_address text;

COMMENT ON COLUMN public.wakes.venue_address IS
  'Address where the wake / vigil is held (e.g. house address, chapel). Shown on tarpaulin.';
