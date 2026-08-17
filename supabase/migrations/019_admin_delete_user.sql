-- ============================================================
-- Migration 019: Admin Delete User RPC
--
-- Creates a SECURITY DEFINER function that lets an admin
-- delete a user from auth.users (which cascades to profiles).
-- Only callable when the invoking session is an admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only admins may call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete user accounts';
  END IF;

  -- Remove from Supabase Auth — cascades to public.profiles via FK
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Only authenticated users can invoke it (the guard inside checks for admin role)
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
