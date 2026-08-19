'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import {
  Badge, SectionHeader, EmptyState, Spinner,
  FilterPills, SearchInput, inputCls, type BadgeVariant,
} from './admin-primitives'
import {
  FileText, ExternalLink, CheckCircle2, XCircle, X,
  Trash2, RotateCcw, Eye, Download, ZoomIn,
  AlertTriangle, ChevronLeft, Printer,
} from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { DocumentSubmission, DocumentSubmissionStatus, UserRole } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────
type SubmissionRow = DocumentSubmission & {
  profileName?: string
  profileEmail?: string
}

type ActiveSubTab = 'active' | 'deleted'

const DELETE_REASONS = [
  'Duplicate submission',
  'Client request',
  'Data entry error',
  'Spam / test record',
  'Other',
] as const

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
}
function clientName(r: SubmissionRow) {
  return r.profileName ?? r.guest_name ?? '—'
}
function clientEmail(r: SubmissionRow) {
  return r.profileEmail ?? r.guest_email ?? ''
}
function statusVariant(s: string): BadgeVariant {
  if (s === 'approved')       return 'green'
  if (s === 'pending_review') return 'amber'
  if (s === 'deleted')        return 'muted'
  return 'red'
}
function statusLabel(s: string) {
  if (s === 'pending_review') return 'Pending'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Days remaining before permanent auto-delete
function daysUntilPermanent(deletedAt: string | null) {
  if (!deletedAt) return 30
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86_400_000)
  return Math.max(0, diff)
}


