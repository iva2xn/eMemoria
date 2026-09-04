'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import {
  ClipboardList, FileText, Clock, CheckCircle2, XCircle,
  ArrowRight, Layers, X, ZoomIn,
} from 'lucide-react'
import type { DocumentSubmission } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: DocumentSubmission['status'] }) {
  const cfg = {
    pending_review: {
      icon: Clock,
      label: 'Under Review',
      cls: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400',
    },
    approved: {
      icon: CheckCircle2,
      label: 'Approved',
      cls: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-500',
    },
    rejected: {
      icon: XCircle,
      label: 'Not Approved',
      cls: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400',
    },
    deleted: {
      icon: XCircle,
      label: 'Cancelled',
      cls: 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400',
    },
  }[status] ?? {
    icon: Clock,
    label: status,
    cls: 'bg-muted border-border text-muted-foreground',
  }

  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

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
      <p className="text-center text-white/30 text-[10px] pb-3 shrink-0">Click anywhere outside to close · Esc to dismiss</p>
    </div>,
    document.body
  )
}

// ── Document card with preview + lightbox ─────────────────────
function DocCard({ label, path }: { label: string; path: string }) {
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

      <div className="bg-background border border-border/70 rounded-xl overflow-hidden">
        {/* Thumbnail / preview area */}
        <div className="relative aspect-[4/3] bg-muted/20">
          {!url ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 transition-colors group"
            >
              <FileText className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">Open PDF</span>
            </a>
          )}
        </div>

        {/* Label row */}
        <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
          {url && isImage && (
            <button onClick={() => setLightbox(true)} className="text-[10px] font-semibold text-primary hover:underline shrink-0">
              View
            </button>
          )}
          {url && !isImage && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-primary hover:underline shrink-0">
              Open
            </a>
          )}
        </div>
      </div>
    </>
  )
}

// ── Availed Services tab ──────────────────────────────────────
function AvaledServicesTab({ submissions }: { submissions: DocumentSubmission[] }) {
  if (submissions.length === 0) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="h-14 w-14 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mx-auto">
          <Layers className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">No services availed yet</p>
        <Button asChild variant="outline" size="sm" className="rounded-xl mt-2">
          <Link href="/services">Browse Services →</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {submissions.map(sub => {
        // Use discounted_price when admin approved a Senior/PWD discount, otherwise original price.
        // No visual indication — the client just sees the effective price.
        const effectivePrice = sub.discounted_price ?? sub.product_price ?? 0
        const billingUrl = `/billing?document_submission_id=${sub.id}&product=${sub.product_type}&label=${encodeURIComponent(sub.product_label ?? '')}&price=${effectivePrice}`

        return (
          <div key={sub.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {sub.product_label ?? sub.product_type}
                </p>
                {sub.product_ref && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Ref: {sub.product_ref}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Submitted {formatDate(sub.created_at)}
                </p>
              </div>
              <StatusBadge status={sub.status} />
            </div>

            {/* Details */}
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {effectivePrice > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Price</p>
                  <p className="font-serif font-bold text-primary text-base">
                    ₱{Number(effectivePrice).toLocaleString('en-PH')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Type</p>
                <p className="font-semibold text-foreground capitalize">{sub.product_type}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Ref ID</p>
                <p className="font-mono text-[10px] text-muted-foreground">{sub.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Rejection reason */}
            {sub.status === 'rejected' && sub.rejection_reason && (
              <div className="px-5 pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-1">Rejection Reason</p>
                <p className="text-xs text-foreground leading-relaxed">{sub.rejection_reason}</p>
              </div>
            )}

            {/* CTAs */}
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              <Link
                href={`/document-submission/status?id=${sub.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                View status <ArrowRight className="h-3 w-3" />
              </Link>
              {sub.status === 'approved' && (
                <Link
                  href={billingUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Proceed to Payment <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Submitted Documents tab ───────────────────────────────────
function SubmittedDocumentsTab({ submissions }: { submissions: DocumentSubmission[] }) {
  if (submissions.length === 0) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="h-14 w-14 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mx-auto">
          <FileText className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">No documents submitted yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {submissions.map(sub => {
        const docs = [
          { label: 'Death Certificate',       path: sub.doc_death_certificate },
          { label: 'Barangay Indigency',       path: sub.doc_barangay_indigency },
          { label: 'Valid ID of Next of Kin',  path: sub.doc_valid_id },
          { label: 'Medico Legal Certificate', path: sub.doc_medico_legal },
          { label: 'Senior/PWD Proof',         path: sub.doc_senior_pwd_proof },
        ].filter((d): d is { label: string; path: string } => !!d.path)

        if (docs.length === 0) return null

        return (
          <div key={sub.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {sub.product_label ?? sub.product_type}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDate(sub.created_at)} · Ref: {sub.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <StatusBadge status={sub.status} />
            </div>

            {/* Document grid with thumbnails */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {docs.map(d => (
                <DocCard key={d.label} label={d.label} path={d.path} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
type TabId = 'services' | 'documents'

export default function BookingsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [submissions, setSubmissions] = useState<DocumentSubmission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<TabId>('services')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login?next=/bookings'); return }

    const { data } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    setSubmissions((data as DocumentSubmission[]) ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  const TABS: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'services',
      label: 'Availed Services',
      icon: <ClipboardList className="h-4 w-4" />,
      count: submissions.length,
    },
    {
      id: 'documents',
      label: 'Submitted Documents',
      icon: <FileText className="h-4 w-4" />,
      count: submissions.filter(s =>
        s.doc_death_certificate || s.doc_barangay_indigency || s.doc_valid_id || s.doc_medico_legal
      ).length,
    },
  ]

  return (
    <ClientLayout>
      <main className="flex-1 bg-background">

        {/* Hero strip */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10">
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Account</p>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-primary" />
              My Bookings
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              View the services you've availed and all documents you've submitted.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/40 border border-border rounded-xl">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t.id
                    ? 'bg-card text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? 'bg-primary/10 text-primary' : 'bg-border text-muted-foreground'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : tab === 'services' ? (
            <AvaledServicesTab submissions={submissions} />
          ) : (
            <SubmittedDocumentsTab submissions={submissions} />
          )}

        </div>
      </main>
    </ClientLayout>
  )
}
