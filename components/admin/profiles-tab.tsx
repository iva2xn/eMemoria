'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge, SectionHeader, EmptyState, Spinner, TableShell, Th, SearchInput, FilterPills, type BadgeVariant } from './admin-primitives'
import { AlertBanner } from '@/components/ui/alert-banner'
import { logActivity } from '@/lib/activity-log'
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll'
import { Trash2, X, UserCog, RotateCcw, Clock, Download, Mail, Eye, ChevronRight } from 'lucide-react'
import type { Profile, UserRole, DeletedAccount } from '@/lib/supabase/types'

type ProfileView = 'active' | 'deleted'

// ── Default backup admin accounts (strictly for admin download) ──
const BACKUP_ADMINS = [
  { name: 'eMEmoria Default Admin 1', email: 'ememoria@admin.com',   password: 'ememoria@adminpassword1' },
  { name: 'eMEmoria Default Admin 2', email: 'ememoria2@admin.com',  password: 'ememoria@adminpassword2' },
  { name: 'eMEmoria Default Admin 3', email: 'ememoria3@admin.com',  password: 'ememoria@adminpassword3' },
] as const

// ── Email templates for account deletion notification ────────
const CLIENT_EMAIL_TEMPLATES = [
  {
    label: 'Standard Notice',
    body: (name: string, reason: string) =>
      `Dear ${name},\n\nWe are writing to inform you that your account at eMemoria Funeral Services has been deleted${reason ? ` due to the following reason: ${reason}` : ''}.\n\nIf you believe this was done in error or have any questions, please do not hesitate to contact us.\n\nThank you for your understanding.`,
  },
  {
    label: 'Client Request Confirmation',
    body: (name: string, _reason: string) =>
      `Dear ${name},\n\nAs requested, your eMemoria account and all associated data have been successfully deleted. We appreciate the time you spent with us and we hope to serve you again in the future.\n\nIf you ever need our services, you are always welcome to create a new account.`,
  },
  {
    label: 'Policy Violation',
    body: (name: string, reason: string) =>
      `Dear ${name},\n\nWe regret to inform you that your account at eMemoria Funeral Services has been terminated${reason ? ` for the following reason: ${reason}` : ' due to a violation of our terms of service'}.\n\nIf you wish to appeal this decision, please contact our support team.`,
  },
  {
    label: 'Custom Message',
    body: (_name: string, _reason: string) => '',
  },
] as const

const STAFF_EMAIL_TEMPLATES = [
  {
    label: 'Standard Offboarding',
    body: (name: string, _reason: string) =>
      `Dear ${name},\n\nWe are writing to formally notify you that your staff account at eMemoria Funeral Services has been deactivated effective immediately.\n\nPlease ensure that any company materials, access cards, or equipment are returned to the office at your earliest convenience.\n\nWe thank you for your service and wish you all the best in your future endeavors.`,
  },
  {
    label: 'End of Contract',
    body: (name: string, _reason: string) =>
      `Dear ${name},\n\nThis message is to inform you that your employment contract with eMemoria Funeral Services has concluded and your staff account has been deactivated accordingly.\n\nThank you for your contributions to our team. Please coordinate with management regarding the return of any company property.`,
  },
  {
    label: 'Custom Message',
    body: (_name: string, _reason: string) => '',
  },
] as const

