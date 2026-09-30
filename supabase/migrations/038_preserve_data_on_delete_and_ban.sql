-- ================================================================
-- Migration 038: Preserve critical data on account deletion + ban
--
-- Goals:
--   1. Payments, bookings, document_submissions, wakes, and
--      wake_extension_requests survive user deletion with a
--      snapshot of the user's name/email/phone so admin/staff
--      can always trace transactions.
--   2. All PENDING items (not yet approved) are cancelled/
--      withdrawn automatically when an account is deleted.
--   3. Wakes and obituaries created by the user stay intact.
--   4. deleted_accounts gains is_banned / ban_reason / ban_message.
--   5. New banned_emails table so blocked addresses cannot
--      register a new account.
-- ================================================================


-- ── 1. Add snapshot columns to payments ──────────────────────
-- These are filled right before the auth.users row is deleted.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS deleted_user_name  text,
  ADD COLUMN IF NOT EXISTS deleted_user_email text,
  ADD COLUMN IF NOT EXISTS deleted_user_phone text;

-- ── 2. Add snapshot columns to document_submissions ──────────
ALTER TABLE public.document_submissions
  ADD COLUMN IF NOT EXISTS deleted_user_name  text,
  ADD COLUMN IF NOT EXISTS deleted_user_email text,
  ADD COLUMN IF NOT EXISTS deleted_user_phone text;

-- ── 3. Add snapshot columns to bookings ──────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deleted_user_name  text,
  ADD COLUMN IF NOT EXISTS deleted_user_email text,
  ADD COLUMN IF NOT EXISTS deleted_user_phone text;

-- ── 4. Change FK cascade behaviour ───────────────────────────
-- payments.user_id: CASCADE → SET NULL  (data must survive)
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- document_submissions.user_id: CASCADE → SET NULL
ALTER TABLE public.document_submissions
  DROP CONSTRAINT IF EXISTS document_submissions_user_id_fkey;
ALTER TABLE public.document_submissions
  ADD CONSTRAINT document_submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- bookings.user_id: CASCADE → SET NULL
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- wake_extension_requests.user_id: CASCADE → SET NULL
-- (the wake itself already uses SET NULL; requests should too)
ALTER TABLE public.wake_extension_requests
  DROP CONSTRAINT IF EXISTS wake_extension_requests_user_id_fkey;
ALTER TABLE public.wake_extension_requests
  ADD CONSTRAINT wake_extension_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles (id)
    ON DELETE SET NULL;

-- client_notifications.user_id: CASCADE → SET NULL
ALTER TABLE public.client_notifications
  DROP CONSTRAINT IF EXISTS client_notifications_user_id_fkey;
ALTER TABLE public.client_notifications
  ADD CONSTRAINT client_notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles (id)
    ON DELETE SET NULL;


-- ── 5. Ban columns on deleted_accounts ───────────────────────
ALTER TABLE public.deleted_accounts
  ADD COLUMN IF NOT EXISTS is_banned    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason   text,
  ADD COLUMN IF NOT EXISTS ban_message  text,       -- custom message shown to user
  ADD COLUMN IF NOT EXISTS banned_at    timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banned_by_name text,
  ADD COLUMN IF NOT EXISTS unbanned_at  timestamptz,
  ADD COLUMN IF NOT EXISTS unbanned_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unbanned_by_name text;


-- ── 6. Banned emails table ────────────────────────────────────
-- Independent table so bans survive if deleted_accounts row
-- is cleaned up, and so staff can ban without a deletion record.
CREATE TABLE IF NOT EXISTS public.banned_emails (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  reason      text,
  message     text,       -- shown to user at registration: "This email is flagged…"
  banned_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_by_name text,
  banned_at   timestamptz NOT NULL DEFAULT now(),
  unbanned_at timestamptz,
  unbanned_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  unbanned_by_name text
);

