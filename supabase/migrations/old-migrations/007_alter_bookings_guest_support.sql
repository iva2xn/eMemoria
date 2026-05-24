-- ============================================================
-- Migration 007: bookings — guest support
-- Allows unauthenticated (guest) users to submit bookings
-- without requiring a profiles account.
-- NOTE: This migration has already been applied directly via
-- the Supabase SQL Editor. This file exists for version control.
-- ============================================================

-- Make user_id optional to support guest bookings
ALTER TABLE public.bookings
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name  text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text;

-- Allow anonymous (guest) inserts
CREATE POLICY "Guests can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND user_id IS NULL);

-- Fix admin select policy (drop old one, create clean version)
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
