-- ============================================================
-- eMemoria — Document Submissions
-- Migration 011: document_submissions table + documents storage bucket
--
-- What is a document submission?
--   Before a customer can pay for a traditional burial package,
--   they must first submit required documents for staff review.
--   Once approved, they receive an email and can proceed to pay.
--
-- Required documents:
--   - Death Certificate
--   - Barangay Indigency
--   - Valid ID
--   - Medico Legal (optional — only if death was non-natural)
--
-- Status flow:
--   pending_review → approved (staff confirms docs are valid)
--                 → rejected  (staff rejects with a reason)
-- ============================================================

-- Status enum for document submission workflow
CREATE TYPE public.document_submission_status AS ENUM (
  'pending_review',  -- submitted, waiting for staff to check docs
  'approved',        -- docs verified, customer may proceed to payment
  'rejected'         -- docs rejected, reason stored in rejection_reason
);

CREATE TABLE public.document_submissions (
  id  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who submitted — either a logged-in user or a guest
  user_id     uuid  REFERENCES public.profiles (id) ON DELETE CASCADE,
  guest_name  text,
  guest_email text,
  guest_phone text,

  -- What package they want to avail
  product_type  text  NOT NULL,  -- 'package', 'cremation', etc.
  product_ref   text,            -- package name e.g. 'OMB'
  product_label text,            -- display label e.g. 'OMB — ₱25,000'
  product_price numeric(10,2),

  -- Required document storage paths (Supabase Storage: 'document-submissions' bucket)
  doc_death_certificate   text,   -- required
  doc_barangay_indigency  text,   -- required
  doc_valid_id            text,   -- required
  doc_medico_legal        text,   -- optional (non-natural death)

  -- Workflow
  status            document_submission_status  NOT NULL DEFAULT 'pending_review',
  rejection_reason  text,                       -- filled when status = 'rejected'
  reviewed_by       uuid  REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at       timestamptz,

  -- Email notification tracking
  notified_at  timestamptz,  -- when the approval/rejection email was sent

  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX document_submissions_user_id_idx ON public.document_submissions (user_id);
CREATE INDEX document_submissions_status_idx  ON public.document_submissions (status);

CREATE TRIGGER document_submissions_updated_at
  BEFORE UPDATE ON public.document_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.document_submissions ENABLE ROW LEVEL SECURITY;

-- Logged-in users can view and create their own submissions
CREATE POLICY "Users can view their own document submissions"
  ON public.document_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create document submissions"
  ON public.document_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL));

-- Staff and admins can view and update all submissions
CREATE POLICY "Staff and admins can view all document submissions"
  ON public.document_submissions FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Staff and admins can update document submissions"
  ON public.document_submissions FOR UPDATE
  USING (public.is_staff_or_admin());

-- ── Storage bucket: document-submissions ─────────────────────
-- Private bucket — only staff/admins can view uploaded documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-submissions',
  'document-submissions',
  false,
  10485760,  -- 10 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload their own documents
CREATE POLICY "Anyone can upload submission documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'document-submissions');

-- Only staff/admins can view submitted documents
CREATE POLICY "Staff and admins can view submission documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'document-submissions' AND public.is_staff_or_admin());
