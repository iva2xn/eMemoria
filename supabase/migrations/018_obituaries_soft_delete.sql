-- ============================================================
-- Migration 018: Obituaries Soft Delete
--
-- Adds soft-delete audit columns to obituaries so that
-- admin-deleted records can be kept in a "Recently Deleted"
-- tab for 30 days before being permanently removed.
-- ============================================================

ALTER TABLE public.obituaries
  ADD COLUMN IF NOT EXISTS delete_reason   text,
  ADD COLUMN IF NOT EXISTS delete_comment  text,
  ADD COLUMN IF NOT EXISTS deleted_by      uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;
