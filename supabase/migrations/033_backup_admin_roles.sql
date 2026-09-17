-- ============================================================
-- Migration 033: Set backup admin accounts to admin role
--
-- The 3 default backup admin accounts are created via Supabase
-- auth but the handle_new_user trigger sets all new users to
-- 'client' by default. This migration corrects their role to
-- 'admin' so they appear correctly in the Profiles tab.
-- ============================================================

UPDATE public.profiles
SET role = 'admin'
WHERE email IN (
  'ememoria@admin.com',
  'ememoria2@admin.com',
  'ememoria3@admin.com'
)
AND role != 'admin';
