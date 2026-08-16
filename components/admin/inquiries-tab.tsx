'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, inputCls } from './admin-primitives'
import { ChevronDown, ChevronUp, Mail, Send, Eye, X, ChevronRight } from 'lucide-react'
import type { Inquiry } from '@/lib/supabase/types'

// ── Preset responses ─────────────────────────────────────────
const PRESETS = [
  {
    label: 'General Acknowledgement',
    subject: (inq: Inquiry) => inq.subject,
    body: (inq: Inquiry) =>
      `Thank you for reaching out to us, ${inq.name.split(' ')[0]}.\n\nWe have received your inquiry and our team will get back to you as soon as possible. We appreciate your patience and trust in M. P. Gayeta Funeral Services.\n\nShould you need immediate assistance, you may contact us directly at +63 918 901 9978 (available 24/7).`,
  },
  {
    label: 'Service Information Request',
    subject: (inq: Inquiry) => inq.subject,
    body: (inq: Inquiry) =>
      `Thank you for your interest in our services, ${inq.name.split(' ')[0]}.\n\nWe offer a range of funeral packages tailored to meet different needs and budgets, including traditional burial services, cremation, and columbarium reservations. Our team is dedicated to providing compassionate and dignified care for your loved ones.\n\nWe would be honored to assist you further. Please feel free to visit us at our office or call us at +63 918 901 9978 at any time. You may also visit our website for more information about our available packages.`,
  },
  {
    label: 'Schedule a Visit / Appointment',
    subject: (inq: Inquiry) => inq.subject,
    body: (inq: Inquiry) =>
      `Thank you for contacting us, ${inq.name.split(' ')[0]}.\n\nWe would be happy to schedule an appointment for you to visit our facility and speak with one of our staff members in person. Our office is open daily, and we are available 24/7 for urgent matters.\n\nPlease let us know your preferred date and time, and we will make the necessary arrangements. You may also reach us directly at +63 918 901 9978.`,
  },
  {
    label: 'Columbarium Inquiry',
    subject: (inq: Inquiry) => inq.subject,
    body: (inq: Inquiry) =>
      `Thank you for your inquiry regarding our columbarium, ${inq.name.split(' ')[0]}.\n\nWe have available slots in our columbarium facility, and we would be glad to assist you with the reservation process. Our staff can walk you through the requirements and guide you every step of the way.\n\nTo proceed, you may visit our office, call us at +63 918 901 9978, or submit your documents through our online portal. We are here to help whenever you are ready.`,
  },
  {
    label: 'Pricing & Package Inquiry',
    subject: (inq: Inquiry) => inq.subject,
    body: (inq: Inquiry) =>
      `Thank you for reaching out, ${inq.name.split(' ')[0]}.\n\nOur service packages are designed to accommodate a range of needs and budgets. Pricing varies depending on the type of service, inclusions, and other factors. Our staff will be happy to provide a detailed breakdown and help you find the most suitable option.\n\nTo receive a personalized quote or to learn more, please visit us at our office or contact us at +63 918 901 9978. We are available 24 hours a day, 7 days a week.`,
  },
  {
    label: 'Reply on your own',
    subject: (_inq: Inquiry) => '',
    body: (_inq: Inquiry) => '',
  },
] as const

