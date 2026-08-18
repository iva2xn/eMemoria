-- ============================================================
-- eMemoria — Client Notifications
-- Migration 020: client_notifications table + DB triggers
--
-- Separate from activity_log (which is admin/staff-only).
-- These are per-user notifications shown in the client portal.
--
-- SAFE TO RUN ON A LIVE DB:
--   - Creates ONE new table
--   - Adds triggers on payments + document_submissions
--   - Uses IF NOT EXISTS / OR REPLACE everywhere
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient — always a registered user
  user_id      uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  -- What triggered this notification
  event_type   text        NOT NULL,
  -- e.g. 'payment_approved', 'payment_rejected', 'payment_pending',
  --      'doc_approved', 'doc_rejected', 'doc_pending'

  -- Source row so the UI can build a deep link
  entity_table text        NOT NULL,
  entity_id    uuid,

  -- Human-readable message
  message      text        NOT NULL,

  -- Extra data (amount, package name, etc.)
  metadata     jsonb,

  -- Optional deep-link path within the site (e.g. '/billing?...')
  action_url   text,

  -- Per-user read state
  is_read      boolean     NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS cn_user_id_idx     ON public.client_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cn_is_read_idx     ON public.client_notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS cn_entity_idx      ON public.client_notifications (entity_table, entity_id);

-- RLS
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.client_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.client_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- DB triggers (SECURITY DEFINER) insert via system — no INSERT policy needed for users
-- Staff/admins can also insert (for manual notifications)
CREATE POLICY "Service role can insert notifications"
  ON public.client_notifications FOR INSERT
  WITH CHECK (true);


-- ── Trigger: payment status changes → notify owner ───────────
-- Fires when a payment row is updated and status changes.
-- Only notifies if the payment has a user_id (guest payments are not notified).
CREATE OR REPLACE FUNCTION public.notify_client_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg       text;
  _event     text;
  _action    text;
  _amt       text;
BEGIN
  -- Only act on status changes
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  -- Only for logged-in users
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
    RETURN NEW; -- pending → no notification needed (client just submitted it)
  END IF;

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id,
    _event,
    'payments',
    NEW.id,
    _msg,
    jsonb_build_object(
      'amount',       NEW.amount,
      'method',       NEW.method,
      'product_type', NEW.product_type,
      'product_ref',  NEW.product_ref,
      'status',       NEW.status
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


-- ── Trigger: document submission status changes → notify owner ──
CREATE OR REPLACE FUNCTION public.notify_client_doc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg       text;
  _event     text;
  _action    text;
  _label     text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  _label := COALESCE(NEW.product_label, NEW.product_type, 'service');

  IF NEW.status = 'approved' THEN
    _event  := 'doc_approved';
    _msg    := 'Your documents for ' || _label || ' have been approved. You may now proceed to payment.';
    -- Build billing deep link
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
    NEW.user_id,
    _event,
    'document_submissions',
    NEW.id,
    _msg,
    jsonb_build_object(
      'product_label', NEW.product_label,
      'product_type',  NEW.product_type,
      'product_price', NEW.product_price,
      'status',        NEW.status,
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


-- ── Also notify on new payment insert (pending confirmation) ──
-- Lets the client know their submission was received.
CREATE OR REPLACE FUNCTION public.notify_client_payment_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _amt text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  _amt := '₱' || TO_CHAR(NEW.amount, 'FM999,999,999');

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id,
    'payment_pending',
    'payments',
    NEW.id,
    'We received your payment of ' || _amt || '. Our team will verify it shortly.',
    jsonb_build_object(
      'amount',       NEW.amount,
      'method',       NEW.method,
      'product_type', NEW.product_type
    ),
    '/notifications'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_payment_received ON public.payments;
CREATE TRIGGER trg_notify_client_payment_received
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_payment_received();


-- ── Also notify on new document submission received ───────────
CREATE OR REPLACE FUNCTION public.notify_client_doc_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _label text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  _label := COALESCE(NEW.product_label, NEW.product_type, 'service');

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id,
    'doc_pending',
    'document_submissions',
    NEW.id,
    'Your documents for ' || _label || ' have been received and are under review.',
    jsonb_build_object(
      'product_label', NEW.product_label,
      'product_type',  NEW.product_type
    ),
    '/document-submission/status?id=' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_doc_received ON public.document_submissions;
CREATE TRIGGER trg_notify_client_doc_received
  AFTER INSERT ON public.document_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.notify_client_doc_received();
