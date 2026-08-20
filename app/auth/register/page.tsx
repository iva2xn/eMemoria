'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { FormField } from '@/components/ui/form-field'
import { EmailVerifyModal } from '@/components/auth/email-verify-modal'
import { PhoneInput } from '@/components/ui/phone-input'
import { checkPassword, isPasswordStrong } from '@/lib/password-strength'
import { Mail, KeyRound, User, Phone, Check, X } from 'lucide-react'

const inp = 'w-full h-11 px-4 rounded-lg bg-background border border-border/80 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50'
const lbl = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null
  const checks = checkPassword(password)
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(c => (
        <li key={c.label} className={`flex items-center gap-1.5 text-[11px] font-medium ${c.pass ? 'text-primary' : 'text-muted-foreground'}`}>
          {c.pass
            ? <Check className="h-3 w-3 shrink-0" />
            : <X    className="h-3 w-3 shrink-0" />
          }
          {c.label}
        </li>
      ))}
    </ul>
  )
}

function RegisterContent() {
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const nextUrl      = searchParams.get('next') ?? '/'

  const [firstName,  setFirstName]  = useState('')
  const [middleInit, setMiddleInit] = useState('')
  const [lastName,   setLastName]   = useState('')
  const [suffix,     setSuffix]     = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [agreed,     setAgreed]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [registered, setRegistered] = useState('')

  // Live duplicate-email detection
  const handleEmailBlur = async () => {
    if (!email.trim()) return
    // Use signInWithOtp attempt — if error is "User already registered" email is taken
    // Better: try to look up via a public RPC or just rely on signUp error
    setEmailTaken(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailTaken(false)

    if (!firstName.trim()) { setError('First name is required.'); return }
    if (!lastName.trim())  { setError('Last name is required.'); return }
    if (!email.trim())     { setError('Email address is required.'); return }
    if (!phone.trim())     { setError('Contact number is required.'); return }
    if (!password)         { setError('Password is required.'); return }
    if (!isPasswordStrong(password)) {
      setError('Password does not meet the requirements below.')
      return
    }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (!agreed) { setError('Please agree to the Terms & Conditions to continue.'); return }

    const fullName = [firstName.trim(), middleInit.trim(), lastName.trim(), suffix.trim()]
      .filter(Boolean).join(' ')

    setLoading(true)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name:           fullName,
          first_name:     firstName.trim(),
          middle_initial: middleInit.trim() || null,
          last_name:      lastName.trim(),
          suffix:         suffix.trim() || null,
          phone:          phone.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })
    setLoading(false)

    // Supabase silently "succeeds" for existing emails when email enumeration
    // protection is on — identities array is empty in that case.
    if (!signUpError && signUpData.user && signUpData.user.identities?.length === 0) {
      setEmailTaken(true)
      setError('This email has already been taken.')
      return
    }

    if (signUpError) {
      const msg  = signUpError.message?.toLowerCase() ?? ''
      const code = (signUpError as { code?: string }).code ?? ''
      if (
        msg.includes('already registered') ||
        msg.includes('already been taken') ||
        msg.includes('already exists') ||
        msg.includes('unique') ||
        msg.includes('duplicate') ||
        msg.includes('user already') ||
        msg.includes('email address is already') ||
        code === 'user_already_exists' ||
        code === '23505'
      ) {
        setEmailTaken(true)
        setError('This email has already been taken.')
      } else {
        setError(signUpError.message)
      }
      return
    }

    setRegistered(email.trim())
    setShowVerify(true)
  }

  const pwChecks = checkPassword(password)
  const pwStrong = pwChecks.every(c => c.pass)

  return (
    <div className="w-full max-w-lg bg-card border border-border/40 p-8 rounded-2xl shadow-xl">
      {showVerify && <EmailVerifyModal email={registered} />}

      <div className="text-center space-y-2 mb-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Create Account</h1>
        <p className="text-sm text-muted-foreground">Register to access your M.P. Gayeta account.</p>
      </div>

      {error && <AlertBanner variant="error" message={error} className="mb-5" />}

      <form onSubmit={handleRegister} className="space-y-5">

        {/* ── Name ── */}
        <div>
          <p className={lbl}>Full Name</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                First Name <span className="text-primary">*</span>
              </label>
              <input
                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Juan" className={inp} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                Middle Initial
              </label>
              <input
                type="text" value={middleInit} onChange={e => setMiddleInit(e.target.value.slice(0, 2))}
                placeholder="S." className={inp} maxLength={2} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                Last Name <span className="text-primary">*</span>
              </label>
              <input
                type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Dela Cruz" className={inp} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                Suffix
              </label>
              <input
                type="text" value={suffix} onChange={e => setSuffix(e.target.value)}
                placeholder="Jr., Sr., III…" className={inp} />
            </div>
          </div>
        </div>

        {/* ── Email ── */}
        <div>
          <FormField
            id="email" label="Email Address" type="email"
            placeholder="you@example.com" value={email}
            onChange={e => { setEmail(e.target.value); setEmailTaken(false) }}
            onBlur={handleEmailBlur}
            icon={<Mail className="h-4 w-4" />}
            className={emailTaken ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          />
          {emailTaken && (
            <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
              <X className="h-3 w-3" /> This email has already been taken.
            </p>
          )}
        </div>

        {/* ── Phone ── */}
        <div>
          <label className={lbl}><Phone className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />Contact Number <span className="text-primary">*</span></label>
          <PhoneInput value={phone} onChange={setPhone} required className={inp} />
        </div>

        {/* ── Password ── */}
        <div>
          <FormField
            id="password" label="Password" type="password"
            placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
          />
          <PasswordChecklist password={password} />
        </div>

        {/* ── Confirm ── */}
        <FormField
          id="confirm" label="Confirm Password" type="password"
          placeholder="••••••••" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          icon={<KeyRound className="h-4 w-4" />}
        />

        {/* ── T&C ── */}
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div className="relative mt-0.5">
            <input
              type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="sr-only peer"
            />
            <div className="h-5 w-5 rounded border-2 border-border peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
              {agreed && <Check className="h-3 w-3 text-white" />}
            </div>
          </div>
          <span className="text-sm text-muted-foreground leading-snug">
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
              Privacy Policy
            </Link>.
          </span>
        </label>

        <Button
          type="submit"
          disabled={loading || !agreed || (password.length > 0 && !pwStrong)}
          className="w-full h-11 font-semibold"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <div className="text-center pt-4 border-t border-border/30 text-sm text-muted-foreground mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <Suspense fallback={<div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />}>
          <RegisterContent />
        </Suspense>
      </main>
    </>
  )
}
