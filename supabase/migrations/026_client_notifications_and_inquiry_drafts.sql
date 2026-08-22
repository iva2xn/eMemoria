,-- ============================================================
-- Migration 026: client_notifications table + inquiry drafts
--
-- This is a SAFE catch-up migration.
-- It re-applies the work from 020 and 025 idempotently,
-- so you can run it even if those were partially applied.
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- PART A  (from 020) — client_notifications table + triggers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_type   text        NOT NULL,
  entity_table text        NOT NULL,
  entity_id    uuid,
  message      text        NOT NULL,
  metadata     jsonb,
  action_url   text,
  is_read      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cn_user_id_idx ON public.client_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cn_is_read_idx ON public.client_notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS cn_entity_idx  ON public.client_notifications (entity_table, entity_id);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies so re-runs are idempotent
DROP POLICY IF EXISTS "Users can read own notifications"   ON public.client_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.client_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.client_notifications;

CREATE POLICY "Users can read own notifications"
  ON public.client_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.client_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.client_notifications FOR INSERT
  WITH CHECK (true);


-- ── Trigger: payment status change → notify client ───────────
CREATE OR REPLACE FUNCTION public.notify_client_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg    text;
  _event  text;
  _action text;
  _amt    text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  _amt := '₱' || TO_CHAR(NEW.amount, 'FM999,999,999');

  IF NEW.status = 'approved' THEN
    _event  := 'payment_approved';
    _msg    := 'Your payment of ' || _amt || ' has been approved. Thank you!';
    _action := '/notifications';
  ELSIF NEW.status = 'rejected' THEN
    _event  := 'payment_rejected';
    _msg    := 'Your payment of ' || _amt || ' was not approved. Please contact us for assistance.';
    _action := '/notifications';
  ELSIF NEW.status = 'voided' THEN
    _event  := 'payment_voided';
    _msg    := 'Your payment of ' || _amt || ' has been voided. Please contact us if you have questions.';
    _action := '/notifications';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, _event, 'payments', NEW.id, _msg,
    jsonb_build_object(
      'amount', NEW.amount, 'method', NEW.method,
      'product_type', NEW.product_type, 'product_ref', NEW.product_ref,
      'status', NEW.status
    ),
    _action
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_payment ON public.payments;
CREATE TRIGGER trg_notify_client_payment
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_payment_status();


-- ── Trigger: document submission status change → notify client ──
CREATE OR REPLACE FUNCTION public.notify_client_doc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg    text;
  _event  text;
  _action text;
  _label  text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  _label := COALESCE(NEW.product_label, NEW.product_type, 'service');

  IF NEW.status = 'approved' THEN
    _event  := 'doc_approved';
    _msg    := 'Your documents for ' || _label || ' have been approved. You may now proceed to payment.';
    _action := '/billing?document_submission_id=' || NEW.id::text
               || '&product=' || COALESCE(NEW.product_type, '')
               || '&label='   || COALESCE(NEW.product_label, '')
               || '&price='   || COALESCE(NEW.product_price::text, '0');
  ELSIF NEW.status = 'rejected' THEN
    _event  := 'doc_rejected';
    _msg    := 'Your document submission for ' || _label || ' was not approved.'
               || CASE WHEN NEW.rejection_reason IS NOT NULL
                       THEN ' Reason: ' || NEW.rejection_reason
                       ELSE ' Please contact us for details.'
                  END;
    _action := '/notifications';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, _event, 'document_submissions', NEW.id, _msg,
    jsonb_build_object(
      'product_label', NEW.product_label, 'product_type', NEW.product_type,
      'product_price', NEW.product_price, 'status', NEW.status,
      'rejection_reason', NEW.rejection_reason
    ),
    _action
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_doc ON public.document_submissions;
CREATE TRIGGER trg_notify_client_doc
  AFTER UPDATE ON public.document_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_doc_status();


-- ── Trigger: new payment insert (pending) → "we got your payment" ──
CREATE OR REPLACE FUNCTION public.notify_client_payment_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _amt text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  _amt := '₱' || TO_CHAR(NEW.amount, 'FM999,999,999');

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, 'payment_pending', 'payments', NEW.id,
    'We received your payment of ' || _amt || '. Our team will verify it shortly.',
    jsonb_build_object('amount', NEW.amount, 'method', NEW.method, 'product_type', NEW.product_type),
    '/notifications'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_payment_received ON public.payments;
CREATE TRIGGER trg_notify_client_payment_received
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_payment_received();


-- ── Trigger: new document submission → "docs received" ───────
CREATE OR REPLACE FUNCTION public.notify_client_doc_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _label text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  _label := COALESCE(NEW.product_label, NEW.product_type, 'service');

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, 'doc_pending', 'document_submissions', NEW.id,
    'Your documents for ' || _label || ' have been received and are under review.',
    jsonb_build_object('product_label', NEW.product_label, 'product_type', NEW.product_type),
    '/document-submission/status?id=' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_doc_received ON public.document_submissions;
CREATE TRIGGER trg_notify_client_doc_received
  AFTER INSERT ON public.document_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_doc_received();


-- ============================================================
-- PART B  (from 025) — inquiry status tracking + reply drafts
-- ============================================================

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS read_at       timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at    timestamptz,
  ADD COLUMN IF NOT EXISTS draft_body    text,
  ADD COLUMN IF NOT EXISTS draft_subject text;

-- Back-fill read_at for rows already marked is_read
UPDATE public.inquiries
SET read_at = created_at
WHERE is_read = true AND read_at IS NULL;

COMMENT ON COLUMN public.inquiries.read_at       IS 'Timestamp when the inquiry was first opened/read by staff';
COMMENT ON COLUMN public.inquiries.replied_at    IS 'Timestamp when staff opened Gmail to reply (best-effort)';
COMMENT ON COLUMN public.inquiries.draft_body    IS 'Auto-saved custom reply draft body for this inquiry';
COMMENT ON COLUMN public.inquiries.draft_subject IS 'Auto-saved custom reply draft subject for this inquiry';
