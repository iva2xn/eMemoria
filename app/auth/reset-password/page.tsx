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

// step: 'email'    — enter email, send OTP
// step: 'code'     — email received, enter the OTP code
// step: 'password' — OTP verified, set new password
type Step = 'email' | 'code' | 'password'

function ResetPasswordForm() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [step,     setStep]     = useState<Step>('email')
  const [email,    setEmail]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  // When Supabase email sends "Enter Code →" it appends ?email=... to the redirectTo URL.
  // Pre-fill the email and jump straight to the code-entry step.
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
      setStep('code')
    }
  }, [searchParams])

  // Also listen for PASSWORD_RECOVERY in case the user arrives via a magic-link
  // flow instead of the OTP code flow.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStep('password')
        if (session.user.email) setEmail(session.user.email)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Step 1: send OTP reset email
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password?email=${encodeURIComponent(email)}`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('code')
  }

  // Step 2: verify OTP code and get recovery session
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp.trim()) { setError('Please enter the code from your email.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type:  'recovery',
    })
    setLoading(false)
    if (err) { setError('Invalid or expired code. Please try again.'); return }
    setStep('password')
  }

  // Step 3: set new password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password) { setError('Please enter a new password.'); return }
    if (!isPasswordStrong(password)) { setError('Password does not meet the requirements.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  const steps: Step[] = ['email', 'code', 'password']

  return (
    <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl">

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full transition-colors ${
              step === s ? 'bg-primary'
              : steps.indexOf(step) > i ? 'bg-primary/40'
              : 'bg-border'
            }`} />
            {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Email entry */}
      {step === 'email' && (
        <>
          <div className="text-center space-y-2 mb-6">
            <h1 className="font-serif text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset code.
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
              {loading ? 'Sending…' : 'Send Reset Code'}
            </Button>
          </form>
        </>
      )}

      {/* Step 2: Enter OTP code */}
      {step === 'code' && (
        <>
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-serif text-2xl font-bold text-foreground">Check Your Email</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent an 8-digit code to{' '}
                <span className="font-semibold text-foreground">{email}</span>.
                Enter it below to continue.
              </p>
              <p className="text-xs text-muted-foreground">Didn&apos;t get it? Check your spam folder.</p>
            </div>
          </div>
          {error && <AlertBanner variant="error" message={error} />}
          <form onSubmit={handleVerifyOtp} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reset Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="12345678"
                maxLength={8}
                className="w-full h-11 px-4 rounded-lg bg-background border border-border/80 text-sm text-center font-mono tracking-widest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <Button type="submit" disabled={loading || otp.length < 6} className="w-full h-11 font-semibold">
              {loading ? 'Verifying…' : 'Verify Code →'}
            </Button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setOtp('') }}
              className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Use a different email
            </button>
          </form>
        </>
      )}

      {/* Step 3: Set new password */}
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
