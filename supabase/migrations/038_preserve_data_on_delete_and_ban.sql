-- ================================================================
-- Migration 038: Preserve critical data on account deletion + ban
--
-- Fully self-contained and idempotent — safe to run on any DB
-- regardless of which prior migrations have been applied.
--
-- What this does:
--   1. Re-creates helper functions (is_admin etc.) in case they
--      don't exist yet — safe because all use CREATE OR REPLACE
--   2. Creates deleted_accounts table if it doesn't exist
--      (normally created by 029, but we guard here too)
--   3. Adds snapshot columns to payments/bookings/document_submissions
--   4. Changes user_id FK cascade to SET NULL on those tables
--   5. Adds ban columns to deleted_accounts
--   6. Creates banned_emails table
--   7. Creates/replaces all admin functions
-- ================================================================

-- ── 0. Ensure helper functions exist (no-op if already present) ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$;

-- ── 1. deleted_accounts table (idempotent) ────────────────────
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id         uuid        NOT NULL,
  name                text        NOT NULL,
  email               text        NOT NULL,
  phone               text,
  role                text        NOT NULL DEFAULT 'client',
  first_name          text,
  middle_initial      text,
  last_name           text,
  suffix              text,
  deleted_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by_name     text,
  delete_reason       text,
  original_created_at timestamptz,
  deleted_at          timestamptz NOT NULL DEFAULT now(),
  restored_at         timestamptz,
  restored_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  restored_by_name    text
);

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_deleted_accounts" ON public.deleted_accounts;
CREATE POLICY "admin_full_deleted_accounts"
  ON public.deleted_accounts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 2. Ban columns on deleted_accounts ───────────────────────
ALTER TABLE public.deleted_accounts
  ADD COLUMN IF NOT EXISTS is_banned       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason      text,
  ADD COLUMN IF NOT EXISTS ban_message     text,
  ADD COLUMN IF NOT EXISTS banned_at       timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banned_by_name  text,
  ADD COLUMN IF NOT EXISTS unbanned_at     timestamptz,
  ADD COLUMN IF NOT EXISTS unbanned_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unbanned_by_name text;

-- ── 3. Snapshot columns + FK fixes on transaction tables ─────
-- Each block is wrapped so it skips silently if the table doesn't exist.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments
      ADD COLUMN IF NOT EXISTS deleted_user_name  text,
      ADD COLUMN IF NOT EXISTS deleted_user_email text,
      ADD COLUMN IF NOT EXISTS deleted_user_phone text;

    ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_submissions'
  ) THEN
    ALTER TABLE public.document_submissions
      ADD COLUMN IF NOT EXISTS deleted_user_name  text,
      ADD COLUMN IF NOT EXISTS deleted_user_email text,
      ADD COLUMN IF NOT EXISTS deleted_user_phone text;

    ALTER TABLE public.document_submissions ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE public.document_submissions DROP CONSTRAINT IF EXISTS document_submissions_user_id_fkey;
    ALTER TABLE public.document_submissions
      ADD CONSTRAINT document_submissions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN IF NOT EXISTS deleted_user_name  text,
      ADD COLUMN IF NOT EXISTS deleted_user_email text,
      ADD COLUMN IF NOT EXISTS deleted_user_phone text;

    ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wake_extension_requests'
  ) THEN
    ALTER TABLE public.wake_extension_requests ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE public.wake_extension_requests DROP CONSTRAINT IF EXISTS wake_extension_requests_user_id_fkey;
    ALTER TABLE public.wake_extension_requests
      ADD CONSTRAINT wake_extension_requests_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'client_notifications'
  ) THEN
    ALTER TABLE public.client_notifications ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE public.client_notifications DROP CONSTRAINT IF EXISTS client_notifications_user_id_fkey;
    ALTER TABLE public.client_notifications
      ADD CONSTRAINT client_notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. banned_emails table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.banned_emails (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text        NOT NULL UNIQUE,
  reason           text,
  message          text,
  banned_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_by_name   text,
  banned_at        timestamptz NOT NULL DEFAULT now(),
  unbanned_at      timestamptz,
  unbanned_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  unbanned_by_name text
);

