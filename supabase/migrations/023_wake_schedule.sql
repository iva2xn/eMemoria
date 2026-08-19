-- ============================================================
-- Migration 023: Wake Schedule
--
-- Tracks wake/burial schedules for clients who availed
-- coffin/casket (traditional burial package) services.
--
-- Two new tables:
--   1. wakes                    — one row per booking that involved
--                                 a coffin/casket package
--   2. wake_extension_requests  — client requests to extend the
--                                 wake period or change location
--
-- Notification triggers:
--   - When admin approves/rejects an extension request, a
--     client_notification is inserted automatically.
-- ============================================================

-- ── Cemeteries in Sariaya, Quezon (used as dropdown options) ─
-- Stored as a text column + 'Other' option; no FK needed.

-- ── 1. wakes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wakes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the booking that spawned this wake record
  booking_id       uuid        REFERENCES public.bookings (id) ON DELETE CASCADE,

  -- Client who availed the service
  user_id          uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- Deceased info (copied from obituary or entered by admin)
  deceased_name    text        NOT NULL,

  -- Pickup date/time — when the body is picked up from the funeral home
  pickup_datetime  timestamptz,

  -- Burial / interment location
  burial_location  text,       -- value from dropdown or custom "Other" text
  burial_location_other text,  -- filled when burial_location = 'Other'

  -- Wake window
  wake_start_date  date,
  wake_end_date    date,       -- admin-set end; can be extended by requests

  -- Notes from admin/staff
  notes            text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wakes_booking_id_idx ON public.wakes (booking_id);
CREATE INDEX IF NOT EXISTS wakes_user_id_idx    ON public.wakes (user_id);

CREATE TRIGGER wakes_updated_at
  BEFORE UPDATE ON public.wakes
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.wakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wake"
  ON public.wakes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff and admins can manage all wakes"
  ON public.wakes FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());


-- ── 2. wake_extension_requests ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wake_extension_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  wake_id          uuid        NOT NULL REFERENCES public.wakes (id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  -- What the client is requesting
  request_type     text        NOT NULL CHECK (request_type IN ('extension', 'location_change')),

  -- Extension fields
  requested_end_date date,     -- new end date (max 2 weeks from current date at request time)

  -- Location change fields
  new_location       text,     -- value from cemetery dropdown or 'Other'
  new_location_other text,     -- filled when new_location = 'Other'

  -- Review status
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Rejection reason (shown to client if rejected)
  rejection_reason text,       -- preset dropdown value
  rejection_comment text,      -- optional admin comment

  reviewed_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at      timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wer_wake_id_idx   ON public.wake_extension_requests (wake_id);
CREATE INDEX IF NOT EXISTS wer_user_id_idx   ON public.wake_extension_requests (user_id);
CREATE INDEX IF NOT EXISTS wer_status_idx    ON public.wake_extension_requests (status);

CREATE TRIGGER wake_extension_requests_updated_at
  BEFORE UPDATE ON public.wake_extension_requests
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.wake_extension_requests ENABLE ROW LEVEL SECURITY;

-- Clients can view and create their own requests
CREATE POLICY "Users can view their own extension requests"
  ON public.wake_extension_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create extension requests"
  ON public.wake_extension_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Staff and admins can view and update all requests
CREATE POLICY "Staff and admins can manage extension requests"
  ON public.wake_extension_requests FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());


-- ── Notification trigger: extension request reviewed ──────────
-- Fires when an extension request status changes to
-- approved or rejected and notifies the client.
CREATE OR REPLACE FUNCTION public.notify_client_wake_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg       text;
  _event     text;
  _action    text;
  _type_label text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;

  _type_label := CASE NEW.request_type
    WHEN 'extension'       THEN 'wake extension'
    WHEN 'location_change' THEN 'location change'
    ELSE NEW.request_type
  END;

  IF NEW.status = 'approved' THEN
    _event := 'wake_request_approved';
    _msg   := 'Your ' || _type_label || ' request has been approved.';
    _action := '/wake-schedule';
  ELSE
    _event := 'wake_request_rejected';
    _msg   := 'Your ' || _type_label || ' request was not approved.'
      || CASE WHEN NEW.rejection_reason IS NOT NULL
              THEN ' Reason: ' || NEW.rejection_reason
              ELSE ''
         END;
    _action := '/wake-schedule';
  END IF;

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id,
    _event,
    'wake_extension_requests',
    NEW.id,
    _msg,
    jsonb_build_object(
      'request_type',       NEW.request_type,
      'status',             NEW.status,
      'rejection_reason',   NEW.rejection_reason,
      'rejection_comment',  NEW.rejection_comment
    ),
    _action
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_wake_request ON public.wake_extension_requests;
CREATE TRIGGER trg_notify_client_wake_request
  AFTER UPDATE ON public.wake_extension_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_wake_request();


-- ── Notification trigger: new extension request → notify admin ─
CREATE OR REPLACE FUNCTION public.notify_admin_wake_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _type_label text;
  _client_name text;
BEGIN
  _type_label := CASE NEW.request_type
    WHEN 'extension'       THEN 'wake extension'
    WHEN 'location_change' THEN 'location change'
    ELSE NEW.request_type
  END;

  SELECT name INTO _client_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.activity_log
    (category, event_type, entity_table, entity_id, message, metadata, is_read)
  VALUES (
    'notification',
    'wake_request_received',
    'wake_extension_requests',
    NEW.id,
    COALESCE(_client_name, 'A client') || ' submitted a ' || _type_label || ' request.',
    jsonb_build_object(
      'request_type', NEW.request_type,
      'wake_id',      NEW.wake_id,
      'user_id',      NEW.user_id
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_wake_request ON public.wake_extension_requests;
CREATE TRIGGER trg_notify_admin_wake_request
  AFTER INSERT ON public.wake_extension_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_wake_request();
