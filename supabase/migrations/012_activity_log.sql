-- ============================================================
-- eMemoria — Activity Log
-- Migration 012: activity_log table + DB triggers
--
-- SAFE TO RUN ON A LIVE DB:
--   - Creates ONE new table (activity_log)
--   - Adds triggers on existing tables (does NOT alter columns)
--   - Uses IF NOT EXISTS / OR REPLACE everywhere
--   - Will not break or touch any existing data
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What kind of event this is
  -- 'notification' = customer-triggered (shown in Notifications tab)
  -- 'log'          = staff/admin-triggered (shown in Logs tab)
  category     text        NOT NULL CHECK (category IN ('notification', 'log')),

  event_type   text        NOT NULL,  -- e.g. 'payment_submitted', 'slot_occupied'
  entity_table text        NOT NULL,  -- source table name
  entity_id    uuid,                  -- FK to the source row

  -- Who triggered it (NULL = guest / system trigger)
  actor_id     uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  actor_name   text,                  -- denormalized for display

  -- Human-readable message shown in the panel
  message      text        NOT NULL,

  -- Extra context (amount, status, etc.)
  metadata     jsonb,

  -- Shared read flag — one admin reads it, it's read for everyone
  is_read      boolean     NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_category_idx   ON public.activity_log (category, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_is_read_idx    ON public.activity_log (is_read);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx     ON public.activity_log (entity_table, entity_id);

-- RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Only staff/admins can read the log
CREATE POLICY "Staff and admins can read activity log"
  ON public.activity_log FOR SELECT
  USING (public.is_staff_or_admin());

-- Staff/admins can insert log entries (client-side writes from admin panel)
CREATE POLICY "Staff and admins can insert activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_staff_or_admin());

-- Anyone can insert notification entries (guests submit payments, inquiries, etc.)
CREATE POLICY "Anyone can insert notifications"
  ON public.activity_log FOR INSERT
  WITH CHECK (category = 'notification');

-- Staff/admins can mark entries as read
CREATE POLICY "Staff and admins can update activity log"
  ON public.activity_log FOR UPDATE
  USING (public.is_staff_or_admin());


-- ── Trigger helpers ──────────────────────────────────────────

-- New payment submitted (notification — customer action)
CREATE OR REPLACE FUNCTION public.log_payment_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _name text;
BEGIN
  _name := COALESCE(
    (SELECT name FROM public.profiles WHERE id = NEW.user_id),
    NEW.guest_name,
    'Guest'
  );
  INSERT INTO public.activity_log (category, event_type, entity_table, entity_id, actor_name, message, metadata)
  VALUES (
    'notification',
    'payment_submitted',
    'payments',
    NEW.id,
    _name,
    _name || ' submitted a payment of ₱' || TO_CHAR(NEW.amount, 'FM999,999,999') || ' (' || NEW.method || ')',
    jsonb_build_object('amount', NEW.amount, 'method', NEW.method, 'product_type', NEW.product_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payment_submitted ON public.payments;
CREATE TRIGGER trg_log_payment_submitted
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.log_payment_submitted();


-- New inquiry received (notification — customer action)
CREATE OR REPLACE FUNCTION public.log_inquiry_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_log (category, event_type, entity_table, entity_id, actor_name, message, metadata)
  VALUES (
    'notification',
    'inquiry_received',
    'inquiries',
    NEW.id,
    NEW.name,
    NEW.name || ' submitted an inquiry: "' || LEFT(NEW.subject, 60) || '"',
    jsonb_build_object('subject', NEW.subject, 'email', NEW.email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inquiry_received ON public.inquiries;
CREATE TRIGGER trg_log_inquiry_received
  AFTER INSERT ON public.inquiries
  FOR EACH ROW EXECUTE PROCEDURE public.log_inquiry_received();


-- New document submission (notification — customer action)
CREATE OR REPLACE FUNCTION public.log_doc_submission_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _name text;
BEGIN
  _name := COALESCE(
    (SELECT name FROM public.profiles WHERE id = NEW.user_id),
    NEW.guest_name,
    'Guest'
  );
  INSERT INTO public.activity_log (category, event_type, entity_table, entity_id, actor_name, message, metadata)
  VALUES (
    'notification',
    'doc_submission_received',
    'document_submissions',
    NEW.id,
    _name,
    _name || ' submitted documents for ' || COALESCE(NEW.product_label, NEW.product_type, 'a package'),
    jsonb_build_object('product_label', NEW.product_label, 'product_type', NEW.product_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_doc_submission ON public.document_submissions;
CREATE TRIGGER trg_log_doc_submission
  AFTER INSERT ON public.document_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.log_doc_submission_received();


-- New obituary submitted (notification — customer action)
CREATE OR REPLACE FUNCTION public.log_obituary_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only log guest/customer submissions (is_published = false and no created_by = admin self-create)
  IF NEW.is_published = false THEN
    INSERT INTO public.activity_log (category, event_type, entity_table, entity_id, actor_name, message, metadata)
    VALUES (
      'notification',
      'obituary_submitted',
      'obituaries',
      NEW.id,
      COALESCE(NEW.submitter_name, 'Guest'),
      COALESCE(NEW.submitter_name, 'Guest') || ' submitted an obituary for ' || NEW.full_name,
      jsonb_build_object('full_name', NEW.full_name, 'submitter_email', NEW.submitter_email)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_obituary_submitted ON public.obituaries;
CREATE TRIGGER trg_log_obituary_submitted
  AFTER INSERT ON public.obituaries
  FOR EACH ROW EXECUTE PROCEDURE public.log_obituary_submitted();


-- New columbarium reservation (notification — customer/payment action)
CREATE OR REPLACE FUNCTION public.log_slot_reserved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _name text;
BEGIN
  -- Only fire when status changes TO 'reserved'
  IF NEW.status = 'reserved' AND OLD.status != 'reserved' THEN
    _name := COALESCE(
      (SELECT name FROM public.profiles WHERE id = NEW.reserved_by_user_id),
      'Guest'
    );
    INSERT INTO public.activity_log (category, event_type, entity_table, entity_id, actor_name, message, metadata)
    VALUES (
      'notification',
      'slot_reserved',
      'columbarium_slots',
      NEW.id,
      _name,
      _name || ' reserved columbarium slot ' || NEW.slot_code,
      jsonb_build_object('slot_code', NEW.slot_code, 'price', NEW.price)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_slot_reserved ON public.columbarium_slots;
CREATE TRIGGER trg_log_slot_reserved
  AFTER UPDATE ON public.columbarium_slots
  FOR EACH ROW EXECUTE PROCEDURE public.log_slot_reserved();
