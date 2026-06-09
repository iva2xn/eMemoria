'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { KeyRound } from 'lucide-react'

function ResetPasswordForm() {
  const supabase = createClient()
  const router   = useRouter()

  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Check for error params first (link already consumed / expired)
    const params   = new URLSearchParams(window.location.search)
    const hashStr  = window.location.hash.replace('#', '')
    const hash     = new URLSearchParams(hashStr)

    const errorCode = params.get('error_code') ?? hash.get('error_code')
    if (errorCode) {
      setError('This reset link has expired. Please request a new one.')
      return
    }

    // Strategy 1: hash fragment with access_token (immune to Gmail prefetch)
    const accessToken  = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')
    const type         = hash.get('type') ?? params.get('type')

    if (accessToken && type === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' })
        .then(({ error }) => {
          if (error) setError('This reset link has expired. Please request a new one.')
          else setSessionReady(true)
        })
      return
    }

    // Strategy 2: token_hash query param
    const tokenHash = params.get('token_hash')
    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) setError('This reset link has expired. Please request a new one.')
        else setSessionReady(true)
      })
      return
    }

    // Strategy 3: code query param (PKCE)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError('This reset link has expired. Please request a new one.')
        else setSessionReady(true)
      })
      return
    }

    // Strategy 4: listen for PASSWORD_RECOVERY auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
        subscription.unsubscribe()
      }
    })

    const timeout = setTimeout(() => {
      setError('Invalid or expired reset link. Please request a new one.')
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password)              { setError('Please enter a new password.'); return }
    if (password.length < 6)    { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm)   { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }

    setSuccess(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  return (
    <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl">
      <div className="text-center space-y-2 mb-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Set New Password</h1>
        <p className="text-sm text-muted-foreground">Enter a new password for your account.</p>
      </div>

      {error   && <AlertBanner variant="error"   message={error}   />}
      {success && <AlertBanner variant="success" message="Password updated! Redirecting to login…" />}

      {!success && sessionReady && (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

      {!success && !sessionReady && !error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground">Verifying reset link…</p>
        </div>
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