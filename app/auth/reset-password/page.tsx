'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { KeyRound, Mail, ShieldCheck } from 'lucide-react'

// Step 1 — collect email and send OTP
// Step 2 — enter OTP to verify identity
// Step 3 — set new password
type Step = 'email' | 'otp' | 'password'

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

  // If the email link included ?email=..., pre-fill and jump to OTP step
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
      setStep('otp')
    }
  }, [searchParams])

  // Step 1: send a 6-digit OTP to the user's email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)

    if (error) { setError(error.message); return }

    setStep('otp')
  }

  // Step 2: verify the 6-digit OTP the user received
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length < 6) { setError('Please enter the code from your email.'); return }

    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    })
    setLoading(false)

    if (error) { setError('Invalid or expired code. Please try again.'); return }

    setStep('password')
  }

  // Step 3: update the password — session is already set after verifyOtp
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password)            { setError('Please enter a new password.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }

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
        {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full transition-colors ${
              step === s
                ? 'bg-primary'
                : (['email', 'otp', 'password'].indexOf(step) > i)
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
              Enter your email and we&apos;ll send you a 6-digit code.
            </p>
          </div>

          {error && <AlertBanner variant="error" message={error} />}

          <form onSubmit={handleSendOtp} className="space-y-4 mt-4">
            <FormField
              id="email" label="Email Address" type="email"
              placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="h-4.5 w-4.5" />}
            />
            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold mt-2">
              {loading ? 'Sending…' : 'Send Code'}
            </Button>
          </form>
        </>
      )}

      {/* ── Step 2: OTP ── */}
      {step === 'otp' && (
        <>
          <div className="text-center space-y-2 mb-6">
            <h1 className="font-serif text-3xl font-bold text-foreground">Check Your Email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a reset code to <span className="font-medium text-foreground">{email}</span>.
              Enter it below.
            </p>
          </div>

          {error && <AlertBanner variant="error" message={error} />}

          <form onSubmit={handleVerifyOtp} className="space-y-4 mt-4">
            <FormField
              id="otp" label="Reset Code" type="text"
              placeholder="82052410" value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              icon={<ShieldCheck className="h-4.5 w-4.5" />}
            />
            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold mt-2">
              {loading ? 'Verifying…' : 'Verify Code'}
            </Button>
            <Button type="button" variant="ghost"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="w-full h-11">
              Use a different email
            </Button>
          </form>
        </>
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
