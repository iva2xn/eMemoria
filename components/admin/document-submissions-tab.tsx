'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner } from './admin-primitives'
import { FileText, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import type { DocumentSubmission, DocumentSubmissionStatus } from '@/lib/supabase/types'

type SubmissionRow = DocumentSubmission & { profileName?: string; profileEmail?: string }

// ── Reject modal ──────────────────────────────────────────────
function RejectModal({
  submission,
  onClose,
  onDone,
}: {
  submission: SubmissionRow
  onClose: () => void
  onDone: () => void
}) {
  const supabase = createClient()
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleReject = async () => {
    if (!reason.trim()) { setError('Please provide a rejection reason.'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('document_submissions').update({
      status:           'rejected',
      rejection_reason: reason.trim(),
      reviewed_by:      user?.id ?? null,
      reviewed_at:      new Date().toISOString(),
    }).eq('id', submission.id)

    const recipientEmail = submission.profileEmail ?? submission.guest_email
    if (recipientEmail) {
      await fetch('/api/notify-document-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availmentId:     submission.id,
          status:          'rejected',
          recipientEmail,
          recipientName:   submission.profileName ?? submission.guest_name,
          packageLabel:    submission.product_label ?? submission.product_type,
          packagePrice:    submission.product_price,
          productType:     submission.product_type,
          rejectionReason: reason.trim(),
        }),
      })
    }

    setLoading(false)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Reject Document Submission</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Rejection Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Death certificate is unclear, please resubmit a clearer copy."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 outline-none transition-all resize-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            This reason will be included in the rejection email sent to the customer.
          </p>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button onClick={handleReject} disabled={loading}
              className="flex-1 h-10 rounded-xl bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50">
              {loading ? 'Rejecting…' : 'Reject & Notify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Doc viewer ────────────────────────────────────────────────
function DocLink({ path, label }: { path: string | null; label: string }) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    supabase.storage
      .from('document-submissions')
      .createSignedUrl(path, 60 * 60) // 1 hour expiry
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path, supabase])

  if (!path) return <span className="text-[10px] text-muted-foreground/40 italic">Not submitted</span>
  if (!url)  return <span className="text-[10px] text-muted-foreground/40 italic">Loading…</span>

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
    >
      <FileText className="h-3 w-3" />
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  )
}

// ── Main tab ──────────────────────────────────────────────────
export function DocumentSubmissionsTab() {
  const supabase = createClient()
  const [rows,         setRows]         = useState<SubmissionRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<DocumentSubmissionStatus | 'all'>('all')
  const [rejectTarget, setRejectTarget] = useState<SubmissionRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: submissions } = await supabase
      .from('document_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (!submissions) { setLoading(false); return }

    const userIds = [...new Set(submissions.filter(s => s.user_id).map(s => s.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
    }

    setRows(submissions.map(s => ({
      ...s,
      profileName:  s.user_id ? profileMap[s.user_id]?.name  : undefined,
      profileEmail: s.user_id ? profileMap[s.user_id]?.email : undefined,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (s: SubmissionRow) => {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('document_submissions').update({
      status:      'approved',
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', s.id)

    const recipientEmail = s.profileEmail ?? s.guest_email
    if (recipientEmail) {
      await fetch('/api/notify-document-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availmentId:   s.id,
          status:        'approved',
          recipientEmail,
          recipientName: s.profileName ?? s.guest_name,
          packageLabel:  s.product_label ?? s.product_type,
          packagePrice:  s.product_price,
          productType:   s.product_type,
        }),
      })
    }

    setRows(r => r.map(x => x.id === s.id ? { ...x, status: 'approved' as DocumentSubmissionStatus } : x))
  }

  const statusVariant = (s: string) =>
    s === 'approved' ? 'green' : s === 'pending_review' ? 'amber' : 'red'

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Document Submissions"
        sub={`${rows.length} submission${rows.length !== 1 ? 's' : ''}`}
      />

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending_review', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:border-primary/40'
            }`}>
            {f === 'all'
              ? `All (${rows.length})`
              : f === 'pending_review'
                ? `Pending Review (${rows.filter(r => r.status === 'pending_review').length})`
                : `${f.charAt(0).toUpperCase() + f.slice(1)} (${rows.filter(r => r.status === f).length})`
            }
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState message="No document submissions match this filter." />
        : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{s.profileName ?? s.guest_name ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{s.profileEmail ?? s.guest_email ?? ''}</p>
                      {s.guest_phone && <p className="text-[10px] text-muted-foreground font-mono">{s.guest_phone}</p>}
                    </div>
                    <Badge
                      label={s.status === 'pending_review' ? 'Pending' : s.status}
                      variant={statusVariant(s.status)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Package</p>
                      <p className="font-semibold text-foreground">{s.product_label ?? s.product_type}</p>
                      {s.product_price && (
                        <p className="text-[10px] text-primary font-serif font-bold">₱{Number(s.product_price).toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Date</p>
                      <p className="font-mono text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Documents</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <DocLink path={s.doc_death_certificate}  label="Death Cert" />
                      <DocLink path={s.doc_barangay_indigency} label="Barangay Indigency" />
                      <DocLink path={s.doc_valid_id}           label="Valid ID" />
                      {s.doc_medico_legal && <DocLink path={s.doc_medico_legal} label="Medico Legal" />}
                    </div>
                  </div>
                  {s.rejection_reason && (
                    <p className="text-[10px] text-muted-foreground italic">{s.rejection_reason}</p>
                  )}
                  {s.status === 'pending_review' && (
                    <div className="flex gap-1.5 pt-1 border-t border-border/40">
                      <button
                        onClick={() => approve(s)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget(s)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-destructive text-white text-[10px] font-bold hover:bg-destructive/90 transition-colors"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto border border-border rounded-2xl bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Package</th>
                    <th className="px-5 py-3">Documents</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-foreground">{s.profileName ?? s.guest_name ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{s.profileEmail ?? s.guest_email ?? ''}</p>
                        {s.guest_phone && <p className="text-[10px] text-muted-foreground font-mono">{s.guest_phone}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-foreground">{s.product_label ?? s.product_type}</p>
                        {s.product_price && (
                          <p className="text-[10px] text-primary font-serif font-bold">
                            ₱{Number(s.product_price).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 space-y-1">
                        <DocLink path={s.doc_death_certificate}  label="Death Cert" />
                        <DocLink path={s.doc_barangay_indigency} label="Barangay Indigency" />
                        <DocLink path={s.doc_valid_id}           label="Valid ID" />
                        {s.doc_medico_legal && <DocLink path={s.doc_medico_legal} label="Medico Legal" />}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          label={s.status === 'pending_review' ? 'Pending Review' : s.status}
                          variant={statusVariant(s.status)}
                        />
                        {s.rejection_reason && (
                          <p className="text-[10px] text-muted-foreground mt-1 max-w-[160px] truncate" title={s.rejection_reason}>
                            {s.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.status === 'pending_review' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => approve(s)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(s)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-destructive text-white text-[10px] font-bold hover:bg-destructive/90 transition-colors"
                            >
                              <XCircle className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        )}
                        {s.status !== 'pending_review' && (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      }

      {rejectTarget && (
        <RejectModal
          submission={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={load}
        />
      )}
    </div>
  )
}
