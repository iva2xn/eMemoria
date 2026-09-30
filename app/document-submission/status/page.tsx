'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, XCircle, Clock, ArrowRight, FileText, X, ZoomIn,
  CreditCard, Receipt, Ban,
} from 'lucide-react'
import type { DocumentSubmission, Payment } from '@/lib/supabase/types'

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
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
      <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-white/70 text-sm font-semibold">{label}</p>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <p className="text-center text-white/30 text-[10px] pb-3 shrink-0">Click outside the image to close</p>
    </div>,
    document.body
  )
}

// ── Document card ─────────────────────────────────────────────
function DocCard({ path, label, signedUrl }: { path: string; label: string; signedUrl: string | null }) {
  const [lightbox, setLightbox] = useState(false)
  const ext     = path.split('.').pop()?.toLowerCase() ?? ''
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)

  return (
    <>
      {lightbox && signedUrl && <Lightbox url={signedUrl} label={label} onClose={() => setLightbox(false)} />}

      <div className="bg-muted/30 border border-border/60 rounded-xl overflow-hidden">
        <div className="relative bg-muted/20 aspect-[4/3]">
          {!signedUrl ? (
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
              <img src={signedUrl} alt={label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </button>
          ) : (
            <a
              href={signedUrl}
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
        <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          {signedUrl && isImage && (
            <button onClick={() => setLightbox(true)} className="text-[10px] font-semibold text-primary hover:underline shrink-0">View</button>
          )}
          {signedUrl && !isImage && (
            <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-primary hover:underline shrink-0">Open</a>
          )}
        </div>
      </div>
    </>
  )
}

// ── Payment status CTA (replaces "Proceed to Payment" once paid) ──
function PaymentStatusCTA({ payment, submissionId }: { payment: Payment; submissionId: string }) {
  if (payment.status === 'pending') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Your payment is under review</p>
        </div>
        <Button asChild variant="outline" className="w-full rounded-xl font-semibold">
          <Link href={`/payments?filter=pending`}>
            <CreditCard className="h-4 w-4 mr-2" /> View Payment Status
          </Link>
        </Button>
      </div>
    )
  }

  if (payment.status === 'approved') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">Payment Successful</p>
        </div>
        <Button asChild className="w-full rounded-xl font-bold">
          <Link href={`/payments?highlight=${submissionId}&filter=approved`}>
            <Receipt className="h-4 w-4 mr-2" /> Show Receipt
          </Link>
        </Button>
      </div>
    )
  }

  if (payment.status === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Payment Not Approved</p>
        </div>
        <Button asChild variant="outline" className="w-full rounded-xl font-semibold">
          <Link href="/payments?filter=rejected">
            <CreditCard className="h-4 w-4 mr-2" /> Show Receipt
          </Link>
        </Button>
      </div>
    )
  }

  if (payment.status === 'voided') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700">
          <Ban className="h-5 w-5 text-zinc-500 shrink-0" />
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Payment Voided</p>
        </div>
        <Button asChild variant="outline" className="w-full rounded-xl font-semibold">
          <Link href="/payments?filter=rejected">
            <CreditCard className="h-4 w-4 mr-2" /> View Details
          </Link>
        </Button>
      </div>
    )
  }

  return null
}

// ── Main status content ───────────────────────────────────────
function StatusContent() {
  const supabase = useMemo(() => createClient(), [])
  const params   = useSearchParams()
  const id       = params.get('id')

  const [submission, setSubmission] = useState<DocumentSubmission | null>(null)
  const [payment,    setPayment]    = useState<Payment | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const fetchSignedUrls = useCallback(async (sub: DocumentSubmission) => {
    const paths = [
      sub.doc_death_certificate,
      sub.doc_barangay_indigency,
      sub.doc_valid_id,
      sub.doc_medico_legal,
      sub.doc_senior_pwd_proof,
    ].filter(Boolean) as string[]
    if (paths.length === 0) return
    const { data: urlData } = await supabase.storage
      .from('document-submissions')
      .createSignedUrls(paths, 3600)
    if (urlData) {
      const map: Record<string, string> = {}
      urlData.forEach(item => { if (item.signedUrl && item.path) map[item.path] = item.signedUrl })
      setSignedUrls(map)
    }
  }, [supabase])

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from('document_submissions')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      const sub = data as DocumentSubmission
      setSubmission(sub)
      setLoading(false)
      fetchSignedUrls(sub)

      // Check if a payment already exists for this submission
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('document_submission_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (payData) setPayment(payData as Payment)
    }

    fetchAll()

    // Real-time: listen for document_submission status updates
    const docChannel = supabase
      .channel(`doc-status-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'document_submissions', filter: `id=eq.${id}` },
        (payload) => { setSubmission(payload.new as DocumentSubmission) }
      )
      .subscribe()

    // Real-time: listen for payment inserts/updates linked to this submission
    const payChannel = supabase
      .channel(`doc-payment-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments', filter: `document_submission_id=eq.${id}` },
        (payload) => { setPayment(payload.new as Payment) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `document_submission_id=eq.${id}` },
        (payload) => { setPayment(payload.new as Payment) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(docChannel)
      supabase.removeChannel(payChannel)
    }
  }, [supabase, id, fetchSignedUrls])

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

  const effectivePrice = submission.product_price ?? 0
  const billingUrl = `/billing?document_submission_id=${submission.id}&product=${submission.product_type}&label=${encodeURIComponent(submission.product_label ?? '')}&price=${effectivePrice}${submission.senior_pwd_discount ? '&senior_pwd=1' : ''}`

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
          <h2 className="font-serif text-xl font-bold text-foreground">Your Documents Are Being Reviewed</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We have received your documents and our staff is reviewing them now.
            You will get a notification here once a decision has been made — no need to refresh.
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
          <h2 className="font-serif text-xl font-bold text-foreground">Documents Approved!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your documents have been verified by our staff.
            {!payment && ' You can now proceed to payment to complete your reservation.'}
          </p>
          {/* Show payment status CTA if payment exists, otherwise Proceed to Payment */}
          {payment ? (
            <PaymentStatusCTA payment={payment} submissionId={submission.id} />
          ) : (
            <Button asChild className="w-full rounded-xl font-bold mt-2">
              <Link href={billingUrl}>
                Proceed to Payment <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {submission.status === 'rejected' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-6 text-center space-y-3">
          <XCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-foreground">Documents Need Attention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our staff reviewed your documents and found an issue. Please contact us so we can help you.
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
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Price</span>
            {submission.senior_pwd_discount && submission.discounted_price ? (
              <span className="text-right space-y-0.5">
                <span className="block text-muted-foreground line-through text-xs">₱{Number(submission.product_price).toLocaleString('en-PH')}</span>
                <span className="block text-[10px] text-muted-foreground">20% Senior/PWD discount</span>
                <span className="block font-serif font-bold text-primary">₱{Number(submission.discounted_price).toLocaleString('en-PH')}</span>
              </span>
            ) : (
              <span className="font-serif font-bold text-primary">₱{Number(submission.product_price).toLocaleString('en-PH')}</span>
            )}
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
              <DocCard
                key={d.label}
                path={d.path}
                label={d.label}
                signedUrl={signedUrls[d.path] ?? null}
              />
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
