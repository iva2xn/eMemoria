-- ============================================================
-- Migration 036: Add deceased info + place of death to document_submissions
--
-- Adds fields to document_submissions for:
--   - Deceased's name (first, middle initial, last, suffix)
--   - Place of death (free text, used for wake schedule pre-fill)
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

ALTER TABLE public.document_submissions
  ADD COLUMN IF NOT EXISTS deceased_first_name   text,
  ADD COLUMN IF NOT EXISTS deceased_middle_initial text,
  ADD COLUMN IF NOT EXISTS deceased_last_name    text,
  ADD COLUMN IF NOT EXISTS deceased_suffix       text,
  ADD COLUMN IF NOT EXISTS place_of_death        text;
