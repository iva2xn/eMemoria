'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { KeyRound } from 'lucide-react'

function ResetPasswordForm() {
  const supabase    = createClient()
  const router      = useRouter()
  const searchParams = useSearchParams()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase sends a `code` param — exchange it for a session before allowing the update
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { setError('Invalid or expired reset link.'); return }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError('This reset link has expired. Please request a new one.')
      else setSessionReady(true)
    })
  }, [supabase, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) { setError('Please enter a new password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
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
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
