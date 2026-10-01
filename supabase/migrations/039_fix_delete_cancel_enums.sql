-- ================================================================
-- Migration 039: Fix account-deletion cancellation of pending items
--
-- Problems fixed:
--   1. document_submission_status had no 'cancelled' value —
--      admin_delete_user was trying to SET status = 'cancelled'
--      on a type that didn't include it → cast error / no-op.
--   2. payment_status had no 'cancelled' value — same issue.
--   3. document_submissions pending check used 'pending' instead
--      of 'pending_review' → WHERE matched nothing, so pending
--      doc submissions were never cancelled on account deletion.
--   4. Rewrite admin_delete_user (6-arg) with all correct values.
-- ================================================================

-- ── 1. Extend enums ───────────────────────────────────────────
ALTER TYPE public.document_submission_status
  ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TYPE public.payment_status
  ADD VALUE IF NOT EXISTS 'cancelled';

-- booking_status and wake_extension_requests already have
-- 'cancelled' in their enums — no change needed there.

-- ── 2. Rewrite admin_delete_user (6-arg) ─────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id   uuid,
  reason           text    DEFAULT NULL,
  actor_name_in    text    DEFAULT 'Admin',
  ban_email_in     boolean DEFAULT false,
  ban_reason_in    text    DEFAULT NULL,
  ban_message_in   text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile            public.profiles%ROWTYPE;
  _actor_id           uuid;
  _deleted_account_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete user accounts';
  END IF;

  SELECT auth.uid() INTO _actor_id;

  -- Grab the profile
  SELECT * INTO _profile FROM public.profiles WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', target_user_id;
  END IF;

  -- ── a. Snapshot user info onto all surviving transaction rows ─
  UPDATE public.payments
  SET
    deleted_user_name  = _profile.name,
    deleted_user_email = _profile.email,
    deleted_user_phone = _profile.phone
  WHERE user_id = target_user_id;

  UPDATE public.document_submissions
  SET
    deleted_user_name  = _profile.name,
    deleted_user_email = _profile.email,
    deleted_user_phone = _profile.phone
  WHERE user_id = target_user_id;

  UPDATE public.bookings
  SET
    deleted_user_name  = _profile.name,
    deleted_user_email = _profile.email,
    deleted_user_phone = _profile.phone
  WHERE user_id = target_user_id;

  -- ── b. Cancel all PENDING items ───────────────────────────────
  -- document_submissions: pending status is 'pending_review'
  UPDATE public.document_submissions
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending_review';

  -- payments: pending status is 'pending'
  UPDATE public.payments
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- bookings: pending status is 'pending'
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- wake_extension_requests: pending status is 'pending'
  UPDATE public.wake_extension_requests
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- ── c. Archive to deleted_accounts ───────────────────────────
  INSERT INTO public.deleted_accounts (
    original_id, name, email, phone, role,
    first_name, middle_initial, last_name, suffix,
    deleted_by, deleted_by_name, delete_reason,
    original_created_at, deleted_at,
    is_banned, ban_reason, ban_message,
    banned_at, banned_by, banned_by_name
  ) VALUES (
    _profile.id,
    _profile.name,
    _profile.email,
    _profile.phone,
    _profile.role,
    _profile.first_name,
    _profile.middle_initial,
    _profile.last_name,
    _profile.suffix,
    _actor_id,
    actor_name_in,
    reason,
    _profile.created_at,
    now(),
    ban_email_in,
    CASE WHEN ban_email_in THEN ban_reason_in ELSE NULL END,
    CASE WHEN ban_email_in THEN ban_message_in ELSE NULL END,
    CASE WHEN ban_email_in THEN now()      ELSE NULL END,
    CASE WHEN ban_email_in THEN _actor_id  ELSE NULL END,
    CASE WHEN ban_email_in THEN actor_name_in ELSE NULL END
  )
  RETURNING id INTO _deleted_account_id;

  -- ── d. If banning, upsert into banned_emails ─────────────────
  IF ban_email_in THEN
    INSERT INTO public.banned_emails (
      email, reason, message, banned_by, banned_by_name, banned_at
    ) VALUES (
      lower(trim(_profile.email)),
      ban_reason_in,
      ban_message_in,
      _actor_id,
      actor_name_in,
      now()
    )
    ON CONFLICT (email) DO UPDATE
      SET
        reason           = EXCLUDED.reason,
        message          = EXCLUDED.message,
        banned_by        = EXCLUDED.banned_by,
        banned_by_name   = EXCLUDED.banned_by_name,
        banned_at        = EXCLUDED.banned_at,
        unbanned_at      = NULL,
        unbanned_by      = NULL,
        unbanned_by_name = NULL;
  END IF;

  -- ── e. Hard-delete from auth (cascades to profiles row) ──────
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text, boolean, text, text)
  TO authenticated;

-- Keep the 3-arg shim up to date too
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid,
  reason         text DEFAULT NULL,
  actor_name_in  text DEFAULT 'Admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_delete_user(
    target_user_id, reason, actor_name_in,
    false, null, null
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text)
  TO authenticated;
