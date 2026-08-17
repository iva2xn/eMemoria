-- ============================================================
-- Migration 017: Document Submissions Enhancements
--
-- 1. Add 'deleted' to document_submission_status enum
-- 2. Add soft-delete audit columns
-- 3. Add senior/PWD discount columns
--
-- SAFE TO RUN ON A LIVE DB — only additive changes
-- ============================================================

-- 1. Extend enum
ALTER TYPE public.document_submission_status ADD VALUE IF NOT EXISTS 'deleted';

-- 2. Soft-delete columns
ALTER TABLE public.document_submissions
  ADD COLUMN IF NOT EXISTS delete_reason   text,
  ADD COLUMN IF NOT EXISTS delete_comment  text,
  ADD COLUMN IF NOT EXISTS deleted_by      uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;

-- 3. Senior/PWD discount
ALTER TABLE public.document_submissions
  ADD COLUMN IF NOT EXISTS senior_pwd_discount boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discounted_price     numeric(10,2);
