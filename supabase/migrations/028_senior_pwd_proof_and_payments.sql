-- ============================================================
-- Migration 028: Senior/PWD proof upload + payments discount
--
-- 1. Add doc_senior_pwd_proof column to document_submissions
--    (stores the storage path for the uploaded proof image)
-- 2. Add senior_pwd_discount + doc_senior_pwd_proof to payments
--
-- SAFE TO RUN ON A LIVE DB — only additive changes
-- ============================================================

-- 1. Senior/PWD proof upload path on document submissions
ALTER TABLE public.document_submissions
  ADD COLUMN IF NOT EXISTS doc_senior_pwd_proof text;

-- 2. Senior/PWD on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS senior_pwd_discount  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doc_senior_pwd_proof text;