// ── DocLink — signed URL viewer ───────────────────────────────
function DocLink({ path, label, onPreview }: {
  path: string | null
  label: string
  onPreview?: (url: string, label: string) => void
}) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    supabase.storage.from('document-submissions')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path, supabase])

  if (!path) return <span className="text-[10px] text-muted-foreground/40 italic">—</span>
  if (!url)  return <span className="text-[10px] text-muted-foreground/40 italic">loading…</span>

  const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(path)

  return (
    <div className="flex items-center gap-1.5">
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline underline-offset-2">
        <FileText className="h-3 w-3" />{label}<ExternalLink className="h-2.5 w-2.5" />
      </a>
      {isImage && onPreview && (
        <button onClick={() => onPreview(url, label)}
          className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
          <ZoomIn className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ── Fullscreen image lightbox ─────────────────────────────────
function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-white">{label}</p>
        <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
      </div>
    </div>,
    document.body
  )
}


// ── Review & Approve Modal ────────────────────────────────────
function ReviewApproveModal({ submission, onClose, onApproved, onRejected }: {
  submission: SubmissionRow
  onClose: () => void
  onApproved: (id: string, discount: boolean, discountedPrice: number | null) => void
  onRejected: (id: string, reason: string) => void
}) {
  const supabase = createClient()
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null)
  const [seniorPwd, setSeniorPwd] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const basePrice = submission.product_price ?? 0
  const discountedPrice = seniorPwd ? Math.round(basePrice * 0.8 * 100) / 100 : basePrice
  const discountAmount  = basePrice - discountedPrice

  const docs = [
    { path: submission.doc_death_certificate,  label: 'Death Certificate' },
    { path: submission.doc_barangay_indigency, label: 'Barangay Indigency' },
    { path: submission.doc_valid_id,           label: 'Valid ID' },
    { path: submission.doc_medico_legal,       label: 'Medico Legal' },
  ].filter(d => d.path)

  const handleApprove = async () => {
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const actorName = user
        ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
        : 'Staff'

      await supabase.from('document_submissions').update({
        status: 'approved',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        senior_pwd_discount: seniorPwd,
        discounted_price: seniorPwd ? discountedPrice : null,
      }).eq('id', submission.id)

      const recipientEmail = clientEmail(submission)
      if (recipientEmail) {
        await fetch('/api/notify-document-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            availmentId: submission.id, status: 'approved',
            recipientEmail, recipientName: clientName(submission),
            packageLabel: submission.product_label ?? submission.product_type,
            packagePrice: seniorPwd ? discountedPrice : submission.product_price,
            productType: submission.product_type,
          }),
        })
      }

      await logActivity({
        category: 'log', event_type: 'doc_submission_approved',
        entity_table: 'document_submissions', entity_id: submission.id,
        actor_id: user?.id, actor_name: actorName,
        message: `${actorName} approved documents from ${clientName(submission)} for ${submission.product_label ?? submission.product_type}${seniorPwd ? ' (Senior/PWD 20% discount applied)' : ''}`,
        metadata: { client: clientName(submission), package: submission.product_label, seniorPwd, discountedPrice: seniorPwd ? discountedPrice : null },
      })

      onApproved(submission.id, seniorPwd, seniorPwd ? discountedPrice : null)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Rejection reason is required.'); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const actorName = user
        ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
        : 'Staff'

      await supabase.from('document_submissions').update({
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      }).eq('id', submission.id)

      const recipientEmail = clientEmail(submission)
      if (recipientEmail) {
        await fetch('/api/notify-document-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            availmentId: submission.id, status: 'rejected',
            recipientEmail, recipientName: clientName(submission),
            packageLabel: submission.product_label ?? submission.product_type,
            packagePrice: submission.product_price,
            productType: submission.product_type,
            rejectionReason: rejectReason.trim(),
          }),
        })
      }

      await logActivity({
        category: 'log', event_type: 'doc_submission_rejected',
        entity_table: 'document_submissions', entity_id: submission.id,
        actor_id: user?.id, actor_name: actorName,
        message: `${actorName} rejected documents from ${clientName(submission)}: "${rejectReason.trim().slice(0, 80)}"`,
        metadata: { client: clientName(submission), reason: rejectReason.trim() },
      })

      onRejected(submission.id, rejectReason.trim())
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
      setLoading(false)
    }
  }

  return createPortal(
    <>
      {lightbox && <Lightbox url={lightbox.url} label={lightbox.label} onClose={() => setLightbox(null)} />}
      <div className="fixed inset-0 z-[200] overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="flex min-h-full items-start justify-center p-4 pt-8">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Eye className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Review Submission</h3>
                  <p className="text-[10px] text-muted-foreground">{clientName(submission)} · {submission.product_label ?? submission.product_type}</p>
                </div>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Client info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Client',   value: clientName(submission) },
                  { label: 'Email',    value: clientEmail(submission) || '—' },
                  { label: 'Phone',    value: submission.guest_phone ?? '—' },
                  { label: 'Submitted', value: fmtDate(submission.created_at) },
                  { label: 'Package',  value: submission.product_label ?? submission.product_type },
                  { label: 'Price',    value: submission.product_price ? `₱${Number(submission.product_price).toLocaleString('en-PH')}` : '—' },
                ].map(f => (
                  <div key={f.label} className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                    <p className="font-semibold text-foreground truncate">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Documents */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Submitted Documents</p>
                {docs.length === 0
                  ? <p className="text-xs text-muted-foreground italic">No documents attached.</p>
                  : (
                    <div className="grid grid-cols-2 gap-2">
                      {docs.map(d => (
                        <DocImageCard key={d.label} path={d.path!} label={d.label} onLightbox={(url, label) => setLightbox({ url, label })} />
                      ))}
                    </div>
                  )
                }
              </div>

              {/* Senior/PWD discount */}
              {submission.status === 'pending_review' && !rejectMode && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" checked={seniorPwd} onChange={e => setSeniorPwd(e.target.checked)}
                        className="sr-only peer" />
                      <div className="h-5 w-5 rounded border-2 border-border peer-checked:border-amber-500 peer-checked:bg-amber-500 transition-all flex items-center justify-center">
                        {seniorPwd && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Senior Citizen / PWD — 20% Discount</p>
                      <p className="text-[11px] text-muted-foreground">Check if client has a valid Senior ID or PWD card</p>
                    </div>
                  </label>
                  {seniorPwd && basePrice > 0 && (
                    <div className="bg-card border border-border/60 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Original Price</span><span className="font-mono">₱{basePrice.toLocaleString('en-PH')}</span></div>
                      <div className="flex justify-between text-amber-600"><span>20% Discount</span><span className="font-mono">− ₱{discountAmount.toLocaleString('en-PH')}</span></div>
                      <div className="flex justify-between font-bold text-primary border-t border-border/40 pt-1.5"><span>Amount Payable</span><span className="font-mono">₱{discountedPrice.toLocaleString('en-PH')}</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* Reject reason */}
              {rejectMode && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rejection Reason <span className="text-red-500">*</span></label>
                  <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="e.g. Death certificate is unclear, please resubmit a clearer copy."
                    className={`${inputCls} h-auto resize-none py-2.5`} />
                  <p className="text-[10px] text-muted-foreground">This will be included in the rejection email sent to the client.</p>
                </div>
              )}

              {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

              {/* Actions */}
              {submission.status === 'pending_review' && (
                <div className="flex gap-2 pt-1">
                  {!rejectMode ? (
                    <>
                      <button onClick={() => setRejectMode(true)}
                        className="flex-1 h-10 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-all flex items-center justify-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button onClick={handleApprove} disabled={loading}
                        className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {loading ? 'Approving…' : 'Approve & Notify'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setRejectMode(false); setError('') }}
                        className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                        Back
                      </button>
                      <button onClick={handleReject} disabled={loading || !rejectReason.trim()}
                        className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 transition-all">
                        {loading ? 'Rejecting…' : 'Reject & Notify'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// Document image card inside the review modal
function DocImageCard({ path, label, onLightbox }: {
  path: string
  label: string
  onLightbox: (url: string, label: string) => void
}) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)
  const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(path)

  useEffect(() => {
    supabase.storage.from('document-submissions')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path, supabase])

  return (
    <div className="bg-muted/30 border border-border/60 rounded-xl overflow-hidden">
      {isImage && url ? (
        <button className="w-full relative group" onClick={() => onLightbox(url, label)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ) : (
        <div className="h-32 flex items-center justify-center bg-muted/20">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground truncate">{label}</p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline shrink-0 flex items-center gap-0.5">
            Open<ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  )
}


// ── Delete Modal ──────────────────────────────────────────────
function DeleteModal({ submission, onClose, onDeleted }: {
  submission: SubmissionRow
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const supabase = createClient()
  const [reason,  setReason]  = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const isOther   = reason === 'Other'
  const canSubmit = reason && (!isOther || comment.trim().length > 0)

  const handle = async () => {
    if (!canSubmit) { setError('Please select a reason.'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'
    const { error: err } = await supabase.from('document_submissions').update({
      status:         'deleted',
      delete_reason:  reason,
      delete_comment: isOther ? comment.trim() : (comment.trim() || null),
      deleted_by:     user?.id ?? null,
      deleted_at:     new Date().toISOString(),
    }).eq('id', submission.id)
    if (err) { setError(err.message); setLoading(false); return }
    await logActivity({
      category: 'log', event_type: 'doc_submission_deleted',
      entity_table: 'document_submissions', entity_id: submission.id,
      actor_id: user?.id, actor_name: actorName,
      message: `${actorName} deleted submission from ${clientName(submission)} — ${reason}`,
      metadata: { reason, comment },
    })
    setLoading(false); onDeleted(submission.id); onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center"><Trash2 className="h-4 w-4 text-red-500" /></div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Delete Submission</h3>
              <p className="text-[10px] text-muted-foreground">Moves to Recently Deleted. Auto-purges after 30 days.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-semibold">{clientName(submission)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span>{submission.product_label ?? submission.product_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{fmtDate(submission.created_at)}</span></div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason <span className="text-red-500">*</span></label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
              <option value="">— Select a reason —</option>
              {DELETE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {isOther && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Reason <span className="text-red-500">*</span></label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe why…" className={`${inputCls} h-auto resize-none py-2.5`} />
            </div>
          )}
          {!isOther && reason && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comment (optional)</label>
              <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Any extra notes…" className={`${inputCls} h-auto resize-none py-2.5`} />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
            <button onClick={handle} disabled={!canSubmit || loading} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 transition-all">
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Permanent Delete Confirm ──────────────────────────────────
function PermanentDeleteConfirm({ ids, onClose, onConfirmed }: {
  ids: string[]
  onClose: () => void
  onConfirmed: (ids: string[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const handle = async () => {
    setLoading(true)
    await supabase.from('document_submissions').delete().in('id', ids)
    setLoading(false); onConfirmed(ids); onClose()
  }
  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Delete forever?</strong> This will permanently remove {ids.length === 1 ? 'this record' : `${ids.length} records`} and cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
            <button onClick={handle} disabled={loading} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 transition-all">
              {loading ? 'Deleting…' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Recover Confirm ───────────────────────────────────────────
function RecoverConfirm({ submission, onClose, onRecovered }: {
  submission: SubmissionRow
  onClose: () => void
  onRecovered: (id: string) => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('document_submissions').update({
      status: 'pending_review', delete_reason: null, delete_comment: null, deleted_by: null, deleted_at: null,
    }).eq('id', submission.id)
    await logActivity({
      category: 'log', event_type: 'doc_submission_recovered',
      entity_table: 'document_submissions', entity_id: submission.id,
      actor_id: user?.id, actor_name: 'Staff',
      message: `Recovered deleted submission from ${clientName(submission)}`,
      metadata: {},
    })
    setLoading(false); onRecovered(submission.id); onClose()
  }
  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              This will restore the submission from <strong>{clientName(submission)}</strong> and set it back to <strong>Pending Review</strong>.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">Cancel</button>
            <button onClick={handle} disabled={loading} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all">
              {loading ? 'Recovering…' : 'Recover'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}


// ── Export ────────────────────────────────────────────────────
async function exportSubmissionsPDF(rows: SubmissionRow[], title: string) {
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const PRIMARY: [number, number, number] = [34, 107, 66]
  const LIGHT:   [number, number, number] = [240, 247, 243]
  const DARK:    [number, number, number] = [30,  40,  35]

  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setFillColor(...PRIMARY); doc.rect(0, 0, pageW, 28, 'F')
  try {
    const res = await fetch('/logo.png'); const blob = await res.blob()
    const b64 = await new Promise<string>(resolve => { const r = new FileReader(); r.onloadend = () => resolve(r.result as string); r.readAsDataURL(blob) })
    doc.addImage(b64, 'PNG', 8, 4, 20, 20)
  } catch { /* logo optional */ }
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13)
  doc.text('M. P. GAYETA', 32, 12)
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(200,230,210)
  doc.text('Funeral Services', 32, 18)
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(255,255,255)
  doc.text(title, pageW / 2, 16, { align: 'center' })
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(200,230,210)
  doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageW - 8, 10, { align: 'right' })

  doc.setFillColor(...LIGHT); doc.rect(0, 28, pageW, 10, 'F')
  doc.setFontSize(7.5); doc.setTextColor(...DARK)
  doc.text(`Total records: ${rows.length}`, pageW / 2, 34.5, { align: 'center' })

  autoTable(doc, {
    startY: 42,
    head: [['#','Date','Client','Email','Package','Price','Status','Discount','Reason']],
    body: rows.map((r, i) => [
      i + 1,
      fmtDate(r.created_at),
      clientName(r),
      clientEmail(r) || '—',
      r.product_label ?? r.product_type,
      r.product_price ? `PHP ${Number(r.product_price).toLocaleString('en-PH')}` : '—',
      statusLabel(r.status),
      r.senior_pwd_discount ? `PHP ${Number(r.discounted_price ?? r.product_price).toLocaleString('en-PH')} (20% off)` : '—',
      r.rejection_reason ?? r.delete_reason ?? '—',
    ]),
    styles: { fontSize: 7, cellPadding: 2, textColor: DARK, lineColor: [220,230,225], lineWidth: 0.2 },
    headStyles: { fillColor: PRIMARY, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [250,253,251] },
    margin: { left: 8, right: 8 },
    didDrawPage: (data: { pageNumber: number }) => {
      const pg = doc.getNumberOfPages()
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(150,160,155)
      doc.text(`M. P. Gayeta Funeral Services · Funeral Service Records · Page ${data.pageNumber} of ${pg}`, pageW / 2, pageH - 5, { align: 'center' })
      doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.3)
      doc.line(8, pageH - 8, pageW - 8, pageH - 8)
    },
  })
  doc.save(`funeral-services-${new Date().toISOString().slice(0,10)}.pdf`)
}

async function exportSubmissionsDOCX(rows: SubmissionRow[], title: string) {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  } = await import('docx')

  const PRIMARY_HEX = '226B42'
  const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const CELL_BORDERS = { top: BORDER_NONE, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2EAE6' }, left: BORDER_NONE, right: BORDER_NONE }

  const hCell = (text: string) => new TableCell({
    shading: { type: ShadingType.SOLID, color: PRIMARY_HEX }, borders: CELL_BORDERS,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF', font: 'Calibri' })] })],
  })
  const dCell = (text: string, bold = false) => new TableCell({
    borders: CELL_BORDERS,
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 16, color: '1E2823', font: 'Calibri' })] })],
  })

  const doc = new Document({ sections: [{ children: [
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'M. P. GAYETA FUNERAL SERVICES', bold: true, size: 32, color: PRIMARY_HEX, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, size: 24, color: '666666', font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleString('en-PH')}  |  Records: ${rows.length}`, size: 18, color: '888888', font: 'Calibri' })] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['#','Date','Client','Package','Price','Status','Discount'].map(hCell) }),
        ...rows.map((r, i) => new TableRow({ children: [
          dCell(String(i + 1)),
          dCell(fmtDate(r.created_at)),
          dCell(clientName(r), true),
          dCell(r.product_label ?? r.product_type),
          dCell(r.product_price ? `PHP ${Number(r.product_price).toLocaleString('en-PH')}` : '—'),
          dCell(statusLabel(r.status)),
          dCell(r.senior_pwd_discount ? `PHP ${Number(r.discounted_price ?? r.product_price).toLocaleString('en-PH')}` : '—'),
        ]})),
      ],
    }),
  ]}]})

  const buffer = await Packer.toBlob(doc)
  const url = URL.createObjectURL(buffer)
  const a = document.createElement('a'); a.href = url
  a.download = `funeral-services-${new Date().toISOString().slice(0,10)}.docx`
  a.click(); URL.revokeObjectURL(url)
}


// ── Record Detail View ────────────────────────────────────────
function RecordDetail({ submission, currentRole, onBack, onUpdated }: {
  submission: SubmissionRow
  currentRole: UserRole
  onBack: () => void
  onUpdated: (updated: Partial<SubmissionRow> & { id: string }) => void
}) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [lightbox,   setLightbox]   = useState<{ url: string; label: string } | null>(null)
  const [exporting,  setExporting]  = useState(false)

  const docs = [
    { path: submission.doc_death_certificate,  label: 'Death Certificate' },
    { path: submission.doc_barangay_indigency, label: 'Barangay Indigency' },
    { path: submission.doc_valid_id,           label: 'Valid ID' },
    { path: submission.doc_medico_legal,       label: 'Medico Legal' },
  ].filter(d => d.path)

  return (
    <div className="space-y-5">
      {lightbox && <Lightbox url={lightbox.url} label={lightbox.label} onClose={() => setLightbox(null)} />}
      {reviewOpen && (
        <ReviewApproveModal
          submission={submission}
          onClose={() => setReviewOpen(false)}
          onApproved={(id, discount, dp) => { onUpdated({ id, status: 'approved', senior_pwd_discount: discount, discounted_price: dp }); setReviewOpen(false) }}
          onRejected={(id, reason) => { onUpdated({ id, status: 'rejected', rejection_reason: reason }); setReviewOpen(false) }}
        />
      )}
      {deleteOpen && (
        <DeleteModal
          submission={submission}
          onClose={() => setDeleteOpen(false)}
          onDeleted={id => { onUpdated({ id, status: 'deleted' }); onBack() }}
        />
      )}

      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to list
        </button>
        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <button onClick={async () => { setExporting(true); await exportSubmissionsPDF([submission], 'Service Record'); setExporting(false) }}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          <button onClick={async () => { setExporting(true); await exportSubmissionsDOCX([submission], 'Service Record'); setExporting(false) }}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
            <Printer className="h-3.5 w-3.5" /> DOCX
          </button>
          {submission.status === 'pending_review' && currentRole === 'admin' && (
            <button onClick={() => setReviewOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all">
              <Eye className="h-3.5 w-3.5" /> Review & Approve
            </button>
          )}
          {submission.status !== 'deleted' && currentRole === 'admin' && (
            <button onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border border-red-200 text-red-600 text-[10px] font-semibold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Record card */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Header strip */}
        <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary/70 mb-0.5">Funeral Service Record</p>
            <h2 className="text-lg font-bold text-foreground">{clientName(submission)}</h2>
            <p className="text-xs text-muted-foreground">{clientEmail(submission)}</p>
          </div>
          <div className="text-right">
            <Badge label={statusLabel(submission.status)} variant={statusVariant(submission.status)} />
            <p className="text-[10px] text-muted-foreground mt-1">{fmtDate(submission.created_at)}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 bg-card">
          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Phone',    value: submission.guest_phone ?? '—' },
              { label: 'Package',  value: submission.product_label ?? submission.product_type },
              { label: 'Product',  value: submission.product_type },
              { label: 'Ref',      value: submission.product_ref ?? '—' },
              { label: 'Price',    value: submission.product_price ? `₱${Number(submission.product_price).toLocaleString('en-PH')}` : '—' },
              { label: 'Reviewed', value: submission.reviewed_at ? fmtDate(submission.reviewed_at) : '—' },
            ].map(f => (
              <div key={f.label} className="bg-muted/30 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                <p className="font-semibold text-foreground">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Senior/PWD discount */}
          {submission.senior_pwd_discount && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-amber-600">%</span>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Senior/PWD 20% Discount Applied</p>
                {submission.discounted_price && (
                  <p className="text-[11px] text-muted-foreground">
                    Original: ₱{Number(submission.product_price).toLocaleString('en-PH')} →
                    Payable: <strong className="text-amber-600">₱{Number(submission.discounted_price).toLocaleString('en-PH')}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {submission.rejection_reason && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500/70 mb-1">Rejection Reason</p>
              <p className="text-xs text-foreground">{submission.rejection_reason}</p>
            </div>
          )}

          {/* Documents */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Documents</p>
            {docs.length === 0
              ? <p className="text-xs text-muted-foreground italic">No documents attached.</p>
              : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {docs.map(d => (
                    <DocImageCard key={d.label} path={d.path!} label={d.label}
                      onLightbox={(url, label) => setLightbox({ url, label })} />
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Main Tab ──────────────────────────────────────────────────
export function DocumentSubmissionsTab({ currentRole = 'admin' }: { currentRole?: UserRole }) {
  const supabase = createClient()
  const [rows,        setRows]        = useState<SubmissionRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<DocumentSubmissionStatus | 'all'>('all')
  const [search,      setSearch]      = useState('')
  const [subTab,      setSubTab]      = useState<ActiveSubTab>('active')
  const [detailRow,   setDetailRow]   = useState<SubmissionRow | null>(null)
  const [reviewRow,   setReviewRow]   = useState<SubmissionRow | null>(null)
  const [deleteRow,   setDeleteRow]   = useState<SubmissionRow | null>(null)
  const [recoverRow,  setRecoverRow]  = useState<SubmissionRow | null>(null)
  const [permDelIds,  setPermDelIds]  = useState<string[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting,   setExporting]   = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: submissions } = await supabase
      .from('document_submissions').select('*').order('created_at', { ascending: false })
    if (!submissions) { setLoading(false); return }
    const userIds = [...new Set(submissions.filter(s => s.user_id).map(s => s.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
    }
    setRows(submissions.map(s => ({
      ...(s as DocumentSubmission),
      profileName:  s.user_id ? profileMap[s.user_id]?.name  : undefined,
      profileEmail: s.user_id ? profileMap[s.user_id]?.email : undefined,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Close export menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const updateRow = (updated: Partial<SubmissionRow> & { id: string }) => {
    setRows(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    if (detailRow?.id === updated.id) setDetailRow(prev => prev ? { ...prev, ...updated } : null)
  }

  const activeRows  = rows.filter(r => r.status !== 'deleted')
  const deletedRows = rows.filter(r => r.status === 'deleted')

  const q = search.toLowerCase()
  const filteredActive = activeRows
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => !q || [clientName(r), clientEmail(r), r.product_label, r.product_type].some(v => v?.toLowerCase().includes(q)))

  const filterOptions = [
    { value: 'all'            as const, label: `All (${activeRows.length})` },
    { value: 'pending_review' as const, label: `Pending (${activeRows.filter(r => r.status === 'pending_review').length})` },
    { value: 'approved'       as const, label: `Approved (${activeRows.filter(r => r.status === 'approved').length})` },
    { value: 'rejected'       as const, label: `Rejected (${activeRows.filter(r => r.status === 'rejected').length})` },
  ]

  const toggleSelect  = (id: string) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const selectAll     = (checked: boolean) => setSelectedIds(checked ? new Set(filteredActive.map(r => r.id)) : new Set())
  const allSelected   = filteredActive.length > 0 && filteredActive.every(r => selectedIds.has(r.id))
  const someSelected  = filteredActive.some(r => selectedIds.has(r.id))

  const exportRows = selectedIds.size > 0
    ? rows.filter(r => selectedIds.has(r.id))
    : (subTab === 'active' ? filteredActive : deletedRows)

  if (loading) return <Spinner />

  // ── Detail view ──────────────────────────────────────────────
  if (detailRow) {
    return (
      <RecordDetail
        submission={detailRow}
        currentRole={currentRole}
        onBack={() => setDetailRow(null)}
        onUpdated={updateRow}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Modals */}
      {reviewRow  && <ReviewApproveModal submission={reviewRow}  onClose={() => setReviewRow(null)}  onApproved={(id, d, dp) => { updateRow({ id, status: 'approved', senior_pwd_discount: d, discounted_price: dp }) }} onRejected={(id, r) => updateRow({ id, status: 'rejected', rejection_reason: r })} />}
      {deleteRow  && <DeleteModal        submission={deleteRow}  onClose={() => setDeleteRow(null)}  onDeleted={id => updateRow({ id, status: 'deleted' })} />}
      {recoverRow && <RecoverConfirm     submission={recoverRow} onClose={() => setRecoverRow(null)} onRecovered={id => updateRow({ id, status: 'pending_review', delete_reason: null, delete_comment: null, deleted_by: null, deleted_at: null })} />}
      {permDelIds && <PermanentDeleteConfirm ids={permDelIds} onClose={() => setPermDelIds(null)} onConfirmed={ids => { setRows(prev => prev.filter(r => !ids.includes(r.id))); setSelectedIds(new Set()) }} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Funeral Services</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{activeRows.length} record{activeRows.length !== 1 ? 's' : ''} · {deletedRows.length} deleted</p>
        </div>
        <div ref={exportRef} className="relative flex items-center gap-2">
          <div className="flex items-stretch rounded-xl overflow-hidden border border-primary">
            <button onClick={async () => { setExporting(true); await exportSubmissionsPDF(exportRows, 'Funeral Service Records'); setExporting(false) }}
              disabled={exporting || exportRows.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
            <button onClick={() => setShowExportMenu(v => !v)}
              className="h-9 px-2 bg-primary/90 text-primary-foreground hover:bg-primary/80 transition-colors border-l border-primary-foreground/20">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
              <button onClick={async () => { setShowExportMenu(false); setExporting(true); await exportSubmissionsPDF(exportRows, 'Funeral Service Records'); setExporting(false) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors">
                <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export as PDF
              </button>
              <div className="border-t border-border/50" />
              <button onClick={async () => { setShowExportMenu(false); setExporting(true); await exportSubmissionsDOCX(exportRows, 'Funeral Service Records'); setExporting(false) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors">
                <Printer className="h-3.5 w-3.5 text-primary" /> Export as DOCX
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 bg-muted/40 border border-border/60 rounded-xl p-1 w-fit">
        <button onClick={() => setSubTab('active')}
          className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${subTab === 'active' ? 'bg-card shadow-sm text-foreground border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
          Active ({activeRows.length})
        </button>
        <button onClick={() => setSubTab('deleted')}
          className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${subTab === 'deleted' ? 'bg-card shadow-sm text-foreground border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
          <Trash2 className="h-3 w-3" /> Recently Deleted
          {deletedRows.length > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500/10 text-red-500 text-[8px] font-black">{deletedRows.length}</span>
          )}
        </button>
      </div>

      {/* ── ACTIVE TAB ── */}
      {subTab === 'active' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, package…" /></div>
          </div>
          <FilterPills options={filterOptions} active={filter} onChange={setFilter} />

          {filteredActive.length === 0 ? <EmptyState message="No records match this filter." /> : (
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              {/* Summary strip */}
              <div className="bg-primary/5 border-b border-primary/20 px-5 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
                {[
                  { label: 'Pending',  value: activeRows.filter(r => r.status === 'pending_review').length, color: 'text-amber-500' },
                  { label: 'Approved', value: activeRows.filter(r => r.status === 'approved').length,       color: 'text-primary' },
                  { label: 'Rejected', value: activeRows.filter(r => r.status === 'rejected').length,       color: 'text-red-500' },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-4">
                    {i > 0 && <div className="w-px h-3.5 bg-border/60" />}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">{s.label}</span>
                      <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  </div>
                ))}
                {selectedIds.size > 0 && (
                  <>
                    <div className="w-px h-3.5 bg-border/60" />
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/70">Selected</span>
                      <span className="text-xs font-bold text-blue-500">{selectedIds.size}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="overflow-x-auto bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-muted/40 border-b-2 border-border border-r border-border/30 w-9">
                        <input type="checkbox" checked={allSelected}
                          ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                          onChange={e => selectAll(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                      </th>
                      {['Client','Package','Documents','Date','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b-2 border-border border-r border-border/30 last:border-r-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActive.map((s, i) => (
                      <tr key={s.id}
                        className={`border-b border-border/40 transition-colors hover:bg-primary/[0.03] cursor-pointer ${selectedIds.has(s.id) ? 'bg-primary/5' : i % 2 !== 0 ? 'bg-muted/[0.04]' : 'bg-card'}`}
                        onClick={() => setDetailRow(s)}
                      >
                        <td className="px-4 py-3 border-r border-border/30" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)}
                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                        </td>
                        <td className="px-4 py-3 border-r border-border/30">
                          <p className="font-semibold text-foreground leading-tight">{clientName(s)}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{clientEmail(s)}</p>
                        </td>
                        <td className="px-4 py-3 border-r border-border/30">
                          <p className="font-medium text-foreground leading-tight">{s.product_label ?? s.product_type}</p>
                          {s.product_price && (
                            <p className="text-[10px] mt-0.5">
                              {s.senior_pwd_discount && s.discounted_price
                                ? <><span className="line-through text-muted-foreground">₱{Number(s.product_price).toLocaleString('en-PH')}</span> <span className="text-amber-600 font-bold">₱{Number(s.discounted_price).toLocaleString('en-PH')}</span></>
                                : <span className="font-bold text-primary">₱{Number(s.product_price).toLocaleString('en-PH')}</span>
                              }
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-border/30" onClick={e => e.stopPropagation()}>
                          <div className="space-y-0.5">
                            <DocLink path={s.doc_death_certificate}  label="Death Cert" />
                            <DocLink path={s.doc_barangay_indigency} label="Barangay" />
                            <DocLink path={s.doc_valid_id}           label="Valid ID" />
                            {s.doc_medico_legal && <DocLink path={s.doc_medico_legal} label="Medico Legal" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-border/30 text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(s.created_at)}</td>
                        <td className="px-4 py-3 border-r border-border/30">
                          <Badge label={statusLabel(s.status)} variant={statusVariant(s.status)} plain />
                          {s.rejection_reason && <p className="text-[9px] text-muted-foreground italic mt-0.5 max-w-[120px] truncate">{s.rejection_reason}</p>}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.status === 'pending_review' && currentRole === 'admin' && (
                              <button onClick={() => setReviewRow(s)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                                <Eye className="h-3 w-3" /> Review
                              </button>
                            )}
                            {currentRole === 'admin' && (
                              <button onClick={() => setDeleteRow(s)}
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-red-200 text-red-600 text-[10px] font-semibold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-colors">
                                <Trash2 className="h-2.5 w-2.5" /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DELETED TAB ── */}
      {subTab === 'deleted' && (
        <>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-2.5">
              <span className="text-xs font-semibold text-foreground">{selectedIds.size} selected</span>
              <button onClick={() => setPermDelIds([...selectedIds])}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors">
                <Trash2 className="h-3 w-3" /> Delete Forever
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          )}
          {deletedRows.length === 0 ? (
            <EmptyState message="No deleted records." />
          ) : (
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              <div className="overflow-x-auto bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-muted/40 border-b-2 border-border border-r border-border/30 w-9">
                        <input type="checkbox"
                          checked={deletedRows.length > 0 && deletedRows.every(r => selectedIds.has(r.id))}
                          onChange={e => setSelectedIds(e.target.checked ? new Set(deletedRows.map(r => r.id)) : new Set())}
                          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                      </th>
                      {['Client','Package','Delete Reason','Deleted','Expires In','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b-2 border-border border-r border-border/30 last:border-r-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deletedRows.map((s, i) => {
                      const days = daysUntilPermanent(s.deleted_at)
                      return (
                        <tr key={s.id} className={`border-b border-border/40 opacity-70 ${i % 2 !== 0 ? 'bg-muted/[0.04]' : 'bg-card'}`}>
                          <td className="px-4 py-3 border-r border-border/30">
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)}
                              className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                          </td>
                          <td className="px-4 py-3 border-r border-border/30">
                            <p className="font-semibold text-foreground">{clientName(s)}</p>
                            <p className="text-[9px] text-muted-foreground">{clientEmail(s)}</p>
                          </td>
                          <td className="px-4 py-3 border-r border-border/30 capitalize">{s.product_label ?? s.product_type}</td>
                          <td className="px-4 py-3 border-r border-border/30">
                            <p className="text-muted-foreground">{s.delete_reason ?? '—'}</p>
                            {s.delete_comment && <p className="text-[9px] text-muted-foreground italic">{s.delete_comment}</p>}
                          </td>
                          <td className="px-4 py-3 border-r border-border/30 text-[10px] text-muted-foreground whitespace-nowrap">
                            {s.deleted_at ? fmtDate(s.deleted_at) : '—'}
                          </td>
                          <td className="px-4 py-3 border-r border-border/30">
                            <span className={`text-[10px] font-bold ${days <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {days}d
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {currentRole === 'admin' && (
                                <button onClick={() => setRecoverRow(s)}
                                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-primary/20 text-primary bg-primary/5 text-[10px] font-semibold hover:bg-primary/10 transition-colors">
                                  <RotateCcw className="h-3 w-3" /> Recover
                                </button>
                              )}
                              {currentRole === 'admin' && (
                                <button onClick={() => setPermDelIds([s.id])}
                                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-red-200 text-red-600 text-[10px] font-semibold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
