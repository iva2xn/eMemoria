-- =================================================================
-- Migration 029: Soft-delete accounts for admin recovery
--
-- Instead of hard-deleting from auth.users, we now:
--   1. Move the profile row into deleted_accounts
--   2. Hard-delete from auth.users (cascades profile FK)
--   3. Provide a restore path: re-invite the user by email
-- =================================================================

-- ── Deleted accounts archive table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id     uuid NOT NULL,          -- was the auth.users / profiles id
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  role            text NOT NULL DEFAULT 'client',
  first_name      text,
  middle_initial  text,
  last_name       text,
  suffix          text,
  deleted_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by_name text,
  delete_reason   text,
  original_created_at timestamptz,
  deleted_at      timestamptz NOT NULL DEFAULT now(),
  restored_at     timestamptz,
  restored_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  restored_by_name text
);

-- Only admins can read / write this table
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_deleted_accounts"
  ON public.deleted_accounts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Updated admin_delete_user: snapshot then hard-delete ─────
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id   uuid,
  reason           text DEFAULT NULL,
  actor_name_in    text DEFAULT 'Admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _actor_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete user accounts';
  END IF;

  SELECT auth.uid() INTO _actor_id;

  -- Snapshot the profile before deletion
  SELECT * INTO _profile FROM public.profiles WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', target_user_id;
  END IF;

  -- Archive to deleted_accounts
  INSERT INTO public.deleted_accounts (
    original_id, name, email, phone, role,
    first_name, middle_initial, last_name, suffix,
    deleted_by, deleted_by_name, delete_reason,
    original_created_at, deleted_at
  ) VALUES (
    _profile.id, _profile.name, _profile.email, _profile.phone, _profile.role,
    _profile.first_name, _profile.middle_initial, _profile.last_name, _profile.suffix,
    _actor_id, actor_name_in, reason,
    _profile.created_at, now()
  );

  -- Hard-delete from auth (cascades to profiles)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text) TO authenticated;

-- ── Mark a deleted_account as restored ──────────────────────
CREATE OR REPLACE FUNCTION public.admin_mark_account_restored(
  deleted_account_id uuid,
  actor_name_in      text DEFAULT 'Admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore accounts';
  END IF;

  UPDATE public.deleted_accounts
  SET
    restored_at      = now(),
    restored_by      = auth.uid(),
    restored_by_name = actor_name_in
  WHERE id = deleted_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_account_restored(uuid, text) TO authenticated;