// ── Role Change Confirm Modal ─────────────────────────────────
function RoleChangeModal({
  target,
  newRole,
  onClose,
  onConfirm,
}: {
  target: Profile
  newRole: UserRole
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  const roleVariant = (r: UserRole): BadgeVariant =>
    r === 'admin' ? 'amber' : r === 'staff' ? 'blue' : 'muted'

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  useLockBodyScroll()
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Change Role</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {step === 1 ? (
            <>
              <p className="text-sm text-muted-foreground">
                You are about to change the role of <span className="font-semibold text-foreground">{target.name}</span>.
              </p>
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Current Role</p>
                  <Badge label={target.role} variant={roleVariant(target.role)} />
                </div>
                <span className="text-lg text-muted-foreground">→</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">New Role</p>
                  <Badge label={newRole} variant={roleVariant(newRole)} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button type="button" onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl">Next →</Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Confirm Role Change</p>
                <p className="text-sm text-foreground">
                  Set <span className="font-semibold">{target.name}</span> to{' '}
                  <span className="font-semibold">{newRole}</span>?
                </p>
                {newRole === 'admin' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">This grants full admin access including payment approvals and role management.</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                <Button type="button" onClick={handleConfirm} disabled={loading} className="flex-1 h-10 rounded-xl">
                  {loading ? 'Saving…' : 'Confirm Change'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Delete Account Modal (3-step: reason → compose email → confirm) ──
function DeleteAccountModal({
  target,
  onClose,
  onConfirm,
}: {
  target: Profile
  onClose: () => void
  onConfirm: (opts: { reason: string; emailBody: string; includeRecovery: boolean; sendEmail: boolean }) => Promise<void>
}) {
  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [reason,  setReason]  = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')

  const isStaff = target.role === 'staff'
  const TEMPLATES = isStaff ? STAFF_EMAIL_TEMPLATES : CLIENT_EMAIL_TEMPLATES
  const CUSTOM_IDX = TEMPLATES.length - 1

  const [templateIndex,    setTemplateIndex]    = useState(0)
  const [emailBody,        setEmailBody]        = useState(() => TEMPLATES[0].body(target.first_name ?? target.name, ''))
  const [includeRecovery,  setIncludeRecovery]  = useState(!isStaff)
  const [sendEmail,        setSendEmail]        = useState(true)
  const [previewMode,      setPreviewMode]      = useState(false)

  const DELETE_REASONS = [
    'Duplicate account',
    'Client request',
    'Spam / fake account',
    'Inactive account cleanup',
    'Policy violation',
    'Other',
  ] as const

  const STAFF_DELETE_REASONS = [
    'End of employment',
    'End of contract',
    'Policy violation',
    'Inactive staff account',
    'Other',
  ] as const

  const reasons = isStaff ? STAFF_DELETE_REASONS : DELETE_REASONS

  // Update email body when template changes
  const handleTemplateChange = (idx: number) => {
    setTemplateIndex(idx)
    if (idx < CUSTOM_IDX) {
      setEmailBody(TEMPLATES[idx].body(target.first_name ?? target.name.split(' ')[0], reason))
    }
  }

  // Update template body when reason changes
  useEffect(() => {
    if (templateIndex < CUSTOM_IDX) {
      setEmailBody(TEMPLATES[templateIndex].body(target.first_name ?? target.name.split(' ')[0], reason))
    }
  }, [reason]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStep1Next = () => {
    if (!reason)                         { setError('Please select a reason.'); return }
    if (confirm.trim() !== 'DELETE')     { setError('Type "DELETE" (all caps) to continue.'); return }
    setError('')
    setStep(2)
  }

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm({ reason, emailBody, includeRecovery, sendEmail })
    setLoading(false)
  }

  useLockBodyScroll()
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              </button>
            )}
            {step === 3 && (
              <button onClick={() => setStep(2)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mr-0.5">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              </button>
            )}
            <Trash2 className="h-4 w-4 text-destructive" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Delete Account</h2>
              <p className="text-[10px] text-muted-foreground">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* ── Step 1: Reason + DELETE confirmation ── */}
          {step === 1 && (
            <>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Warning</p>
                <p className="text-sm text-muted-foreground">
                  Deleting <span className="font-semibold text-foreground">{target.name}</span>&apos;s account will move it to Recently Deleted. A notification email will be sent to the user.
                </p>
              </div>
              {error && <AlertBanner variant="error" message={error} />}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reason <span className="text-destructive">*</span>
                </label>
                <select
                  value={reason}
                  onChange={e => { setReason(e.target.value); setError('') }}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-destructive/60 focus:ring-1 focus:ring-destructive/10 outline-none transition-all appearance-none"
                >
                  <option value="">— Select a reason —</option>
                  {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Type <span className="text-destructive font-mono">DELETE</span> to continue <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  placeholder="DELETE"
                  maxLength={6}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-destructive/60 focus:ring-1 focus:ring-destructive/10 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button type="button" onClick={handleStep1Next} className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0">
                  Next: Compose Email →
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Compose notification email ── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Notification Email</p>
                  <p className="text-xs text-muted-foreground">
                    To: <span className="font-semibold text-foreground">{target.name}</span> · {target.email}
                  </p>
                </div>
                {/* Toggle send email */}
                <button
                  onClick={() => setSendEmail(v => !v)}
                  className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                    sendEmail
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  {sendEmail ? 'Will Send' : 'Skip Email'}
                </button>
              </div>

              {sendEmail && (
                <>
                  {/* Template selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Template</label>
                    <select
                      value={templateIndex}
                      onChange={e => handleTemplateChange(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm outline-none transition-all appearance-none"
                    >
                      {TEMPLATES.map((t, i) => (
                        <option key={i} value={i}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {templateIndex === CUSTOM_IDX ? 'Custom Message' : 'Message Preview'}
                      </label>
                      <button
                        onClick={() => setPreviewMode(v => !v)}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        {previewMode ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {previewMode ? (
                      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[120px]">
                        {emailBody || <span className="text-muted-foreground italic">No message</span>}
                      </div>
                    ) : (
                      <textarea
                        rows={7}
                        value={emailBody}
                        onChange={e => {
                          setEmailBody(e.target.value)
                          if (templateIndex < CUSTOM_IDX) setTemplateIndex(CUSTOM_IDX)
                        }}
                        placeholder="Write a message to the user…"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border/80 text-sm text-foreground resize-none outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/10 leading-relaxed"
                      />
                    )}
                  </div>

                  {/* Recovery option — only for clients */}
                  {!isStaff && (
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeRecovery}
                        onChange={e => setIncludeRecovery(e.target.checked)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Include account recovery option</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Adds a &ldquo;Request Account Recovery&rdquo; link to the email. When clicked, it opens an email to support which will appear in Admin › Inquiries › Account Recovery.
                        </p>
                      </div>
                    </label>
                  )}
                </>
              )}

              {!sendEmail && (
                <div className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground">No notification email will be sent. The account will still be moved to Recently Deleted.</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                <Button type="button" onClick={() => setStep(3)} className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0">
                  Review & Delete →
                </Button>
              </div>
            </>
          )}

          {/* ── Step 3: Final confirmation ── */}
          {step === 3 && (
            <>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Final Confirmation</p>
                <p className="text-sm text-foreground">
                  Delete <span className="font-semibold">{target.name}</span>{' '}
                  <span className="text-muted-foreground text-xs">({target.email})</span>?
                </p>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-inside list-disc">
                  <li>Account moved to Recently Deleted</li>
                  <li>Can be recovered within 30 days</li>
                  {sendEmail && <li>Notification email will be sent to {target.email}</li>}
                  {sendEmail && !isStaff && includeRecovery && <li>Account recovery link included in email</li>}
                </ul>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl">← Back</Button>
                <Button type="button" onClick={handleConfirm} disabled={loading} className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0">
                  {loading ? 'Deleting…' : 'Confirm & Delete'}
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Recover Account Modal ─────────────────────────────────────
function RecoverAccountModal({ account, recovering, onClose, onConfirm }: {
  account: DeletedAccount
  recovering: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useLockBodyScroll()
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Recover Account</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">{account.name}</p>
            <p className="text-[10px] text-muted-foreground">{account.email}</p>
            <p className="text-[10px] text-muted-foreground">
              Deleted {new Date(account.deleted_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This will send a password-reset email to <span className="font-semibold text-foreground">{account.email}</span> so they can regain access. The account will be removed from Recently Deleted.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={recovering}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {recovering ? 'Recovering…' : 'Recover & Notify'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Download Backup Accounts (admin only) ─────────────────────
function downloadBackupAccounts(format: 'txt' | 'pdf') {
  const lines = [
    'eMemoria Funeral Services — Default Admin Backup Accounts',
    '============================================================',
    'KEEP THIS FILE SECURE. DO NOT SHARE.',
    '',
    ...BACKUP_ADMINS.flatMap((a, i) => [
      `Account ${i + 1}`,
      `  Name     : ${a.name}`,
      `  Email    : ${a.email}`,
      `  Password : ${a.password}`,
      '',
    ]),
    `Generated: ${new Date().toLocaleString('en-PH')}`,
  ]
  const content = lines.join('\n')

  if (format === 'txt') {
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'ememoria-backup-admins.txt'
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  // PDF — simple HTML-to-print approach via a hidden iframe
  const html = `<!DOCTYPE html><html><head><title>Backup Admin Accounts</title>
  <style>
    body { font-family: monospace; font-size: 13px; margin: 40px; color: #1a1a1a; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .warning { color: #dc2626; font-weight: bold; margin-bottom: 16px; }
    .account { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; margin-bottom: 12px; }
    .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 14px; margin-bottom: 4px; }
    footer { margin-top: 24px; font-size: 11px; color: #9ca3af; }
  </style></head><body>
  <h1>eMemoria — Default Admin Backup Accounts</h1>
  <p class="warning">⚠ CONFIDENTIAL — KEEP THIS DOCUMENT SECURE</p>
  ${BACKUP_ADMINS.map((a, i) => `
    <div class="account">
      <p class="label">Account ${i + 1}</p>
      <p class="value"><span class="label">Name</span><br/>${a.name}</p>
      <p class="value"><span class="label">Email</span><br/>${a.email}</p>
      <p class="value"><span class="label">Password</span><br/>${a.password}</p>
    </div>
  `).join('')}
  <footer>Generated: ${new Date().toLocaleString('en-PH')} · eMemoria Funeral Services</footer>
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  iframe.contentDocument!.write(html)
  iframe.contentDocument!.close()
  iframe.contentWindow!.focus()
  iframe.contentWindow!.print()
  setTimeout(() => document.body.removeChild(iframe), 1000)
}

// ── Profiles Tab ──────────────────────────────────────────────
export function ProfilesTab({ currentRole, highlightDeletedEmail }: { currentRole: UserRole; highlightDeletedEmail?: string | null }) {
  const supabase = createClient()
  const [rows,          setRows]          = useState<Profile[]>([])
  const [deletedRows,   setDeletedRows]   = useState<DeletedAccount[]>([])
  const [myId,          setMyId]          = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [deletedLoading,setDeletedLoading]= useState(false)
  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState<UserRole | 'all'>('all')
  const [view,          setView]          = useState<ProfileView>('active')
  const [recoverTarget, setRecoverTarget] = useState<DeletedAccount | null>(null)
  const [recovering,    setRecovering]    = useState(false)
  const [recoverMsg,    setRecoverMsg]    = useState('')

  // Role change modal
  const [roleChangeTarget, setRoleChangeTarget] = useState<Profile | null>(null)
  const [pendingRole,      setPendingRole]       = useState<UserRole | null>(null)

  // Delete modal
  const [deleteTarget,  setDeleteTarget]  = useState<Profile | null>(null)
  const [generalError,  setGeneralError]  = useState('')

  // Download dropdown
  const [downloadOpen, setDownloadOpen] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!downloadOpen) return
    const handler = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setDownloadOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [downloadOpen])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setMyId(user.id)
      const { data } = await supabase.from('profiles').select('*').order('name', { ascending: true })
      setRows(data ?? [])
      setLoading(false)
    }
    init()
  }, [supabase])

  // Auto-switch to deleted view if highlightDeletedEmail is set
  useEffect(() => {
    if (highlightDeletedEmail) {
      setView('deleted')
      loadDeleted()
    }
  }, [highlightDeletedEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDeleted = async () => {
    setDeletedLoading(true)
    const { data } = await supabase
      .from('deleted_accounts')
      .select('*')
      .is('restored_at', null)
      .order('deleted_at', { ascending: false })
    setDeletedRows((data ?? []) as DeletedAccount[])
    setDeletedLoading(false)
  }

  useEffect(() => {
    if (view === 'deleted') loadDeleted()
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Role change ────────────────────────────────────────────
  const openRoleChange = (profile: Profile, newRole: UserRole) => {
    if (newRole === profile.role) return
    setRoleChangeTarget(profile)
    setPendingRole(newRole)
  }

  const confirmRoleChange = async () => {
    if (!roleChangeTarget || !pendingRole) return
    setGeneralError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'

    const { error } = await supabase.from('profiles').update({ role: pendingRole }).eq('id', roleChangeTarget.id)
    if (error) {
      setGeneralError(`Failed to update role: ${error.message}`)
    } else {
      setRows(r => r.map(p => p.id === roleChangeTarget.id ? { ...p, role: pendingRole } : p))
      await logActivity({
        category: 'log',
        event_type: 'role_changed',
        entity_table: 'profiles',
        entity_id: roleChangeTarget.id,
        actor_id: user?.id,
        actor_name: actorName,
        message: `${actorName} changed ${roleChangeTarget.name}'s role to ${pendingRole}`,
        metadata: {
          target_name: roleChangeTarget.name,
          old_role: roleChangeTarget.role,
          new_role: pendingRole,
        },
      })
    }
    setRoleChangeTarget(null)
    setPendingRole(null)
  }

  // ── Delete account ────────────────────────────────────────
  const confirmDeleteAccount = async (opts: {
    reason: string
    emailBody: string
    includeRecovery: boolean
    sendEmail: boolean
  }) => {
    if (!deleteTarget) return
    setGeneralError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Admin'
      : 'Admin'

    // Send notification email BEFORE deleting (so we still have the user data)
    if (opts.sendEmail) {
      await fetch('/api/notify-account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail:  deleteTarget.email,
          recipientName:   deleteTarget.name,
          role:            deleteTarget.role,
          reason:          opts.reason,
          deletedByName:   actorName,
          emailBody:       opts.emailBody,
          includeRecovery: opts.includeRecovery,
        }),
      }).catch(() => {/* non-fatal */})
    }

    const { error } = await supabase.rpc('admin_delete_user', {
      target_user_id: deleteTarget.id,
      reason:         opts.reason,
      actor_name_in:  actorName,
    })
    if (error) {
      setGeneralError(`Failed to delete account: ${error.message}`)
      setDeleteTarget(null)
      return
    }

    await logActivity({
      category: 'log',
      event_type: 'account_deleted',
      entity_table: 'profiles',
      entity_id: deleteTarget.id,
      actor_id: user?.id,
      actor_name: actorName,
      message: `${actorName} deleted account for ${deleteTarget.name} (${deleteTarget.email})`,
      metadata: {
        target_name: deleteTarget.name,
        target_email: deleteTarget.email,
        reason: opts.reason,
        email_sent: opts.sendEmail,
      },
    })

    setRows(r => r.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // ── Recover deleted account ───────────────────────────────
  const handleRecover = async (account: DeletedAccount) => {
    setRecovering(true)
    setRecoverMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Admin'
      : 'Admin'

    // Send notification email via our API
    await fetch('/api/reply-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: account.email,
        toName: account.name,
        subject: 'Your eMemoria Account Has Been Restored',
        body: `Your account has been successfully restored by our admin team.\n\nYou will receive a separate email with a link to set your password and regain access to your account.\n\nIf you have any questions, please contact us at support@ememoria.site or call +63 918 901 9978.`,
        staffName: actorName,
      }),
    }).catch(() => {/* fire and forget */})

    // Mark as restored in DB
    await supabase.rpc('admin_mark_account_restored', {
      deleted_account_id: account.id,
      actor_name_in: actorName,
    })

    await logActivity({
      category: 'log',
      event_type: 'account_restored',
      entity_table: 'deleted_accounts',
      entity_id: account.id,
      actor_id: user?.id,
      actor_name: actorName,
      message: `${actorName} restored account for ${account.name} (${account.email})`,
      metadata: { name: account.name, email: account.email },
    })

    setDeletedRows(r => r.filter(x => x.id !== account.id))
    setRecoverTarget(null)
    setRecovering(false)
    setRecoverMsg(`Account for ${account.name} restored. Recovery email sent to ${account.email}.`)
    setTimeout(() => setRecoverMsg(''), 6000)
  }

  // ── Filtering + grouping ──────────────────────────────────
  const q = search.toLowerCase()
  const filtered = rows.filter(p => {
    const matchRole   = roleFilter === 'all' || p.role === roleFilter
    const matchSearch = !q || [p.name, p.email, p.role].some(v => v?.toLowerCase().includes(q))
    return matchRole && matchSearch
  })

  const ROLE_ORDER: UserRole[] = ['admin', 'staff', 'client']
  const groups = ROLE_ORDER.map(role => ({
    role,
    profiles: filtered.filter(p => p.role === role),
  })).filter(g => g.profiles.length > 0)

  const roleBadgeVariant = (role: UserRole): BadgeVariant =>
    role === 'admin' ? 'amber' : role === 'staff' ? 'blue' : 'muted'

  const roleGroupLabel = (role: UserRole) =>
    role === 'admin' ? 'Administrators' : role === 'staff' ? 'Staff Members' : 'Clients'

  const roleGroupDesc = (role: UserRole) =>
    role === 'admin'
      ? 'Full access — can manage roles, approve payments, and all operations'
      : role === 'staff'
      ? 'Operational access — can manage bookings, payments, and content'
      : 'Registered client accounts'

  const counts = {
    admin:  rows.filter(p => p.role === 'admin').length,
    staff:  rows.filter(p => p.role === 'staff').length,
    client: rows.filter(p => p.role === 'client').length,
  }

  // ── Shared profile card (mobile) — uniform layout for all roles ──
  const ProfileCard = ({ u }: { u: Profile }) => (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{u.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{u.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
            {u.id === myId && (
              <p className="text-[10px] text-primary font-semibold">You</p>
            )}
          </div>
        </div>
        <Badge label={u.role} variant={roleBadgeVariant(u.role)} />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
        <p className="text-[10px] text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
        {currentRole === 'admin' && (
          <div className="flex items-center gap-2">
            <select
              value={u.role}
              onChange={e => openRoleChange(u, e.target.value as UserRole)}
              className="h-7 pl-2.5 pr-6 rounded-lg bg-background border border-border text-[11px] font-semibold text-foreground outline-none appearance-none cursor-pointer hover:border-primary/40 transition-colors"
            >
              <option value="client">client</option>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            {u.id !== myId && (
              <button
                onClick={() => setDeleteTarget(u)}
                className="h-7 w-7 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                title="Delete account"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const ProfileTableRow = ({ u }: { u: Profile }) => (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{u.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{u.name}</p>
            {u.id === myId && <p className="text-[10px] text-primary font-semibold">You</p>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.email}</td>
      <td className="px-5 py-3.5">
        <Badge label={u.role} variant={roleBadgeVariant(u.role)} />
      </td>
      <td className="px-5 py-3.5 text-[11px] text-muted-foreground">
        {new Date(u.created_at).toLocaleDateString()}
      </td>
      {currentRole === 'admin' && (
        <td className="px-5 py-3.5">
          <select
            value={u.role}
            onChange={e => openRoleChange(u, e.target.value as UserRole)}
            className="h-8 pl-3 pr-7 rounded-xl bg-background border border-border text-xs font-semibold text-foreground outline-none appearance-none cursor-pointer hover:border-primary/40 transition-colors"
          >
            <option value="client">client</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
        </td>
      )}
      {currentRole === 'admin' && (
        <td className="px-5 py-3.5">
          {u.id !== myId ? (
            <button
              onClick={() => setDeleteTarget(u)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">You</span>
          )}
        </td>
      )}
    </tr>
  )

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header with backup download button (admin only) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">User Profiles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} registered accounts</p>
        </div>
        {currentRole === 'admin' && (
          <div className="relative" ref={downloadRef}>
            <button
              onClick={() => setDownloadOpen(v => !v)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download Backup Accounts
            </button>
            {downloadOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={() => { downloadBackupAccounts('txt'); setDownloadOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted/60 transition-colors text-left"
                >
                  Download as TXT
                </button>
                <button
                  onClick={() => { downloadBackupAccounts('pdf'); setDownloadOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted/60 transition-colors text-left"
                >
                  Download as PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {generalError && <AlertBanner variant="error" message={generalError} />}
      {recoverMsg   && <AlertBanner variant="success" message={recoverMsg} />}

      {/* Sub-tab toggle — admin only for deleted */}
      {currentRole === 'admin' && (
        <FilterPills<ProfileView>
          options={[
            { value: 'active',  label: 'Active Accounts' },
            { value: 'deleted', label: `Recently Deleted${deletedRows.length > 0 ? ` (${deletedRows.length})` : ''}` },
          ]}
          active={view}
          onChange={v => setView(v)}
        />
      )}

      {/* ── Recently Deleted view ── */}
      {view === 'deleted' && currentRole === 'admin' && (
        <div className="space-y-4">
          {deletedLoading ? <Spinner /> : deletedRows.length === 0 ? (
            <EmptyState message="No recently deleted accounts." />
          ) : (
            <div className="space-y-3">
              {deletedRows.map(u => {
                const isHighlighted = highlightDeletedEmail?.toLowerCase() === u.email.toLowerCase()
                return (
                  <div
                    key={u.id}
                    id={`deleted-account-${u.id}`}
                    className={`bg-card border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                      isHighlighted ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-destructive">{u.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <p className="text-[9px] text-muted-foreground">
                            Deleted {new Date(u.deleted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })}
                            {u.deleted_by_name ? ` by ${u.deleted_by_name}` : ''}
                            {u.delete_reason ? ` · ${u.delete_reason}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setRecoverTarget(u)}
                      className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" /> Recover
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Active accounts view ── */}
      {view === 'active' && (
        <>
          {/* Search + role filter (no stats cards) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'admin', 'staff', 'client'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    roleFilter === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  {r === 'all' ? `All (${rows.length})` : `${r} (${counts[r as UserRole]})`}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState message="No profiles match your search." />
          ) : (
            <div className="space-y-8">
              {groups.map(({ role, profiles }) => (
                <div key={role}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-2 w-2 rounded-full ${
                      role === 'admin' ? 'bg-amber-500' : role === 'staff' ? 'bg-blue-500' : 'bg-muted-foreground/40'
                    }`} />
                    <div>
                      <p className="text-xs font-bold text-foreground">{roleGroupLabel(role)}</p>
                      <p className="text-[10px] text-muted-foreground">{roleGroupDesc(role)}</p>
                    </div>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      role === 'admin' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                      : role === 'staff' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                      : 'bg-muted/40 text-muted-foreground'
                    }`}>{profiles.length}</span>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {profiles.map(u => <ProfileCard key={u.id} u={u} />)}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <TableShell>
                      <thead>
                        <tr>
                          <Th>User</Th>
                          <Th>Email</Th>
                          <Th>Role</Th>
                          <Th>Joined</Th>
                          {currentRole === 'admin' && <Th>Change Role</Th>}
                          {currentRole === 'admin' && <Th>Actions</Th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {profiles.map(u => <ProfileTableRow key={u.id} u={u} />)}
                      </tbody>
                    </TableShell>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Role change modal */}
          {roleChangeTarget && pendingRole && (
            <RoleChangeModal
              target={roleChangeTarget}
              newRole={pendingRole}
              onClose={() => { setRoleChangeTarget(null); setPendingRole(null) }}
              onConfirm={confirmRoleChange}
            />
          )}

          {/* Delete account modal */}
          {deleteTarget && (
            <DeleteAccountModal
              target={deleteTarget}
              onClose={() => setDeleteTarget(null)}
              onConfirm={confirmDeleteAccount}
            />
          )}
        </>
      )}

      {/* Recover confirm modal */}
      {recoverTarget && (
        <RecoverAccountModal
          account={recoverTarget}
          recovering={recovering}
          onClose={() => setRecoverTarget(null)}
          onConfirm={() => handleRecover(recoverTarget)}
        />
      )}
    </div>
  )
}