// ── Compose + Review Modal ────────────────────────────────────
function ComposeModal({ inquiry, staffName, onClose, onSent }: {
  inquiry: Inquiry
  staffName: string
  onClose: () => void
  onSent: () => void
}) {
  const [step,         setStep]         = useState<'compose' | 'review'>('compose')
  const [presetIndex,  setPresetIndex]  = useState(0)
  const [customSubject, setCustomSubject] = useState(`Re: ${inquiry.subject}`)
  const [body,         setBody]         = useState(() => PRESETS[0].body(inquiry))

  const isCustom     = presetIndex === PRESETS.length - 1
  const finalSubject = isCustom ? customSubject : `Re: ${inquiry.subject}`
  const finalBody    = body.trim()

  const handlePresetChange = (idx: number) => {
    setPresetIndex(idx)
    if (idx < PRESETS.length - 1) {
      setBody(PRESETS[idx].body(inquiry))
    } else {
      setBody('')
    }
  }

  const handleSend = () => {
    const signature = `\n\n—\n${staffName}\nM. P. Gayeta Funeral Services\n+63 918 901 9978`
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm` +
      `&to=${encodeURIComponent(inquiry.email)}` +
      `&su=${encodeURIComponent(finalSubject)}` +
      `&body=${encodeURIComponent(finalBody + signature)}`
    window.open(gmailUrl, '_blank', 'noopener,noreferrer')
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
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
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
                    <option key={i} value={i}>{p.label}</option>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isCustom ? 'Your Message' : 'Message Preview'}
                </label>
                <textarea
                  rows={9}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  readOnly={!isCustom}
                  placeholder={isCustom ? 'Write your reply here…' : ''}
                  className={`${inputCls} h-auto resize-none py-3 leading-relaxed ${!isCustom ? 'text-muted-foreground bg-muted/20 cursor-default' : ''}`}
                />
                {!isCustom && (
                  <p className="text-[10px] text-muted-foreground">You can switch to "Reply on your own" to write a custom message.</p>
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
            {/* Review step — formal email preview */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Email meta */}
                <div className="bg-muted/30 border-b border-border px-4 py-3 space-y-1.5">
                  {[
                    { label: 'From',    value: 'M. P. Gayeta Funeral Services <noreply@ememoria.site>' },
                    { label: 'To',      value: `${inquiry.name} <${inquiry.email}>` },
                    { label: 'Subject', value: finalSubject },
                  ].map(f => (
                    <div key={f.label} className="flex gap-3 text-xs">
                      <span className="text-muted-foreground font-semibold w-14 shrink-0">{f.label}</span>
                      <span className="text-foreground">{f.value}</span>
                    </div>
                  ))}
                </div>
                {/* Email body */}
                <div className="px-5 py-5 bg-card space-y-4">
                  {/* Letterhead */}
                  <div style={{ borderLeft: '3px solid #226b42', paddingLeft: '12px' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#226b42' }}>M. P. GAYETA FUNERAL SERVICES</p>
                    <p className="text-[10px] text-muted-foreground">Sariaya, Quezon, Philippines · +63 918 901 9978</p>
                  </div>
                  <p className="text-sm text-foreground">Dear <strong>{inquiry.name.split(' ')[0]}</strong>,</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{finalBody}</p>
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-sm text-foreground">Respectfully,</p>
                    <p className="text-sm font-semibold text-foreground">{staffName}</p>
                    <p className="text-[11px] text-muted-foreground">M. P. Gayeta Funeral Services</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-3">
                Clicking "Open in Gmail" will open Gmail in a new tab with this message pre-filled. You review and send it from there.
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
export function InquiriesTab({ staffName = 'M. P. Gayeta Funeral Services' }: { staffName?: string }) {
  const supabase = createClient()
  const [rows,     setRows]     = useState<Inquiry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [compose,  setCompose]  = useState<Inquiry | null>(null)
  const [sentIds,  setSentIds]  = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('inquiries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const markRead = async (id: string) => {
    await supabase.from('inquiries').update({ is_read: true }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  const unreadCount = rows.filter(r => !r.is_read).length

  if (loading) return <Spinner />

  return (
    <div>
      {compose && (
        <ComposeModal
          inquiry={compose}
          staffName={staffName}
          onClose={() => setCompose(null)}
          onSent={() => setSentIds(prev => new Set([...prev, compose.id]))}
        />
      )}

      <SectionHeader title="Inquiries" sub={`${rows.length} total · ${unreadCount} unread`} />

      {rows.length === 0 ? <EmptyState message="No inquiries submitted yet." /> : (
        <div className="space-y-2">
          {rows.map(inq => (
            <div key={inq.id}
              className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                !inq.is_read ? 'border-primary/30' : 'border-border'
              }`}
            >
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => {
                  setExpanded(expanded === inq.id ? null : inq.id)
                  if (!inq.is_read) markRead(inq.id)
                }}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{inq.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${!inq.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {inq.name}
                    </p>
                    {!inq.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    {sentIds.has(inq.id) && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Replied</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{inq.subject}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge label={inq.is_read ? 'Read' : 'New'} variant={inq.is_read ? 'muted' : 'amber'} />
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(inq.created_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </span>
                  {expanded === inq.id
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
              </button>

              {expanded === inq.id && (
                <div className="px-5 pb-5 pt-3 border-t border-border/40 bg-muted/10 space-y-3">
                  <p className="text-[11px] font-medium text-primary">{inq.email}</p>
                  <p className="text-sm text-foreground leading-relaxed">{inq.message}</p>
                  <button
                    onClick={() => setCompose(inq)}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Mail className="h-3 w-3" /> Reply via Email
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
