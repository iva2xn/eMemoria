-- ============================================================
-- Migration 008: obituaries — tarp/event fields
-- Adds venue, contact, and submitter info for tarp generation.
-- NOTE: Run in Supabase SQL Editor before deploying.
-- ============================================================

ALTER TABLE public.obituaries
  ADD COLUMN IF NOT EXISTS venue_address   text,
  ADD COLUMN IF NOT EXISTS contact_number  text,
  ADD COLUMN IF NOT EXISTS submitter_name  text,
  ADD COLUMN IF NOT EXISTS submitter_email text;

-- Allow guest (unauthenticated) obituary submissions
CREATE POLICY "Anyone can submit an obituary"
  ON public.obituaries FOR INSERT
  WITH CHECK (true);
