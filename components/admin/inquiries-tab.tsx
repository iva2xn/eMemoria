'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, inputCls } from './admin-primitives'
import { ChevronDown, ChevronUp, Mail, Send, Eye, X, ChevronRight, Clock, CheckCheck, MessageSquare } from 'lucide-react'
import type { Inquiry } from '@/lib/supabase/types'

// ── Draft helpers (localStorage, keyed per inquiry) ──────────
const DRAFT_KEY = (id: string) => `inquiry_draft_${id}`

function loadDraft(id: string): { body: string; subject: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY(id))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraftLocal(id: string, body: string, subject: string) {
  if (typeof window === 'undefined') return
  if (!body.trim() && !subject.trim()) {
    localStorage.removeItem(DRAFT_KEY(id))
    return
  }
  localStorage.setItem(DRAFT_KEY(id), JSON.stringify({ body, subject }))
}

function clearDraftLocal(id: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRAFT_KEY(id))
}

// ── DB draft sync helpers ─────────────────────────────────────
async function saveDraftDB(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  id: string,
  body: string,
  subject: string,
) {
  await supabase
    .from('inquiries')
    .update({ draft_body: body || null, draft_subject: subject || null })
    .eq('id', id)
}

async function clearDraftDB(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  id: string,
) {
  await supabase
    .from('inquiries')
    .update({ draft_body: null, draft_subject: null })
    .eq('id', id)
}

// ── Preset responses ──────────────────────────────────────────
const PRESETS = [
  {
    label: 'General Acknowledgement',
    body: (inq: Inquiry) =>
      `Thank you for reaching out to us, ${inq.name.split(' ')[0]}.\n\nWe have received your inquiry and our team will get back to you as soon as possible. We appreciate your patience and trust in eMemoria Funeral Services.\n\nShould you need immediate assistance, you may contact us directly at +63 918 901 9978 (available 24/7).`,
  },
  {
    label: 'Service Information Request',
    body: (inq: Inquiry) =>
      `Thank you for your interest in our services, ${inq.name.split(' ')[0]}.\n\nWe offer a range of funeral packages tailored to meet different needs and budgets, including traditional burial services, cremation, and columbarium reservations. Our team is dedicated to providing compassionate and dignified care for your loved ones.\n\nWe would be honored to assist you further. Please feel free to visit us at our office or call us at +63 918 901 9978 at any time.`,
  },
  {
    label: 'Schedule a Visit / Appointment',
    body: (inq: Inquiry) =>
      `Thank you for contacting us, ${inq.name.split(' ')[0]}.\n\nWe would be happy to schedule an appointment for you to visit our facility and speak with one of our staff members in person. Our office is open daily, and we are available 24/7 for urgent matters.\n\nPlease let us know your preferred date and time, and we will make the necessary arrangements. You may also reach us directly at +63 918 901 9978.`,
  },
  {
    label: 'Columbarium Inquiry',
    body: (inq: Inquiry) =>
      `Thank you for your inquiry regarding our columbarium, ${inq.name.split(' ')[0]}.\n\nWe have available slots in our columbarium facility, and we would be glad to assist you with the reservation process. Our staff can walk you through the requirements and guide you every step of the way.\n\nTo proceed, you may visit our office, call us at +63 918 901 9978, or submit your documents through our online portal.`,
  },
  {
    label: 'Pricing & Package Inquiry',
    body: (inq: Inquiry) =>
      `Thank you for reaching out, ${inq.name.split(' ')[0]}.\n\nOur service packages are designed to accommodate a range of needs and budgets. Pricing varies depending on the type of service, inclusions, and other factors. Our staff will be happy to provide a detailed breakdown and help you find the most suitable option.\n\nTo receive a personalized quote or to learn more, please visit us or contact us at +63 918 901 9978. We are available 24/7.`,
  },
  {
    label: 'Reply on your own',
    body: (_inq: Inquiry) => '',
  },
] as const

// ── Status helpers ────────────────────────────────────────────
type InquiryStatus = 'new' | 'read' | 'replied'

