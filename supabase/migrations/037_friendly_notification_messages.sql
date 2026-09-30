-- ============================================================
-- Migration 037: Friendlier client notification messages
--
-- Replaces technical language with plain, client-friendly text.
-- Also fixes doc_approved action_url to point to
-- /bookings (Availed Services tab) instead of /billing directly,
-- and payment notifications to deep-link properly.
-- ============================================================

-- ── Payment status change ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_client_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _msg    text;
  _event  text;
  _action text;
  _amt    text;
  _label  text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL     THEN RETURN NEW; END IF;

  _amt   := '₱' || TO_CHAR(NEW.amount, 'FM999,999,999');
  _label := COALESCE(NEW.product_ref, NEW.product_type, 'your service');

  IF NEW.status = 'approved' THEN
    _event  := 'payment_approved';
    _msg    := 'Good news! Your payment of ' || _amt || ' for ' || _label
               || ' has been confirmed. You can view your official receipt in your Payments.';
    _action := '/payments?highlight=' || NEW.id::text || '&filter=approved';

  ELSIF NEW.status = 'rejected' THEN
    _event  := 'payment_rejected';
    _msg    := 'Your payment of ' || _amt || ' for ' || _label
               || ' was not approved. Please contact us so we can help you.';
    _action := '/payments?filter=rejected';

  ELSIF NEW.status = 'voided' THEN
    _event  := 'payment_voided';
    _msg    := 'Your payment of ' || _amt || ' for ' || _label
               || ' has been voided. Please get in touch with us if you have questions.';
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

-- ── Payment received (new submission) ────────────────────────
CREATE OR REPLACE FUNCTION public.notify_client_payment_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _amt   text;
  _label text;
BEGIN
  IF NEW.user_id IS NULL     THEN RETURN NEW; END IF;
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  _amt   := '₱' || TO_CHAR(NEW.amount, 'FM999,999,999');
  _label := COALESCE(NEW.product_ref, NEW.product_type, 'your service');

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id,
    'payment_pending',
    'payments',
    NEW.id,
    'We received your payment of ' || _amt || ' for ' || _label
    || '. Our team is checking it now — we''ll let you know once it''s confirmed.',
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

-- ── Document submission status change ────────────────────────
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

  _label := COALESCE(NEW.product_label, NEW.product_type, 'your service');

  IF NEW.status = 'approved' THEN
    _event  := 'doc_approved';
    _msg    := 'Great news! Your documents for ' || _label
               || ' have been reviewed and approved. You can now proceed to payment in My Bookings.';
    -- Deep-link to Availed Services tab in My Bookings
    _action := '/bookings';

  ELSIF NEW.status = 'rejected' THEN
    _event  := 'doc_rejected';
    _msg    := 'Your documents for ' || _label || ' need attention.'
               || CASE
                    WHEN NEW.rejection_reason IS NOT NULL
                    THEN ' Reason: ' || NEW.rejection_reason
                    ELSE ' Please contact us so we can help you resubmit.'
                  END;
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

-- ── Document received (new submission) ───────────────────────
CREATE OR REPLACE FUNCTION public.notify_client_doc_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _label text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  _label := COALESCE(NEW.product_label, NEW.product_type, 'your service');

  INSERT INTO public.client_notifications
    (user_id, event_type, entity_table, entity_id, message, metadata, action_url)
  VALUES (
    NEW.user_id, 'doc_pending', 'document_submissions', NEW.id,
    'We received your documents for ' || _label
    || '. Our team will review them and get back to you shortly.',
    jsonb_build_object(
      'product_label', NEW.product_label,
      'product_type',  NEW.product_type
    ),
    '/document-submission/status?id=' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

-- Triggers already exist; OR REPLACE on the functions is sufficient.
