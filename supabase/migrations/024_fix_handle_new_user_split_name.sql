-- ============================================================
-- Migration 024: Fix handle_new_user trigger
--
-- Problem: When a new account is created, first_name, last_name,
-- middle_initial, and suffix were not being written to the profiles
-- table because the trigger was not updated after migration 021
-- added those columns.
--
-- Fix: Update handle_new_user to also insert the split name fields
-- from auth metadata (set by the register form).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    phone,
    role,
    first_name,
    middle_initial,
    last_name,
    suffix
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'client',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'middle_initial',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'suffix'
  );
  RETURN NEW;
END;
$$;
