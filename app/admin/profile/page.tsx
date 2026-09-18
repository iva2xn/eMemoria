'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { PhoneInput } from '@/components/ui/phone-input'
import { checkPassword, isPasswordStrong } from '@/lib/password-strength'
import { logActivity } from '@/lib/activity-log'
import {
  User, Mail, Phone, Camera, Check, X,
  ShieldCheck, ChevronLeft,
  Send, KeyRound, MailCheck,
} from 'lucide-react'
import type { Profile } from '@/lib/supabase/types'

const inp  = 'w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl  = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'
const card = 'bg-card border border-border rounded-2xl overflow-hidden'

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

export default function AdminProfilePage() {
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
  const [newEmail,      setNewEmail]      = useState('')
  const [emailTaken,    setEmailTaken]    = useState(false)
  const [emailOtpSent,  setEmailOtpSent]  = useState(false)
  const [emailOtp,      setEmailOtp]      = useState('')
  const [emailMsg,      setEmailMsg]      = useState('')
  const [emailErr,      setEmailErr]      = useState('')
  const [emailLoading,  setEmailLoading]  = useState(false)

  // ── Password change ───────────────────────────────────────────
  type PwStep = 'idle' | 'sent' | 'code' | 'password' | 'done'
  const [pwStep,        setPwStep]        = useState<PwStep>('idle')
  const [pwLinkLoading, setPwLinkLoading] = useState(false)
  const [pwLinkErr,     setPwLinkErr]     = useState('')
  const [pwOtp,         setPwOtp]         = useState('')
  const [pwNew,         setPwNew]         = useState('')
  const [pwConfirm,     setPwConfirm]     = useState('')
  const [pwLoading,     setPwLoading]     = useState(false)

  // ── Avatar ────────────────────────────────────────────────────
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarMsg,       setAvatarMsg]       = useState('')

  // ── Load profile ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth/login?next=/admin/profile'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        // Guard: only admin/staff can be here
        if (data.role !== 'admin' && data.role !== 'staff') {
          router.replace('/')
          return
        }
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

  // ── Email: send OTP via custom API ───────────────────────────
  const sendEmailOtp = async () => {
    setEmailErr(''); setEmailMsg('')
    if (!newEmail.trim()) { setEmailErr('Enter a new email address.'); return }
    if (newEmail.trim() === profile?.email) { setEmailErr('This is already your current email.'); return }
    if (emailTaken) { setEmailErr('This email has already been taken.'); return }
    setEmailLoading(true)
    const res = await fetch('/api/email-change-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newEmail: newEmail.trim() }),
    })
    const json = await res.json()
    setEmailLoading(false)
    if (!res.ok) { setEmailErr(json.error ?? 'Failed to send code.'); return }
    setEmailOtpSent(true)
    setEmailMsg(`A 6-digit code was sent to ${newEmail.trim()}.`)
  }

  // ── Email: verify OTP and apply change ────────────────────────
  const verifyEmailOtp = async () => {
    setEmailErr('')
    if (!emailOtp.trim()) { setEmailErr('Enter the code from your email.'); return }
    setEmailLoading(true)
    const res = await fetch('/api/email-change-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code: emailOtp.trim() }),
    })
    const json = await res.json()
    setEmailLoading(false)
    if (!res.ok) { setEmailErr(json.error ?? 'Verification failed.'); return }
    setProfile(p => p ? { ...p, email: json.newEmail } : p)
    setNewEmail(json.newEmail)
    setEmailOtpSent(false); setEmailOtp(''); setEmailTaken(false)
    setEmailMsg('✓ Email updated successfully.')
    setTimeout(() => setEmailMsg(''), 4000)
  }

  // ── Password change ───────────────────────────────────────────
  const sendPasswordOtp = async () => {
    if (!profile?.email) return
    setPwLinkErr(''); setPwLinkLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/reset-password?email=${encodeURIComponent(profile.email)}`,
    })
    setPwLinkLoading(false)
    if (error) { setPwLinkErr(error.message); return }
    setPwStep('sent')
  }

  const verifyPasswordOtp = async () => {
    if (!profile?.email) return
    setPwLinkErr('')
    if (!pwOtp.trim()) { setPwLinkErr('Enter the code from your email.'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: profile.email,
      token: pwOtp.trim(),
      type:  'recovery',
    })
    setPwLoading(false)
    if (error) { setPwLinkErr('Invalid or expired code. Try again.'); return }
    setPwStep('password')
  }

  const updatePassword = async () => {
    setPwLinkErr('')
    if (!isPasswordStrong(pwNew)) { setPwLinkErr('Password does not meet the requirements.'); return }
    if (pwNew !== pwConfirm)      { setPwLinkErr('Passwords do not match.'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwLoading(false)
    if (error) { setPwLinkErr(error.message); return }
    setPwStep('done')
  }

  // ── Avatar upload ─────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 10 * 1024 * 1024) { setAvatarMsg('Image must be under 10 MB.'); return }
    setAvatarUploading(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: false })
    if (error) { setAvatarMsg(`Upload failed: ${error.message}`); setAvatarUploading(false); return }
    if (profile?.avatar_path && profile.avatar_path !== path) {
      await supabase.storage.from('avatars').remove([profile.avatar_path])
    }
    await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
    setProfile(p => p ? { ...p, avatar_path: path } : p)
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    setAvatarUrl(url)
    setAvatarMsg('✓ Photo updated.')
    setAvatarUploading(false)
    setTimeout(() => setAvatarMsg(''), 3000)
    e.target.value = ''
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean).map(s => s![0].toUpperCase()).join('') ||
    profile.name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 h-14 px-5 border-b border-border bg-card">
        <Link
          href="/admin"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Back to Admin"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-foreground leading-tight">Your Account</h1>
          <p className="text-[10px] text-muted-foreground capitalize leading-tight">
            {profile.role} · {profile.name}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* ── Avatar ── */}
        <Section title="Profile Photo" icon={<Camera className="h-4 w-4" />}>
          <div className="flex items-center gap-5">
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
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Middle Initial</label>
                <input type="text" value={middleInit} onChange={e => setMiddleInit(e.target.value.slice(0, 2))} className={inp} maxLength={2} />
              </div>
              <div>
                <label className={lbl}>Last Name <span className="text-primary">*</span></label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Suffix</label>
                <input type="text" value={suffix} onChange={e => setSuffix(e.target.value)} className={inp} />
              </div>
            </div>
            {nameMsg && (
              <p className={`text-xs font-semibold ${nameMsg.startsWith('Error') ? 'text-destructive' : 'text-primary'}`}>
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
              <p className={`text-xs font-semibold ${phoneMsg.startsWith('Error') ? 'text-destructive' : 'text-primary'}`}>
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
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/60">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-mono text-foreground">{profile.email}</span>
              <span className="ml-auto text-[10px] text-primary font-bold uppercase tracking-wider">Current</span>
            </div>
            <div>
              <label className={lbl}>New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setEmailTaken(false); setEmailOtpSent(false); setEmailOtp(''); setEmailErr(''); setEmailMsg('') }}
                onBlur={() => checkEmailDuplicate(newEmail)}
                placeholder="newemail@example.com"
                className={`${inp} ${emailTaken ? 'border-red-500' : ''}`}
              />
              {emailTaken && (
                <p className="text-[11px] text-destructive font-semibold mt-1 flex items-center gap-1">
                  <X className="h-3 w-3" /> This email has already been taken.
                </p>
              )}
            </div>
            {newEmail.trim() && newEmail.trim() !== profile.email && !emailOtpSent && (
              <Button
                onClick={sendEmailOtp}
                disabled={emailLoading || emailTaken}
                variant="outline"
                className="h-10 px-5 rounded-xl flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {emailLoading ? 'Sending…' : 'Send Verification Code'}
              </Button>
            )}
            {emailOtpSent && (
              <div className="space-y-3 border border-primary/20 rounded-xl p-4 bg-primary/[0.03]">
                <div className="flex items-start gap-3">
                  <MailCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">
                    Code sent to <span className="font-semibold">{newEmail}</span>. Enter it below.
                  </p>
                </div>
                <div>
                  <label className={lbl}>Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className={`${inp} text-center font-mono tracking-widest`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => { setEmailOtpSent(false); setEmailOtp(''); setEmailErr(''); setEmailMsg('') }}
                    className="flex-1 h-10 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={verifyEmailOtp}
                    disabled={emailLoading || emailOtp.length < 6}
                    className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {emailLoading ? 'Verifying…' : 'Verify & Change Email'}
                  </Button>
                </div>
              </div>
            )}
            {emailErr && <AlertBanner variant="error" message={emailErr} />}
            {emailMsg && !emailErr && <p className="text-xs font-semibold text-primary">{emailMsg}</p>}
          </div>
        </Section>

        {/* ── Password ── */}
        <Section title="Change Password" icon={<KeyRound className="h-4 w-4" />}>
          {pwLinkErr && <AlertBanner variant="error" message={pwLinkErr} className="mb-3" />}

          {pwStep === 'idle' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We&apos;ll send a reset code to <span className="font-semibold text-foreground">{profile.email}</span>. Enter it here to set a new password.
              </p>
              <Button
                onClick={sendPasswordOtp}
                disabled={pwLinkLoading}
                variant="outline"
                className="h-10 px-6 rounded-xl flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {pwLinkLoading ? 'Sending…' : 'Send Reset Code'}
              </Button>
            </div>
          )}

          {pwStep === 'sent' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
                <MailCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  Code sent to <span className="font-semibold">{profile.email}</span>. Enter the 8-digit code below.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Reset Code</label>
                <input
                  type="text" inputMode="numeric"
                  value={pwOtp}
                  onChange={e => setPwOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="12345678"
                  maxLength={8}
                  className={`${inp} text-center font-mono tracking-widest`}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setPwStep('idle'); setPwOtp(''); setPwLinkErr('') }} className="flex-1 h-10 rounded-xl">
                  Cancel
                </Button>
                <Button onClick={verifyPasswordOtp} disabled={pwLoading || pwOtp.length < 6} className="flex-1 h-10 rounded-xl">
                  {pwLoading ? 'Verifying…' : 'Verify Code →'}
                </Button>
              </div>
            </div>
          )}

          {pwStep === 'password' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={lbl}>New Password <span className="text-primary">*</span></label>
                <input
                  type="password" value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  placeholder="••••••••"
                  className={inp}
                />
                {pwNew && (
                  <ul className="mt-1.5 space-y-1">
                    {checkPassword(pwNew).map(c => (
                      <li key={c.label} className={`flex items-center gap-1.5 text-[11px] font-medium ${c.pass ? 'text-primary' : 'text-muted-foreground'}`}>
                        {c.pass ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Confirm Password <span className="text-primary">*</span></label>
                <input
                  type="password" value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={inp}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setPwStep('idle'); setPwNew(''); setPwConfirm(''); setPwLinkErr('') }} className="flex-1 h-10 rounded-xl">
                  Cancel
                </Button>
                <Button onClick={updatePassword} disabled={pwLoading} className="flex-1 h-10 rounded-xl">
                  {pwLoading ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </div>
          )}

          {pwStep === 'done' && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Password updated</p>
                <button
                  onClick={() => { setPwStep('idle'); setPwNew(''); setPwConfirm(''); setPwOtp(''); setPwLinkErr('') }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Change again
                </button>
              </div>
            </div>
          )}
        </Section>

      </main>
    </div>
  )
}