CREATE INDEX IF NOT EXISTS banned_emails_email_idx ON public.banned_emails (lower(email));

ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage this table
CREATE POLICY "admin_full_banned_emails"
  ON public.banned_emails
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── 7. Updated admin_delete_user ─────────────────────────────
-- Before deleting:
--   a) Snapshot name/email/phone onto all transaction records
--   b) Cancel all PENDING items (docs, payments, bookings)
--   c) Archive to deleted_accounts
--   d) Hard-delete from auth.users (cascades to profiles)
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
  _profile public.profiles%ROWTYPE;
  _actor_id uuid;
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

  -- ── a. Snapshot user info onto surviving records ─────────
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

  -- ── b. Cancel all pending items ──────────────────────────
  -- Pending document submissions → mark as 'cancelled'
  UPDATE public.document_submissions
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- Pending payments → mark as 'cancelled'
  UPDATE public.payments
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- Pending bookings → mark as 'cancelled'
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- Pending wake extension requests → mark as 'cancelled'
  UPDATE public.wake_extension_requests
  SET status = 'cancelled'
  WHERE user_id = target_user_id
    AND status = 'pending';

  -- ── c. Archive to deleted_accounts ───────────────────────
  INSERT INTO public.deleted_accounts (
    original_id, name, email, phone, role,
    first_name, middle_initial, last_name, suffix,
    deleted_by, deleted_by_name, delete_reason,
    original_created_at, deleted_at,
    is_banned, ban_reason, ban_message,
    banned_at, banned_by, banned_by_name
  ) VALUES (
    _profile.id, _profile.name, _profile.email, _profile.phone, _profile.role,
    _profile.first_name, _profile.middle_initial, _profile.last_name, _profile.suffix,
    _actor_id, actor_name_in, reason,
    _profile.created_at, now(),
    ban_email_in,
    CASE WHEN ban_email_in THEN ban_reason_in ELSE NULL END,
    CASE WHEN ban_email_in THEN ban_message_in ELSE NULL END,
    CASE WHEN ban_email_in THEN now() ELSE NULL END,
    CASE WHEN ban_email_in THEN _actor_id ELSE NULL END,
    CASE WHEN ban_email_in THEN actor_name_in ELSE NULL END
  )
  RETURNING id INTO _deleted_account_id;

  -- ── d. If banning, add to banned_emails ──────────────────
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
        reason         = EXCLUDED.reason,
        message        = EXCLUDED.message,
        banned_by      = EXCLUDED.banned_by,
        banned_by_name = EXCLUDED.banned_by_name,
        banned_at      = EXCLUDED.banned_at,
        unbanned_at    = NULL,
        unbanned_by    = NULL,
        unbanned_by_name = NULL;
  END IF;

  -- ── e. Hard-delete from auth (cascades to profiles) ──────
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text, boolean, text, text)
  TO authenticated;

-- Keep old 3-arg signature working for backward compat
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
  PERFORM public.admin_delete_user(target_user_id, reason, actor_name_in, false, null, null);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text) TO authenticated;


-- ── 8. Ban/unban helper functions ────────────────────────────

-- Ban an email (standalone, without deletion)
CREATE OR REPLACE FUNCTION public.admin_ban_email(
  email_in       text,
  reason_in      text DEFAULT NULL,
  message_in     text DEFAULT NULL,
  actor_name_in  text DEFAULT 'Admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can ban emails';
  END IF;

  INSERT INTO public.banned_emails (
    email, reason, message, banned_by, banned_by_name, banned_at
  ) VALUES (
    lower(trim(email_in)),
    reason_in,
    message_in,
    auth.uid(),
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

  -- Also flag on deleted_accounts if one exists
  UPDATE public.deleted_accounts
  SET
    is_banned       = true,
    ban_reason      = reason_in,
    ban_message     = message_in,
    banned_at       = now(),
    banned_by       = auth.uid(),
    banned_by_name  = actor_name_in
  WHERE lower(trim(email)) = lower(trim(email_in))
    AND is_banned = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ban_email(text, text, text, text) TO authenticated;


-- Unban an email
CREATE OR REPLACE FUNCTION public.admin_unban_email(
  email_in      text,
  actor_name_in text DEFAULT 'Admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can unban emails';
  END IF;

  UPDATE public.banned_emails
  SET
    unbanned_at      = now(),
    unbanned_by      = auth.uid(),
    unbanned_by_name = actor_name_in
  WHERE lower(email) = lower(trim(email_in));

  UPDATE public.deleted_accounts
  SET
    is_banned        = false,
    unbanned_at      = now(),
    unbanned_by      = auth.uid(),
    unbanned_by_name = actor_name_in
  WHERE lower(trim(email)) = lower(trim(email_in));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unban_email(text, text) TO authenticated;


-- ── 9. is_email_banned() helper (used by registration API) ───
CREATE OR REPLACE FUNCTION public.is_email_banned(email_in text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_emails
    WHERE lower(email) = lower(trim(email_in))
      AND unbanned_at IS NULL
  );
$$;

-- Allow anon to call this so registration can check pre-auth
GRANT EXECUTE ON FUNCTION public.is_email_banned(text) TO anon, authenticated;
