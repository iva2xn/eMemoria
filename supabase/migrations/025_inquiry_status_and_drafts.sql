-- ============================================================
-- Migration 025: inquiry status tracking + reply drafts
-- Adds read_at, replied_at timestamps and draft fields
-- ============================================================

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS read_at    timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_body    text,
  ADD COLUMN IF NOT EXISTS draft_subject text;

-- Back-fill read_at for rows already marked is_read
-- (use updated_at as best estimate since we don't have the exact time)
UPDATE public.inquiries
SET read_at = updated_at
WHERE is_read = true AND read_at IS NULL;

COMMENT ON COLUMN public.inquiries.read_at    IS 'Timestamp when the inquiry was first opened/read by staff';
COMMENT ON COLUMN public.inquiries.replied_at IS 'Timestamp when staff opened Gmail to reply (best-effort)';
COMMENT ON COLUMN public.inquiries.draft_body    IS 'Auto-saved custom reply draft body for this inquiry';
COMMENT ON COLUMN public.inquiries.draft_subject IS 'Auto-saved custom reply draft subject for this inquiry';
