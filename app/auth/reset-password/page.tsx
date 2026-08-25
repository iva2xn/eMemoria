'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { KeyRound, Mail, MailCheck, Check, X } from 'lucide-react'
import { checkPassword, isPasswordStrong } from '@/lib/password-strength'

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null
  const checks = checkPassword(password)
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(c => (
        <li key={c.label} className={`flex items-center gap-1.5 text-[11px] font-medium ${c.pass ? 'text-primary' : 'text-muted-foreground'}`}>
          {c.pass ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
          {c.label}
        </li>
      ))}
    </ul>
  )
}

// Step 1 — collect email and send reset link
// Step 2 — waiting screen: "check your email and click the link"
// Step 3 — set new password (arrived via the email link; session established by auth callback)
type Step = 'email' | 'sent' | 'password'

function ResetPasswordForm() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [step,     setStep]     = useState<Step>('email')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  // If arriving via the email link, the auth callback already exchanged the
  // token for a session — detect that and jump straight to the password step.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStep('password')
        if (session.user.email) setEmail(session.user.email)
      }
    })

    // Also check immediately in case the session is already present on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setStep('password')
        if (session.user.email) setEmail(session.user.email)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, searchParams])

  // Step 1: send a reset link to the user's email
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)

    if (error) { setError(error.message); return }

    setStep('sent')
  }

  // Step 3: update the password — session already set from the email link
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) { setError('Please enter a new password.'); return }
    if (!isPasswordStrong(password)) {
      setError('Password does not meet the requirements.')
      return
    }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }

    setSuccess(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  return (
    <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl">

      {/* ── Step indicator ── */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {(['email', 'sent', 'password'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full transition-colors ${
              step === s
                ? 'bg-primary'
                : (['email', 'sent', 'password'].indexOf(step) > i)
                  ? 'bg-primary/40'
                  : 'bg-border'
            }`} />
            {i < 2 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Email ── */}
      {step === 'email' && (
        <>
          <div className="text-center space-y-2 mb-6">
            <h1 className="font-serif text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {error && <AlertBanner variant="error" message={error} />}

          <form onSubmit={handleSendLink} className="space-y-4 mt-4">
            <FormField
              id="email" label="Email Address" type="email"
              placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="h-4.5 w-4.5" />}
            />
            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold mt-2">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </form>
        </>
      )}

      {/* ── Step 2: Link sent — no code entry needed ── */}
      {step === 'sent' && (
        <div className="flex flex-col items-center text-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-foreground">Check Your Email</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a reset link to{' '}
              <span className="font-semibold text-foreground">{email}</span>.
              Click the link in the email to set a new password.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn&apos;t get it? Check your spam folder.
            </p>
          </div>
          <Button
            type="button" variant="ghost"
            onClick={() => { setStep('email'); setError('') }}
            className="w-full h-11"
          >
            Use a different email
          </Button>
        </div>
      )}

      {/* ── Step 3: New Password ── */}
      {step === 'password' && (
        <>
          <div className="text-center space-y-2 mb-6">
            <h1 className="font-serif text-3xl font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground">Enter a new password for your account.</p>
          </div>

          {error   && <AlertBanner variant="error"   message={error} />}
          {success && <AlertBanner variant="success" message="Password updated! Redirecting to login…" />}

          {!success && (
            <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
              <FormField
                id="password" label="New Password" type="password"
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                icon={<KeyRound className="h-4.5 w-4.5" />}
              />
              <PasswordChecklist password={password} />
              <FormField
                id="confirm" label="Confirm Password" type="password"
                placeholder="••••••••" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                icon={<KeyRound className="h-4.5 w-4.5" />}
              />
              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold mt-2">
                {loading ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          )}
        </>
      )}

    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background flex items-center justify-center px-4 py-16">
        <Suspense fallback={
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        }>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </>
  )
}
