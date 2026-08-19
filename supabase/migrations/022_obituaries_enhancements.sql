-- ============================================================
-- Migration 022: Obituaries Enhancements
--
-- 1. Add user_id FK so submissions are linked to the submitter
-- 2. Add is_approved column (separate from is_published)
--    Flow: submitted → approved by admin → published
-- ============================================================

ALTER TABLE public.obituaries
  ADD COLUMN IF NOT EXISTS user_id     uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Index for per-user queries
CREATE INDEX IF NOT EXISTS obituaries_user_id_idx
  ON public.obituaries (user_id, created_at DESC);

-- ── RLS: owners can see their own obituaries (published or not) ──
-- Drop old blanket policy and replace with a combined one
DROP POLICY IF EXISTS "Anyone can view published obituaries" ON public.obituaries;

CREATE POLICY "Anyone can view published obituaries"
  ON public.obituaries FOR SELECT
  USING (
    is_published = true
    OR auth.uid() = user_id          -- owner sees their own regardless of status
    OR public.is_staff_or_admin()    -- staff/admin see all
  );

-- Anyone (guests too) can still submit — existing policy unchanged
-- Staff/admins can manage all — existing policy unchanged
