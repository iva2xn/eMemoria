-- ============================================================
-- Migration 027: Wake Schedule Requests
--
-- Captures client-submitted wake schedule preferences
-- collected during billing/onboarding (after obituary setup).
-- Distinct from wake_extension_requests, which handles changes
-- to an already-established wake record.
--
-- Admin reviews these to create the official wakes row.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wake_schedule_requests (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client who submitted the request
  user_id               uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  -- Deceased name (copied from obituary or entered manually)
  deceased_name         text        NOT NULL,

  -- Client-preferred values — admin may adjust when creating the wake
  preferred_pickup_date date,
  preferred_pickup_time text,        -- e.g. "08:00", "Afternoon", free text
  preferred_wake_start  date,
  preferred_wake_end    date,
  preferred_burial_location       text,   -- from SARIAYA_CEMETERIES or custom
  preferred_burial_location_other text,   -- when preferred_burial_location = 'Other Location'

  -- Optional notes from the client
  notes                 text,

  -- Review status
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'reviewed', 'converted')),
  -- 'pending'   — new, unreviewed
  -- 'reviewed'  — admin has seen it (but hasn't created wake row yet)
  -- 'converted' — admin created a wakes row from this request

  -- Link to the resulting wakes row (set when status = 'converted')
  wake_id               uuid        REFERENCES public.wakes (id) ON DELETE SET NULL,

  reviewed_by           uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at           timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wsr_user_id_idx  ON public.wake_schedule_requests (user_id);
CREATE INDEX IF NOT EXISTS wsr_status_idx   ON public.wake_schedule_requests (status);

CREATE TRIGGER wake_schedule_requests_updated_at
  BEFORE UPDATE ON public.wake_schedule_requests
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.wake_schedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedule requests"
  ON public.wake_schedule_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create schedule requests"
  ON public.wake_schedule_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff and admins can manage all schedule requests"
  ON public.wake_schedule_requests FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- ── Notify admin when a new wake schedule request comes in ───
CREATE OR REPLACE FUNCTION public.notify_admin_wake_schedule_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _client_name text;
BEGIN
  SELECT name INTO _client_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.activity_log
    (category, event_type, entity_table, entity_id, message, metadata, is_read)
  VALUES (
    'notification',
    'wake_schedule_request_received',
    'wake_schedule_requests',
    NEW.id,
    COALESCE(_client_name, 'A client') || ' submitted wake schedule preferences for ' || NEW.deceased_name || '.',
    jsonb_build_object(
      'user_id',        NEW.user_id,
      'deceased_name',  NEW.deceased_name,
      'pickup_date',    NEW.preferred_pickup_date,
      'wake_start',     NEW.preferred_wake_start,
      'wake_end',       NEW.preferred_wake_end,
      'location',       NEW.preferred_burial_location
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_wake_schedule_request ON public.wake_schedule_requests;
CREATE TRIGGER trg_notify_admin_wake_schedule_request
  AFTER INSERT ON public.wake_schedule_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_wake_schedule_request();