function getStatus(inq: Inquiry): InquiryStatus {
  if (inq.replied_at) return 'replied'
  if (inq.is_read)    return 'read'
  return 'new'
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ inq }: { inq: Inquiry }) {
  const status = getStatus(inq)
  if (status === 'replied') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
      <CheckCheck className="h-2.5 w-2.5" /> Replied
    </span>
  )
  if (status === 'read') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border">
      <Eye className="h-2.5 w-2.5" /> Read
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border">
      <MessageSquare className="h-2.5 w-2.5" /> New
    </span>
  )
}

function StatusTimeline({ inq }: { inq: Inquiry }) {
  const items = [
    {
      label: 'Received',
      time: inq.created_at,
      icon: <Clock className="h-3 w-3" />,
      active: true,
    },
    {
      label: 'Read',
      time: inq.read_at ?? null,
      icon: <Eye className="h-3 w-3" />,
      active: !!inq.read_at,
    },
    {
      label: 'Replied',
      time: inq.replied_at ?? null,
      icon: <CheckCheck className="h-3 w-3" />,
      active: !!inq.replied_at,
    },
  ]
  return (
    <div className="flex items-center gap-0">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
            item.active
              ? 'bg-primary/10 text-primary'
              : 'bg-muted/30 text-muted-foreground/40'
          }`}>
            {item.icon}
            <div>
              <p className="leading-none">{item.label}</p>
              {item.time && (
                <p className="text-[9px] font-normal opacity-70 mt-0.5 leading-none">
                  {fmtDateTime(item.time)}
                </p>
              )}
            </div>
          </div>
          {i < items.length - 1 && (
            <div className={`h-px w-4 ${item.active && items[i + 1].active ? 'bg-primary/40' : 'bg-border/60'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Compose + Review Modal ────────────────────────────────────
function ComposeModal({ inquiry, staffName, supabase, onClose, onSent }: {
  inquiry: Inquiry
  staffName: string
  supabase: ReturnType<typeof createClient>
  onClose: () => void
  onSent: () => void
}) {
  const CUSTOM_IDX = PRESETS.length - 1
  const [step,         setStep]         = useState<'compose' | 'review'>('compose')
  const [presetIndex,  setPresetIndex]  = useState<number>(() => {
    // If there's a saved draft (localStorage or DB), start on custom preset
    const draft = loadDraft(inquiry.id) ?? (inquiry.draft_body ? { body: inquiry.draft_body, subject: inquiry.draft_subject ?? '' } : null)
    return draft ? CUSTOM_IDX : 0
  })

  const [customSubject, setCustomSubject] = useState<string>(() => {
    const draft = loadDraft(inquiry.id) ?? (inquiry.draft_body ? { body: inquiry.draft_body, subject: inquiry.draft_subject ?? '' } : null)
    return draft?.subject ?? `Re: ${inquiry.subject}`
  })

  const [body, setBody] = useState<string>(() => {
    const draft = loadDraft(inquiry.id) ?? (inquiry.draft_body ? { body: inquiry.draft_body, subject: inquiry.draft_subject ?? '' } : null)
    if (draft) return draft.body
    return PRESETS[0].body(inquiry)
  })

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    const local = loadDraft(inquiry.id)
    return !!(local || inquiry.draft_body)
  })

  const isCustom     = presetIndex === CUSTOM_IDX
  const finalSubject = isCustom ? customSubject : `Re: ${inquiry.subject}`
  const finalBody    = body.trim()

  // Auto-save draft whenever body/subject changes (only for custom)
  useEffect(() => {
    if (!isCustom) return
    const t = setTimeout(() => {
      saveDraftLocal(inquiry.id, body, customSubject)
      saveDraftDB(supabase, inquiry.id, body, customSubject)
      setHasDraft(!!(body.trim() || customSubject.trim()))
    }, 600)
    return () => clearTimeout(t)
  }, [body, customSubject, isCustom, inquiry.id, supabase])

  const handlePresetChange = (idx: number) => {
    setPresetIndex(idx)
    if (idx < CUSTOM_IDX) {
      setBody(PRESETS[idx].body(inquiry))
    } else {
      // Restore draft: prefer localStorage, fall back to DB
      const draft = loadDraft(inquiry.id) ?? (inquiry.draft_body ? { body: inquiry.draft_body, subject: inquiry.draft_subject ?? '' } : null)
      setBody(draft?.body ?? '')
      setCustomSubject(draft?.subject ?? `Re: ${inquiry.subject}`)
    }
  }

  const handleSend = () => {
    const signature = `\n\n—\n${staffName}\neMemoria Funeral Services\n+63 918 901 9978`
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm` +
      `&to=${encodeURIComponent(inquiry.email)}` +
      `&su=${encodeURIComponent(finalSubject)}` +
      `&body=${encodeURIComponent(finalBody + signature)}`
    window.open(gmailUrl, '_blank', 'noopener,noreferrer')
    // Clear draft after sending (both localStorage and DB)
    clearDraftLocal(inquiry.id)
    clearDraftDB(supabase, inquiry.id)
    onSent()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'review' && (
              <button onClick={() => setStep('compose')} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              </button>
            )}
            <Mail className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {step === 'compose' ? 'Compose Reply' : 'Review Before Sending'}
              </h3>
              <p className="text-[10px] text-muted-foreground">To: {inquiry.name} · {inquiry.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCustom && hasDraft && step === 'compose' && (
              <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                Draft saved
              </span>
            )}
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {step === 'compose' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Original inquiry */}
              <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Original Inquiry</p>
                <p className="text-xs font-semibold text-foreground">{inquiry.subject}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{inquiry.message}</p>
              </div>

              {/* Preset selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Response Template</label>
                <select
                  value={presetIndex}
                  onChange={e => handlePresetChange(Number(e.target.value))}
                  className={inputCls}
                >
                  {PRESETS.map((p, i) => (
                    <option key={i} value={i}>
                      {p.label}{i === CUSTOM_IDX && hasDraft ? ' (draft saved)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject — only editable on custom */}
              {isCustom && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    className={inputCls}
                    placeholder="Re: Your Inquiry"
                  />
                </div>
              )}

              {/* Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isCustom ? 'Your Message' : 'Message Preview'}
                  </label>
                  {isCustom && hasDraft && (
                    <button
                      onClick={() => { clearDraftLocal(inquiry.id); clearDraftDB(supabase, inquiry.id); setBody(''); setCustomSubject(`Re: ${inquiry.subject}`); setHasDraft(false) }}
                      className="text-[9px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear draft
                    </button>
                  )}
                </div>
                <textarea
                  rows={9}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  readOnly={!isCustom}
                  placeholder={isCustom ? 'Write your reply here…' : ''}
                  className={`${inputCls} h-auto resize-none py-3 leading-relaxed ${!isCustom ? 'text-muted-foreground bg-muted/20 cursor-default' : ''}`}
                />
                {!isCustom && (
                  <p className="text-[10px] text-muted-foreground">Switch to "Reply on your own" to write a custom message. Your draft will be auto-saved.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                Cancel
              </button>
              <button
                onClick={() => setStep('review')}
                disabled={!finalBody}
                className="flex-1 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Review
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-4 py-3 space-y-1.5">
                  {[
                    { label: 'From',    value: 'eMemoria Funeral Services <noreply@ememoria.site>' },
                    { label: 'To',      value: `${inquiry.name} <${inquiry.email}>` },
                    { label: 'Subject', value: finalSubject },
                  ].map(f => (
                    <div key={f.label} className="flex gap-3 text-xs">
                      <span className="text-muted-foreground font-semibold w-14 shrink-0">{f.label}</span>
                      <span className="text-foreground">{f.value}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-5 bg-card space-y-4">
                  <div style={{ borderLeft: '3px solid #226b42', paddingLeft: '12px' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#226b42' }}>eMEMORIA FUNERAL SERVICES</p>
                    <p className="text-[10px] text-muted-foreground">Sariaya, Quezon, Philippines · +63 918 901 9978</p>
                  </div>
                  <p className="text-sm text-foreground">Dear <strong>{inquiry.name.split(' ')[0]}</strong>,</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{finalBody}</p>
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-sm text-foreground">Respectfully,</p>
                    <p className="text-sm font-semibold text-foreground">{staffName}</p>
                    <p className="text-[11px] text-muted-foreground">eMemoria Funeral Services</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Clicking "Open in Gmail" will open Gmail in a new tab with this message pre-filled.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
              <button onClick={() => setStep('compose')} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                Edit
              </button>
              <button
                onClick={handleSend}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Open in Gmail
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Main Tab ──────────────────────────────────────────────────
export function InquiriesTab({ staffName = 'eMemoria Funeral Services' }: { staffName?: string }) {
  const supabase = createClient()
  const [rows,     setRows]     = useState<Inquiry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [compose,  setCompose]  = useState<Inquiry | null>(null)

  useEffect(() => {
    supabase.from('inquiries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows((data as Inquiry[]) ?? []); setLoading(false) })
  }, [supabase])

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    await supabase.from('inquiries').update({ is_read: true, read_at: now }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_read: true, read_at: x.read_at ?? now } : x))
  }, [supabase])

  const markReplied = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    await supabase.from('inquiries').update({ replied_at: now, draft_body: null, draft_subject: null }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, replied_at: now, draft_body: null, draft_subject: null } : x))
  }, [supabase])

  const unreadCount  = rows.filter(r => !r.is_read).length
  const repliedCount = rows.filter(r => !!r.replied_at).length

  if (loading) return <Spinner />

  return (
    <div>
      {compose && (
        <ComposeModal
          inquiry={compose}
          staffName={staffName}
          supabase={supabase}
          onClose={() => setCompose(null)}
          onSent={() => {
            markReplied(compose.id)
          }}
        />
      )}

      <SectionHeader
        title="Inquiries"
        sub={`${rows.length} total · ${unreadCount} unread · ${repliedCount} replied`}
      />

      {rows.length === 0 ? <EmptyState message="No inquiries submitted yet." /> : (
        <div className="space-y-2">
          {rows.map(inq => {
            const status  = getStatus(inq)
            const hasDraft = !!loadDraft(inq.id) || !!(inq.draft_body)

            return (
              <div key={inq.id}
                className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                  status === 'new' ? 'border-amber-500/30' :
                  status === 'read' ? 'border-border' :
                  'border-primary/20'
                }`}
              >
                {/* Row header */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => {
                    setExpanded(expanded === inq.id ? null : inq.id)
                    if (!inq.is_read) markRead(inq.id)
                  }}
                >
                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    status === 'new' ? 'bg-muted/40' : 'bg-primary/10'
                  }`}>
                    <span className={`text-sm font-bold ${status === 'new' ? 'text-muted-foreground' : 'text-primary'}`}>
                      {inq.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name + subject */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm truncate ${status === 'new' ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                        {inq.name}
                      </p>
                      {hasDraft && status !== 'replied' && (
                        <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full border border-border shrink-0">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{inq.subject}</p>
                  </div>

                  {/* Right side: status + date */}
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge inq={inq} />
                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                      {new Date(inq.created_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </span>
                    {expanded === inq.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                </button>

                {/* Expanded panel */}
                {expanded === inq.id && (
                  <div className="px-5 pb-5 pt-3 border-t border-border/40 bg-muted/10 space-y-4">
                    {/* Status timeline */}
                    <div className="overflow-x-auto pb-1">
                      <StatusTimeline inq={inq} />
                    </div>

                    {/* Message */}
                    <p className="text-[11px] font-medium text-primary">{inq.email}</p>
                    <p className="text-sm text-foreground leading-relaxed">{inq.message}</p>

                    {/* Reply button */}
                    <button
                      onClick={() => setCompose(inq)}
                      className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {hasDraft ? 'Continue Draft' : 'Reply via Email'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
