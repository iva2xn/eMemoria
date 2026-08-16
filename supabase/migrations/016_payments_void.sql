-- ============================================================
-- Migration 016: Add void support to payments
--
-- Changes:
--   1. Extend payment_status enum with 'voided'
--   2. Add void metadata columns to payments table
--
-- SAFE TO RUN ON A LIVE DB:
--   - ALTER TYPE … ADD VALUE is non-destructive
--   - ADD COLUMN with defaults is non-destructive
-- ============================================================

-- 1. Extend the enum (Postgres 9.1+, non-destructive)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'voided';

-- 2. Add void audit columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS void_reason   text,
  ADD COLUMN IF NOT EXISTS void_comment  text,
  ADD COLUMN IF NOT EXISTS voided_by     uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_at     timestamptz;
