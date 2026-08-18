'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  User, Mail, Phone, Camera, Check, X,
  ShieldCheck, AlertTriangle, Trash2, ChevronLeft,
  Send, KeyRound,
} from 'lucide-react'
import type { Profile } from '@/lib/supabase/types'

const inp  = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl  = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'
const card = 'bg-card border border-border rounded-2xl overflow-hidden'

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className={card}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border/60">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ── Deletion confirm modal (2-step) ───────────────────────────
function DeleteAccountModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [step,    setStep]    = useState<1 | 2>(1)
  const [reason,  setReason]  = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleNext = () => {
    if (!reason.trim()) { setError('Please tell us why you want to delete your account.'); return }
    if (confirm.trim().toLowerCase() !== 'delete') { setError('Type "delete" to continue.'); return }
    setError('')
    setStep(2)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-bold text-foreground">Request Account Deletion</p>
              <p className="text-[10px] text-muted-foreground">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {step === 1 ? (
            <ClientLayout>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-foreground leading-relaxed">
                  Your account will be scheduled for deletion after a <strong>30-day grace period</strong>. You can cancel the request anytime before then by signing in.
                </p>
              </div>
              {error && <AlertBanner variant="error" message={error} />}
              <div className="space-y-1.5">
                <label className={lbl}>Reason for deletion <span className="text-primary">*</span></label>
                <textarea
                  rows={3} value={reason} onChange={e => { setReason(e.target.value); setError('') }}
                  placeholder="Tell us why you're leaving…"
                  className={`${inp} h-auto resize-none py-2.5`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Type <span className="text-red-500">"delete"</span> to continue</label>
                <input
                  type="text" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
                  placeholder='delete' className={inp} />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button onClick={handleNext} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">
                  Next →
                </Button>
              </div>
            </ClientLayout>
          ) : (
            <ClientLayout>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Final Confirmation</p>
                <p className="text-sm text-foreground">Submit your account deletion request?</p>
                <p className="text-[11px] text-muted-foreground">You have 30 days to cancel by signing back in.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                <Button
                  onClick={async () => { setLoading(true); await onConfirm(reason); setLoading(false) }}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  {loading ? 'Submitting…' : 'Request Deletion'}
                </Button>
              </div>
            </ClientLayout>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ProfilePage() {
  const supabase = createClient()
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [userId,    setUserId]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  // ── Name fields ───────────────────────────────────────────────
  const [firstName,  setFirstName]  = useState('')
  const [middleInit, setMiddleInit] = useState('')
  const [lastName,   setLastName]   = useState('')
  const [suffix,     setSuffix]     = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg,    setNameMsg]    = useState('')

  // ── Phone ─────────────────────────────────────────────────────
  const [phone,      setPhone]      = useState('')
  const [phoneSaving,setPhoneSaving]= useState(false)
  const [phoneMsg,   setPhoneMsg]   = useState('')

  // ── Email change with OTP ─────────────────────────────────────
  const [newEmail,   setNewEmail]   = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [otpSent,    setOtpSent]    = useState(false)
  const [otp,        setOtp]        = useState('')
  const [emailMsg,   setEmailMsg]   = useState('')
  const [emailErr,   setEmailErr]   = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // ── Avatar ────────────────────────────────────────────────────
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarMsg,  setAvatarMsg]  = useState('')

  // ── Account deletion ──────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteMsg,       setDeleteMsg]       = useState('')

  // ── Load profile ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth/login?next=/profile'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setFirstName(data.first_name ?? '')
        setMiddleInit(data.middle_initial ?? '')
        setLastName(data.last_name ?? '')
        setSuffix(data.suffix ?? '')
        setPhone(data.phone ?? '')
        setNewEmail(data.email ?? '')
        if (data.avatar_path) {
          setAvatarUrl(supabase.storage.from('avatars').getPublicUrl(data.avatar_path).data.publicUrl)
        }
      }
      setLoading(false)
    })
  }, [supabase, router])

  // ── Save name ─────────────────────────────────────────────────
  const saveName = async () => {
    if (!userId) return
    if (!firstName.trim()) { setNameMsg('First name is required.'); return }
    if (!lastName.trim())  { setNameMsg('Last name is required.'); return }
    setNameSaving(true)
    const fullName = [firstName.trim(), middleInit.trim(), lastName.trim(), suffix.trim()]
      .filter(Boolean).join(' ')
    const { error } = await supabase.from('profiles').update({
      name:           fullName,
      first_name:     firstName.trim(),
      middle_initial: middleInit.trim() || null,
      last_name:      lastName.trim(),
      suffix:         suffix.trim() || null,
    }).eq('id', userId)
    setNameSaving(false)
    setNameMsg(error ? `Error: ${error.message}` : '✓ Name updated.')
    setTimeout(() => setNameMsg(''), 3000)
  }

  // ── Save phone ────────────────────────────────────────────────
  const savePhone = async () => {
    if (!userId) return
    setPhoneSaving(true)
    const { error } = await supabase.from('profiles').update({ phone: phone.trim() || null }).eq('id', userId)
    setPhoneSaving(false)
    setPhoneMsg(error ? `Error: ${error.message}` : '✓ Phone updated.')
    setTimeout(() => setPhoneMsg(''), 3000)
  }

  // ── Email: check duplicate ────────────────────────────────────
  const checkEmailDuplicate = async (val: string) => {
    if (!val.trim() || val.trim() === profile?.email) { setEmailTaken(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', val.trim().toLowerCase())
      .maybeSingle()
    setEmailTaken(!!data)
  }

  // ── Email: send OTP ───────────────────────────────────────────
  const sendOtp = async () => {
    setEmailErr(''); setEmailMsg('')
    if (!newEmail.trim()) { setEmailErr('Enter a new email address.'); return }
    if (newEmail.trim() === profile?.email) { setEmailErr('This is already your current email.'); return }
    if (emailTaken) { setEmailErr('This email has already been taken.'); return }
    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    if (error) { setEmailErr(error.message); return }
    setOtpSent(true)
    setEmailMsg('A verification code was sent to your new email. Enter it below.')
  }

  // ── Email: verify OTP ─────────────────────────────────────────
  const verifyOtp = async () => {
    setEmailErr('')
    if (!otp.trim()) { setEmailErr('Enter the code from your new email.'); return }
    setEmailLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: newEmail.trim(),
      token: otp.trim(),
      type:  'email_change',
    })
    setEmailLoading(false)
    if (error) { setEmailErr('Invalid or expired code. Please try again.'); return }
    // Update profile email too
    await supabase.from('profiles').update({ email: newEmail.trim() }).eq('id', userId!)
    setProfile(p => p ? { ...p, email: newEmail.trim() } : p)
    setOtpSent(false); setOtp(''); setEmailTaken(false)
    setEmailMsg('✓ Email updated successfully.')
    setTimeout(() => setEmailMsg(''), 4000)
  }

  // ── Avatar upload ─────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 10 * 1024 * 1024) { setAvatarMsg('Image must be under 10 MB.'); return }
    setAvatarUploading(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { setAvatarMsg(`Upload failed: ${error.message}`); setAvatarUploading(false); return }
    await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    setAvatarUrl(`${url}?t=${Date.now()}`)
    setAvatarMsg('✓ Photo updated.')
    setAvatarUploading(false)
    setTimeout(() => setAvatarMsg(''), 3000)
  }

  // ── Account deletion request ──────────────────────────────────
  const requestDeletion = async (reason: string) => {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({
      deletion_requested_at: new Date().toISOString(),
      deletion_reason:       reason,
    }).eq('id', userId)
    setShowDeleteModal(false)
    if (error) {
      setDeleteMsg(`Error: ${error.message}`)
    } else {
      setDeleteMsg('Your account deletion has been requested. It will be permanently removed after 30 days. You can cancel by signing back in and visiting this page.')
      setProfile(p => p ? { ...p, deletion_requested_at: new Date().toISOString() } : p)
    }
  }

  const cancelDeletion = async () => {
    if (!userId) return
    await supabase.from('profiles').update({
      deletion_requested_at: null,
      deletion_reason:       null,
    }).eq('id', userId)
    setProfile(p => p ? { ...p, deletion_requested_at: null } : p)
    setDeleteMsg('✓ Deletion request cancelled.')
    setTimeout(() => setDeleteMsg(''), 3000)
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading || !profile) {
    return (
      <ClientLayout>
  
        <main className="flex-1 flex items-center justify-center py-32">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      </ClientLayout>
    )
  }

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean).map(s => s![0].toUpperCase()).join('') ||
    profile.name.slice(0, 2).toUpperCase()

  const deletionRequested = !!profile.deletion_requested_at
  const daysLeft = deletionRequested
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(profile.deletion_requested_at!).getTime()) / 86_400_000))
    : null

  return (
    <ClientLayout>


      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={requestDeletion}
        />
      )}

      <main className="flex-1 bg-background">
        {/* Hero strip */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Your Account</p>
              <h1 className="font-serif text-3xl font-bold text-foreground">Profile</h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* ── Avatar ── */}
          <Section title="Profile Photo" icon={<Camera className="h-4 w-4" />}>
            <div className="flex items-center gap-5">
              {/* Avatar preview */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-full border-2 border-border overflow-hidden bg-primary/10 flex items-center justify-center">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <span className="text-xl font-bold text-primary">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                  title="Change photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

              <div className="space-y-1.5">
                <p className="text-sm text-foreground font-semibold">{profile.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {avatarUploading ? 'Uploading…' : 'Change photo'}
                </button>
                {avatarMsg && <p className="text-xs text-primary">{avatarMsg}</p>}
                <p className="text-[10px] text-muted-foreground">PNG, JPG, WebP · max 10 MB</p>
              </div>
            </div>
          </Section>

          {/* ── Name ── */}
          <Section title="Name" icon={<User className="h-4 w-4" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>First Name <span className="text-primary">*</span></label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Middle Initial</label>
                  <input type="text" value={middleInit} onChange={e => setMiddleInit(e.target.value.slice(0, 2))} placeholder="S." className={inp} maxLength={2} />
                </div>
                <div>
                  <label className={lbl}>Last Name <span className="text-primary">*</span></label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Suffix</label>
                  <input type="text" value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="Jr., Sr., III…" className={inp} />
                </div>
              </div>
              {nameMsg && (
                <p className={`text-xs font-semibold ${nameMsg.startsWith('Error') ? 'text-red-500' : 'text-primary'}`}>
                  {nameMsg}
                </p>
              )}
              <Button onClick={saveName} disabled={nameSaving} className="h-10 px-6 rounded-xl">
                {nameSaving ? 'Saving…' : 'Save Name'}
              </Button>
            </div>
          </Section>

          {/* ── Phone ── */}
          <Section title="Phone Number" icon={<Phone className="h-4 w-4" />}>
            <div className="space-y-3">
              <PhoneInput value={phone} onChange={setPhone} className={inp} />
              {phoneMsg && (
                <p className={`text-xs font-semibold ${phoneMsg.startsWith('Error') ? 'text-red-500' : 'text-primary'}`}>
                  {phoneMsg}
                </p>
              )}
              <Button onClick={savePhone} disabled={phoneSaving} className="h-10 px-6 rounded-xl">
                {phoneSaving ? 'Saving…' : 'Save Phone'}
              </Button>
            </div>
          </Section>

          {/* ── Email ── */}
          <Section title="Email Address" icon={<Mail className="h-4 w-4" />}>
            <div className="space-y-3">
              {/* Current email */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/60">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-mono text-foreground">{profile.email}</span>
                <span className="ml-auto text-[10px] text-primary font-bold uppercase tracking-wider">Current</span>
              </div>

              {/* New email input — always visible */}
              <div>
                <label className={lbl}>New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => { setNewEmail(e.target.value); setEmailTaken(false); setOtpSent(false); setOtp(''); setEmailErr(''); setEmailMsg('') }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => { setEmailFocused(false); checkEmailDuplicate(newEmail) }}
                  placeholder="newemail@example.com"
                  className={`${inp} ${emailTaken ? 'border-red-500' : ''}`}
                />
                {emailTaken && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                    <X className="h-3 w-3" /> This email has already been taken.
                  </p>
                )}
              </div>

              {/* Send OTP button — appears when new email differs from current */}
              {newEmail.trim() && newEmail.trim() !== profile.email && !otpSent && (
                <Button
                  onClick={sendOtp}
                  disabled={emailLoading || emailTaken}
                  variant="outline"
                  className="h-10 px-5 rounded-xl flex items-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {emailLoading ? 'Sending…' : 'Send Verification Code'}
                </Button>
              )}

              {/* OTP input — appears after sending */}
              {otpSent && (
                <div className="space-y-3 border border-primary/20 rounded-xl p-4 bg-primary/[0.03]">
                  <p className="text-xs text-muted-foreground">
                    A 6-digit code was sent to <span className="font-semibold text-foreground">{newEmail}</span>.
                  </p>
                  <div>
                    <label className={lbl}>Verification Code</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="123456"
                      className={inp}
                    />
                  </div>
                  <Button onClick={verifyOtp} disabled={emailLoading || !otp.trim()} className="h-10 px-6 rounded-xl flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5" />
                    {emailLoading ? 'Verifying…' : 'Verify & Change Email'}
                  </Button>
                </div>
              )}

              {emailErr && <AlertBanner variant="error" message={emailErr} />}
              {emailMsg && !emailErr && <p className="text-xs font-semibold text-primary">{emailMsg}</p>}
            </div>
          </Section>

          {/* ── Account deletion ── */}
          <Section title="Account Deletion" icon={<Trash2 className="h-4 w-4 text-red-500" />}>
            {deleteMsg && (
              <div className={`mb-4 p-3 rounded-xl text-xs leading-relaxed border ${
                deleteMsg.startsWith('Error') || deleteMsg.startsWith('Your account')
                  ? 'bg-red-500/5 border-red-500/20 text-foreground'
                  : 'bg-primary/5 border-primary/20 text-primary font-semibold'
              }`}>
                {deleteMsg}
              </div>
            )}

            {deletionRequested ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Deletion scheduled</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your account will be permanently deleted in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
                      Cancel below to keep your account.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={cancelDeletion}
                  className="h-10 px-6 rounded-xl border-primary text-primary hover:bg-primary/10"
                >
                  Cancel Deletion Request
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Requesting deletion starts a <strong>30-day grace period</strong>. Your account and all associated data will be permanently removed after that. You can cancel at any time by signing back in.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-10 px-6 rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 flex items-center gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Request Account Deletion
                </Button>
              </div>
            )}
          </Section>

        </div>
      </main>
    </ClientLayout>
  )
}
