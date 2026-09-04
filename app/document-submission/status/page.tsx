'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, ArrowRight, FileText, X, ZoomIn } from 'lucide-react'
import type { DocumentSubmission } from '@/lib/supabase/types'

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/70 text-sm font-semibold">{label}</p>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <p className="text-center text-white/30 text-[10px] pb-3 shrink-0">Click anywhere outside the image to close</p>
    </div>,
    document.body
  )
}

// ── Single document card ──────────────────────────────────────
function DocCard({ path, label }: { path: string; label: string }) {
  const supabase = createClient()
  const [url,      setUrl]      = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    supabase.storage
      .from('document-submissions')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path, supabase])

  const ext     = path.split('.').pop()?.toLowerCase() ?? ''
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)

  return (
    <>
      {lightbox && url && <Lightbox url={url} label={label} onClose={() => setLightbox(false)} />}

      <div className="bg-muted/30 border border-border/60 rounded-xl overflow-hidden">
        {/* Preview area */}
        <div className="relative bg-muted/20 aspect-[4/3]">
          {!url ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : isImage ? (
            <button
              className="absolute inset-0 w-full h-full group"
              onClick={() => setLightbox(true)}
              title="Click to view full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </button>
          ) : (
            /* PDF — open in new tab */
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 transition-colors group"
            >
              <FileText className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                Open PDF
              </span>
            </a>
          )}
        </div>

        {/* Label */}
        <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          {url && isImage && (
            <button
              onClick={() => setLightbox(true)}
              className="text-[10px] font-semibold text-primary hover:underline shrink-0"
            >
              View
            </button>
          )}
          {url && !isImage && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-primary hover:underline shrink-0"
            >
              Open
            </a>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main status content ───────────────────────────────────────
function StatusContent() {
  const supabase = createClient()
  const params   = useSearchParams()
  const id       = params.get('id')

  const [submission, setSubmission] = useState<DocumentSubmission | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    supabase
      .from('document_submissions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true) }
        else { setSubmission(data as DocumentSubmission) }
        setLoading(false)
      })

    // Real-time: status updates live
    const channel = supabase
      .channel(`doc-submission-status-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'document_submissions', filter: `id=eq.${id}` },
        (payload) => { setSubmission(payload.new as DocumentSubmission) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, id])

  if (loading) {
    return (
      <div className="py-32 flex justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !submission) {
    return (
      <div className="py-32 text-center space-y-4">
        <p className="text-muted-foreground text-sm">Submission not found.</p>
        <Button asChild variant="ghost"><Link href="/services">Back to Services</Link></Button>
      </div>
    )
  }

  const billingUrl = `/billing?document_submission_id=${submission.id}&product=${submission.product_type}&label=${encodeURIComponent(submission.product_label ?? '')}&price=${submission.product_price ?? 0}`

  // Build the list of submitted documents
  const docs: { path: string; label: string }[] = [
    { path: submission.doc_death_certificate,  label: 'Death Certificate' },
    { path: submission.doc_barangay_indigency, label: 'Barangay Indigency' },
    { path: submission.doc_valid_id,           label: 'Valid ID' },
    { path: submission.doc_medico_legal,       label: 'Medico Legal' },
    { path: submission.doc_senior_pwd_proof,   label: 'Senior/PWD Proof' },
  ].filter((d): d is { path: string; label: string } => !!d.path)

  return (
    <div className="max-w-lg mx-auto px-4 py-16 space-y-6">

      {/* ── Status card ── */}
      {submission.status === 'pending_review' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 text-center space-y-3">
          <Clock className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-foreground">Under Review</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your documents have been submitted and are currently being reviewed by our staff.
            You will be notified here and in your{' '}
            <Link href="/notifications" className="text-primary font-semibold hover:underline">
              notifications
            </Link>{' '}
            once a decision has been made.
          </p>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            This page updates automatically
          </p>
        </div>
      )}

      {submission.status === 'approved' && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-foreground">Documents Approved</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your documents have been verified. You may now proceed to the payment portal
            to complete your reservation.
          </p>
          <Button asChild className="w-full rounded-xl font-bold mt-2">
            <Link href={billingUrl}>
              Proceed to Payment <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {submission.status === 'rejected' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center space-y-3">
          <XCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-foreground">Submission Not Approved</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unfortunately, your document submission was not approved. Please contact our office for assistance.
          </p>
          {submission.rejection_reason && (
            <div className="bg-background border border-border rounded-xl p-4 text-left mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
              <p className="text-sm text-foreground">{submission.rejection_reason}</p>
            </div>
          )}
          <Button asChild variant="outline" className="w-full rounded-xl mt-2">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      )}

      {/* ── Submission details ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Submission Details</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Package</span>
          <span className="font-semibold text-foreground">{submission.product_label ?? submission.product_type}</span>
        </div>
        {submission.product_price && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-serif font-bold text-primary">₱{Number(submission.product_price).toLocaleString('en-PH')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Submitted</span>
          <span className="text-foreground font-mono text-xs">{new Date(submission.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="text-foreground font-mono text-xs">{submission.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* ── Submitted documents ── */}
      {docs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Submitted Documents</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {docs.map(d => (
              <DocCard key={d.label} path={d.path} label={d.label} />
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Questions? Call us at <strong>+63 918 901 9978</strong> (24/7)
      </p>
    </div>
  )
}

export default function DocumentSubmissionStatusPage() {
  return (
    <ClientLayout>
      <main className="flex-1 bg-background">
        <Suspense fallback={
          <div className="py-32 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }>
          <StatusContent />
        </Suspense>
      </main>
    </ClientLayout>
  )
}
