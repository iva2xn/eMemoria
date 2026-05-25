'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react'
import type { DocumentSubmission } from '@/lib/supabase/types'

function StatusContent() {
  const supabase = createClient()
  const params   = useSearchParams()
  const id       = params.get('id')

  const [submission, setSubmission] = useState<DocumentSubmission | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    // Initial fetch
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

    // Real-time subscription — updates status live without a page refresh
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

  return (
    <div className="max-w-lg mx-auto px-4 py-16 space-y-6">

      {/* Status card */}
      {submission.status === 'pending_review' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 text-center space-y-3">
          <Clock className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-foreground">Under Review</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your documents have been submitted and are currently being reviewed by our staff.
            You will receive an email notification once a decision has been made.
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

      {/* Submission details */}
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

      <p className="text-center text-xs text-muted-foreground">
        Questions? Call us at <strong>+63 918 901 9978</strong> (24/7)
      </p>
    </div>
  )
}

export default function DocumentSubmissionStatusPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">
        <Suspense fallback={
          <div className="py-32 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }>
          <StatusContent />
        </Suspense>
      </main>
    </>
  )
}
