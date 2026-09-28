-- ============================================================
-- Migration 034: Fix notification action_url deep-links
--
-- Updates DB trigger functions so client notifications
-- point to the right pages:
--   payment_approved  → /payments?highlight=<payment_id>&filter=approved
--   payment_rejected  → /payments?filter=rejected
--   payment_voided    → /payments?filter=rejected
--   payment_pending   → /payments?filter=pending
--   doc_pending       → /document-submission/status?id=<id>   (unchanged)
--   doc_approved      → /billing?...                          (unchanged)
--   doc_rejected      → /document-submission/status?id=<id>   (improved)
-- ============================================================

-- ── Re-create: payment status → client notification ──────────
CREATE OR REPLACE FUNCTION public.notify_client_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg    text;
  _event  text;
  _action text;
  _amt    text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL        THEN RETURN NEW; END IF;

  _amt := '₱' || TO_CHAR(NEW.amount, 'FM999,999,999');

  IF NEW.status = 'approved' THEN
    _event  := 'payment_approved';
    _msg    := 'Your payment of ' || _amt || ' has been approved. Thank you!';
    -- Deep-link: highlight the specific payment + show approved tab
    _action := '/payments?highlight=' || NEW.id::text || '&filter=approved';

  ELSIF NEW.status = 'rejected' THEN
    _event  := 'payment_rejected';
    _msg    := 'Your payment of ' || _amt || ' was not approved. Please contact us for assistance.';
    _action := '/payments?filter=rejected';

  ELSIF NEW.status = 'voided' THEN
    _event  := 'payment_voided';
    _msg    := 'Your payment of ' || _amt || ' has been voided. Please contact us if you have questions.';
    _action := '/payments?filter=rejected';

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, _event, 'payments', NEW.id, _msg,
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

-- ── Re-create: payment received (INSERT) notification ─────────
CREATE OR REPLACE FUNCTION public.notify_client_payment_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _amt text;
BEGIN
  IF NEW.user_id IS NULL   THEN RETURN NEW; END IF;
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
    '/payments?filter=pending'
  );
  RETURN NEW;
END;
$$;

-- ── Re-create: document submission status notification ────────
CREATE OR REPLACE FUNCTION public.notify_client_doc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg    text;
  _event  text;
  _action text;
  _label  text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL     THEN RETURN NEW; END IF;

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
    -- Deep-link to the specific submission status page
    _action := '/document-submission/status?id=' || NEW.id::text;

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, _event, 'document_submissions', NEW.id, _msg,
    jsonb_build_object(
      'product_label',    NEW.product_label,
      'product_type',     NEW.product_type,
      'product_price',    NEW.product_price,
      'status',           NEW.status,
      'rejection_reason', NEW.rejection_reason
    ),
    _action
  );
  RETURN NEW;
END;
$$;

-- Triggers already exist — recreating functions is sufficient.
-- No DROP/CREATE TRIGGER needed because OR REPLACE handles function body updates.
