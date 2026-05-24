'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { FormField } from '@/components/ui/form-field'
import { KeyRound, Mail } from 'lucide-react'

function LoginContent() {
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const nextUrl      = searchParams.get('next') ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showRecovery,    setShowRecovery]    = useState(false)
  const [recoveryEmail,   setRecoveryEmail]   = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryError,   setRecoveryError]   = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState('')

  // Sign in with email + password, then refresh page 
  // para ma update nung middlleware natin yungg session cookie
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!email || !password) { setErrorMsg('Please fill in all fields.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) { setErrorMsg('Invalid email or password.'); return }
    window.location.href = nextUrl
  }

  // Send a password-reset email
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryError(''); setRecoverySuccess('')
    if (!recoveryEmail) { setRecoveryError('Please enter your email address.'); return }

    setRecoveryLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setRecoveryLoading(false)

    if (error) { setRecoveryError(error.message); return }
    setRecoverySuccess('Password reset email sent. Check your inbox.')
  }

  return (
    <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl">
      {!showRecovery ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-3xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Access your M.P. Gayeta account to view billing and slots.</p>
          </div>

          {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

          <form onSubmit={handleLogin} className="space-y-4">
            <FormField id="email" label="Email Address" type="email"
              placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="h-4.5 w-4.5" />}
            />
            <FormField id="pass" label="Password" type="password"
              placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<KeyRound className="h-4.5 w-4.5" />}
              labelRight={
                <button type="button" onClick={() => setShowRecovery(true)}
                  className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              }
            />
            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-border/30 text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href={`/auth/register${nextUrl !== '/' ? `?next=${encodeURIComponent(nextUrl)}` : ''}`}
              className="font-semibold text-primary hover:underline"
            >
              Register
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-3xl font-bold text-foreground">Password Recovery</h1>
            <p className="text-sm text-muted-foreground">
              Enter your registered email and we&apos;ll send a reset link.
            </p>
          </div>

          {recoveryError   && <AlertBanner variant="error"   message={recoveryError} />}
          {recoverySuccess && <AlertBanner variant="success" message={recoverySuccess} />}

          <form onSubmit={handleRecovery} className="space-y-4">
            <FormField id="recovery-email" label="Email Address" type="email"
              placeholder="you@example.com" value={recoveryEmail}
              onChange={e => setRecoveryEmail(e.target.value)}
              icon={<Mail className="h-4.5 w-4.5" />}
            />
            <Button type="submit" disabled={recoveryLoading} className="w-full h-11 font-semibold mt-2">
              {recoveryLoading ? 'Sending…' : 'Send Reset Link'}
            </Button>
            <Button type="button" variant="ghost"
              onClick={() => { setShowRecovery(false); setRecoveryError(''); setRecoverySuccess('') }}
              className="w-full h-11 font-semibold">
              Back to Sign In
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <Suspense>
          <LoginContent />
        </Suspense>
      </main>
    </>
  )
}
