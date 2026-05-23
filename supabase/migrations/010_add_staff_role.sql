-- ============================================================
-- Migration 010: staff role
-- Adds a 'staff' role that can do everything admin can except:
--   • approve / reject payments
--   • edit payment_info (GCash / bank details)
--   • upload / replace / delete payment-info storage objects
--   • change user roles (profiles.role)
-- Only admins can change roles.
-- ============================================================

-- ── 1. Extend the enum ───────────────────────────────────────
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';

-- ── 2. Helper: is the caller admin OR staff? ─────────────────
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$;

-- ── 3. profiles ──────────────────────────────────────────────
-- Staff can read all profiles (same as admin)
CREATE POLICY "Staff can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff_or_admin());

-- Only admins can update roles; staff cannot change any profile role
-- (existing "Users can update their own profile" policy stays, but we
--  add a restrictive check: role column may only be changed by admins)
CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the role column is being changed, require admin.
  -- auth.uid() is NULL when using the service role (Supabase dashboard,
  -- migrations, etc.) — allow those through unconditionally.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_change ON public.profiles;
CREATE TRIGGER profiles_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.guard_role_change();

-- ── 4. columbarium_slots ─────────────────────────────────────
-- Staff gets full CRUD (same as admin)
DROP POLICY IF EXISTS "Admins can manage slots" ON public.columbarium_slots;

CREATE POLICY "Admins and staff can manage slots"
  ON public.columbarium_slots FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- ── 5. inquiries ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all inquiries"  ON public.inquiries;
DROP POLICY IF EXISTS "Admins can mark inquiries read" ON public.inquiries;

CREATE POLICY "Admins and staff can view all inquiries"
  ON public.inquiries FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Admins and staff can mark inquiries read"
  ON public.inquiries FOR UPDATE
  USING (public.is_staff_or_admin());

-- ── 6. bookings ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all bookings"   ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings"     ON public.bookings;

CREATE POLICY "Admins and staff can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Admins and staff can update bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_staff_or_admin());

-- ── 7. payments ──────────────────────────────────────────────
-- Staff can VIEW all payments (same as admin)
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

CREATE POLICY "Admins and staff can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_staff_or_admin());

-- Payment APPROVAL (update status) stays admin-only
-- "Admins can update payment status" policy from migration 005 is kept as-is.

-- ── 8. obituaries ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage obituaries" ON public.obituaries;

CREATE POLICY "Admins and staff can manage obituaries"
  ON public.obituaries FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- ── 9. payment_info — stays admin-only (no changes needed) ───
-- The existing "Admins can update payment info" policy already restricts
-- to role = 'admin', so staff cannot edit payment details.

-- ── 10. payment-info storage bucket — stays admin-only ───────
-- Existing storage policies already check role = 'admin'.
-- No changes needed here either.
