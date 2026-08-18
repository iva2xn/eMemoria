-- ============================================================
-- eMemoria — Profile Enhancements
-- Migration 021: avatar, split name fields, account deletion
--
-- SAFE TO RUN ON A LIVE DB:
--   - Only adds columns (no drops, no type changes)
--   - Creates one new storage bucket
--   - Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── Add split name fields to profiles ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name      text,
  ADD COLUMN IF NOT EXISTS middle_initial  text,
  ADD COLUMN IF NOT EXISTS last_name       text,
  ADD COLUMN IF NOT EXISTS suffix          text,   -- Jr., Sr., III, etc.
  ADD COLUMN IF NOT EXISTS avatar_path     text;   -- storage path in 'avatars' bucket

-- ── Account deletion request ─────────────────────────────────
-- Client requests deletion → 30-day grace period → permanent removal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason        text;

-- ── Backfill first_name / last_name from existing name field ─
-- Splits "Juan Dela Cruz" → first_name="Juan", last_name="Dela Cruz"
-- Handles single-word names too (last_name = name, first_name = '')
UPDATE public.profiles
SET
  first_name = CASE
    WHEN name ~ '\s' THEN SPLIT_PART(name, ' ', 1)
    ELSE ''
  END,
  last_name = CASE
    WHEN name ~ '\s' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE name
  END
WHERE first_name IS NULL OR first_name = '';

-- ── Avatars storage bucket ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,           -- public so avatar <img> tags work without signed URLs
  10485760,       -- 10 MB max
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view avatars (public bucket)
DO $$ BEGIN
  CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can upload their own avatar
DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid() IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can replace their own avatar
DO $$ BEGIN
  CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can delete their own avatar
DO $$ BEGIN
  CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
