'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, TableShell, Th, FilterPills } from './admin-primitives'
import { FileText, ExternalLink, CheckCircle2, XCircle, X } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { DocumentSubmission, DocumentSubmissionStatus } from '@/lib/supabase/types'

type SubmissionRow = DocumentSubmission & { profileName?: string; profileEmail?: string }

function RejectModal({ submission, onClose, onDone }: { submission: SubmissionRow; onClose: () => void; onDone: () => void }) {
  const supabase = createClient()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (!reason.trim()) { setError('Rejection reason is required.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    await supabase.from('document_submissions').update({ status: 'rejected', rejection_reason: reason.trim(), reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() }).eq('id', submission.id)
    const recipientEmail = submission.profileEmail ?? submission.guest_email
    if (recipientEmail) {
      await fetch('/api/notify-document-submission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availmentId: submission.id, status: 'rejected', recipientEmail, recipientName: submission.profileName ?? submission.guest_name, packageLabel: submission.product_label ?? submission.product_type, packagePrice: submission.product_price, productType: submission.product_type, rejectionReason: reason.trim() }) })
    }
    const clientName = submission.profileName ?? submission.guest_name ?? 'a client'
    await logActivity({ category: 'log', event_type: 'doc_submission_rejected', entity_table: 'document_submissions', entity_id: submission.id, actor_id: user?.id, actor_name: actorName, message: `${actorName} rejected documents from ${clientName}: "${reason.trim().slice(0, 80)}"`, metadata: { client: clientName, reason: reason.trim() } })
    setLoading(false)
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-bold text-foreground">Reject Submission</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rejection Reason <span className="text-destructive">*</span></label>
            <textarea rows={3} placeholder="e.g. Death certificate is unclear, please resubmit a clearer copy." value={reason} onChange={e => setReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 outline-none transition-all resize-none" />
          </div>
          <p className="text-[11px] text-muted-foreground">This will be included in the rejection email sent to the client.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handle} disabled={loading} className="flex-1 h-10 rounded-xl bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50">
              {loading ? 'Rejecting…' : 'Reject & Notify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocLink({ path, label }: { path: string | null; label: string }) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) return
    supabase.storage.from('document-submissions').createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path, supabase])
  if (!path) return <span className="text-[10px] text-muted-foreground/40 italic">—</span>
  if (!url)  return <span className="text-[10px] text-muted-foreground/40 italic">Loading…</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline underline-offset-2">
      <FileText className="h-3 w-3" />{label}<ExternalLink className="h-2.5 w-2.5" />
    </a>
  )
}

export function DocumentSubmissionsTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DocumentSubmissionStatus | 'all'>('all')
  const [rejectTarget, setRejectTarget] = useState<SubmissionRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: submissions } = await supabase.from('document_submissions').select('*').order('created_at', { ascending: false })
    if (!submissions) { setLoading(false); return }
    const userIds = [...new Set(submissions.filter(s => s.user_id).map(s => s.user_id as string))]
    let profileMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,email').in('id', userIds)
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.name, email: p.email }]))
    }
    setRows(submissions.map(s => ({ ...s, profileName: s.user_id ? profileMap[s.user_id]?.name : undefined, profileEmail: s.user_id ? profileMap[s.user_id]?.email : undefined })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const approve = async (s: SubmissionRow) => {
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    await supabase.from('document_submissions').update({ status: 'approved', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() }).eq('id', s.id)
    const recipientEmail = s.profileEmail ?? s.guest_email
    if (recipientEmail) {
      await fetch('/api/notify-document-submission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availmentId: s.id, status: 'approved', recipientEmail, recipientName: s.profileName ?? s.guest_name, packageLabel: s.product_label ?? s.product_type, packagePrice: s.product_price, productType: s.product_type }) })
    }
    const clientName = s.profileName ?? s.guest_name ?? 'a client'
    await logActivity({ category: 'log', event_type: 'doc_submission_approved', entity_table: 'document_submissions', entity_id: s.id, actor_id: user?.id, actor_name: actorName, message: `${actorName} approved documents from ${clientName} for ${s.product_label ?? s.product_type}`, metadata: { client: clientName, package: s.product_label } })
    setRows(r => r.map(x => x.id === s.id ? { ...x, status: 'approved' as DocumentSubmissionStatus } : x))
  }

  const statusVariant = (s: string) => s === 'approved' ? 'green' : s === 'pending_review' ? 'amber' : 'red'
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  const filterOptions = [
    { value: 'all' as const,            label: `All (${rows.length})` },
    { value: 'pending_review' as const, label: `Pending (${rows.filter(r => r.status === 'pending_review').length})` },
    { value: 'approved' as const,       label: `Approved (${rows.filter(r => r.status === 'approved').length})` },
    { value: 'rejected' as const,       label: `Rejected (${rows.filter(r => r.status === 'rejected').length})` },
  ]

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <SectionHeader title="Document Submissions" sub={`${rows.length} submission${rows.length !== 1 ? 's' : ''}`} />
      <FilterPills options={filterOptions} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? <EmptyState message="No document submissions match this filter." /> : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{s.profileName ?? s.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.profileEmail ?? s.guest_email ?? ''}</p>
                  </div>
                  <Badge label={s.status === 'pending_review' ? 'Pending' : s.status} variant={statusVariant(s.status)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.product_label ?? s.product_type}</p>
                  {s.product_price && <p className="text-xs text-primary font-bold">₱{Number(s.product_price).toLocaleString()}</p>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  <DocLink path={s.doc_death_certificate}  label="Death Cert" />
                  <DocLink path={s.doc_barangay_indigency} label="Barangay" />
                  <DocLink path={s.doc_valid_id}           label="Valid ID" />
                  {s.doc_medico_legal && <DocLink path={s.doc_medico_legal} label="Medico Legal" />}
                </div>
                {s.rejection_reason && <p className="text-[10px] text-muted-foreground italic">{s.rejection_reason}</p>}
                {s.status === 'pending_review' && (
                  <div className="flex gap-1.5 pt-1 border-t border-border/40">
                    <button onClick={() => approve(s)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90">
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </button>
                    <button onClick={() => setRejectTarget(s)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-destructive text-white text-[10px] font-bold hover:bg-destructive/90">
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop */}
          <TableShell>
            <thead><tr>
              <Th>Client</Th><Th>Package</Th><Th>Documents</Th>
              <Th>Date</Th><Th>Status</Th><Th>Actions</Th>
            </tr></thead>
            <tbody className="divide-y divide-border/50 hidden md:table-row-group">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground text-sm">{s.profileName ?? s.guest_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground">{s.profileEmail ?? s.guest_email ?? ''}</p>
                    {s.guest_phone && <p className="text-[10px] text-muted-foreground">{s.guest_phone}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground text-sm">{s.product_label ?? s.product_type}</p>
                    {s.product_price && <p className="text-xs text-primary font-bold">₱{Number(s.product_price).toLocaleString()}</p>}
                  </td>
                  <td className="px-5 py-3.5 space-y-1">
                    <DocLink path={s.doc_death_certificate}  label="Death Cert" />
                    <DocLink path={s.doc_barangay_indigency} label="Barangay" />
                    <DocLink path={s.doc_valid_id}           label="Valid ID" />
                    {s.doc_medico_legal && <DocLink path={s.doc_medico_legal} label="Medico Legal" />}
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <Badge label={s.status === 'pending_review' ? 'Pending Review' : s.status} variant={statusVariant(s.status)} />
                    {s.rejection_reason && <p className="text-[10px] text-muted-foreground mt-1 max-w-[160px] truncate">{s.rejection_reason}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    {s.status === 'pending_review' ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => approve(s)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90">
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </button>
                        <button onClick={() => setRejectTarget(s)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-destructive text-white text-[10px] font-bold hover:bg-destructive/90">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
      {rejectTarget && <RejectModal submission={rejectTarget} onClose={() => setRejectTarget(null)} onDone={load} />}
    </div>
  )
}