CREATE INDEX IF NOT EXISTS banned_emails_email_idx ON public.banned_emails (lower(email));

ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_banned_emails" ON public.banned_emails;
CREATE POLICY "admin_full_banned_emails"
  ON public.banned_emails FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 5. admin_delete_user (6-arg) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id  uuid,
  reason          text    DEFAULT NULL,
  actor_name_in   text    DEFAULT 'Admin',
  ban_email_in    boolean DEFAULT false,
  ban_reason_in   text    DEFAULT NULL,
  ban_message_in  text    DEFAULT NULL
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

  SELECT * INTO _profile FROM public.profiles WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', target_user_id;
  END IF;

  -- Snapshot onto transaction records
  UPDATE public.payments SET
    deleted_user_name  = _profile.name,
    deleted_user_email = _profile.email,
    deleted_user_phone = _profile.phone
  WHERE user_id = target_user_id;

  UPDATE public.document_submissions SET
    deleted_user_name  = _profile.name,
    deleted_user_email = _profile.email,
    deleted_user_phone = _profile.phone
  WHERE user_id = target_user_id;

  UPDATE public.bookings SET
    deleted_user_name  = _profile.name,
    deleted_user_email = _profile.email,
    deleted_user_phone = _profile.phone
  WHERE user_id = target_user_id;

  -- Cancel pending items
  UPDATE public.document_submissions
    SET status = 'cancelled'
    WHERE user_id = target_user_id AND status = 'pending_review';

  UPDATE public.payments
    SET status = 'cancelled'
    WHERE user_id = target_user_id AND status = 'pending';

  UPDATE public.bookings
    SET status = 'cancelled'
    WHERE user_id = target_user_id AND status = 'pending';

  UPDATE public.wake_extension_requests
    SET status = 'cancelled'
    WHERE user_id = target_user_id AND status = 'pending';

  -- Archive
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
    CASE WHEN ban_email_in THEN ban_reason_in  ELSE NULL END,
    CASE WHEN ban_email_in THEN ban_message_in ELSE NULL END,
    CASE WHEN ban_email_in THEN now()          ELSE NULL END,
    CASE WHEN ban_email_in THEN _actor_id      ELSE NULL END,
    CASE WHEN ban_email_in THEN actor_name_in  ELSE NULL END
  )
  RETURNING id INTO _deleted_account_id;

  -- Ban email if requested
  IF ban_email_in THEN
    INSERT INTO public.banned_emails (
      email, reason, message, banned_by, banned_by_name, banned_at
    ) VALUES (
      lower(trim(_profile.email)),
      ban_reason_in, ban_message_in,
      _actor_id, actor_name_in, now()
    )
    ON CONFLICT (email) DO UPDATE SET
      reason           = EXCLUDED.reason,
      message          = EXCLUDED.message,
      banned_by        = EXCLUDED.banned_by,
      banned_by_name   = EXCLUDED.banned_by_name,
      banned_at        = EXCLUDED.banned_at,
      unbanned_at      = NULL,
      unbanned_by      = NULL,
      unbanned_by_name = NULL;
  END IF;

  -- Hard-delete (cascades to profiles)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text, boolean, text, text) TO authenticated;

-- 3-arg shim for backward compat
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid,
  reason         text DEFAULT NULL,
  actor_name_in  text DEFAULT 'Admin'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.admin_delete_user(target_user_id, reason, actor_name_in, false, null, null);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text) TO authenticated;

-- ── 6. admin_mark_account_restored ───────────────────────────
CREATE OR REPLACE FUNCTION public.admin_mark_account_restored(
  deleted_account_id uuid,
  actor_name_in      text DEFAULT 'Admin'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore accounts';
  END IF;
  UPDATE public.deleted_accounts SET
    restored_at      = now(),
    restored_by      = auth.uid(),
    restored_by_name = actor_name_in
  WHERE id = deleted_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_account_restored(uuid, text) TO authenticated;

-- ── 7. admin_ban_email ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_ban_email(
  email_in      text,
  reason_in     text DEFAULT NULL,
  message_in    text DEFAULT NULL,
  actor_name_in text DEFAULT 'Admin'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can ban emails';
  END IF;

  INSERT INTO public.banned_emails (
    email, reason, message, banned_by, banned_by_name, banned_at
  ) VALUES (
    lower(trim(email_in)), reason_in, message_in,
    auth.uid(), actor_name_in, now()
  )
  ON CONFLICT (email) DO UPDATE SET
    reason           = EXCLUDED.reason,
    message          = EXCLUDED.message,
    banned_by        = EXCLUDED.banned_by,
    banned_by_name   = EXCLUDED.banned_by_name,
    banned_at        = EXCLUDED.banned_at,
    unbanned_at      = NULL,
    unbanned_by      = NULL,
    unbanned_by_name = NULL;

  UPDATE public.deleted_accounts SET
    is_banned      = true,
    ban_reason     = reason_in,
    ban_message    = message_in,
    banned_at      = now(),
    banned_by      = auth.uid(),
    banned_by_name = actor_name_in
  WHERE lower(trim(email)) = lower(trim(email_in))
    AND is_banned = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ban_email(text, text, text, text) TO authenticated;

-- ── 8. admin_unban_email ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_unban_email(
  email_in      text,
  actor_name_in text DEFAULT 'Admin'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can unban emails';
  END IF;

  UPDATE public.banned_emails SET
    unbanned_at      = now(),
    unbanned_by      = auth.uid(),
    unbanned_by_name = actor_name_in
  WHERE lower(email) = lower(trim(email_in));

  UPDATE public.deleted_accounts SET
    is_banned        = false,
    unbanned_at      = now(),
    unbanned_by      = auth.uid(),
    unbanned_by_name = actor_name_in
  WHERE lower(trim(email)) = lower(trim(email_in));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unban_email(text, text) TO authenticated;

-- ── 9. is_email_banned ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_email_banned(email_in text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_emails
    WHERE lower(email) = lower(trim(email_in))
      AND unbanned_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_banned(text) TO anon, authenticated;
