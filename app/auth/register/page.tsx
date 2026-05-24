'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { FormField } from '@/components/ui/form-field'
import { EmailVerifyModal } from '@/components/auth/email-verify-modal'
import { Mail, KeyRound, User } from 'lucide-react'

export default function RegisterPage() {
  const supabase = createClient()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showVerifyModal,   setShowVerifyModal]   = useState(false)
  const [registeredEmail,   setRegisteredEmail]   = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirm) { setError('Please fill in all fields.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    setLoading(false)

    if (signUpError) { setError(signUpError.message); return }

    setRegisteredEmail(email)
    setShowVerifyModal(true)
  }

  return (
    <>
      <HeroHeader />

      {showVerifyModal && <EmailVerifyModal email={registeredEmail} />}

      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl">
          <div className="text-center space-y-2 mb-6">
            <h1 className="font-serif text-3xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground">Register to access your M.P. Gayeta account.</p>
          </div>

          {error && <AlertBanner variant="error" message={error} className="mb-5" />}

          <form onSubmit={handleRegister} className="space-y-4">
            <FormField id="name" label="Full Name" type="text" placeholder="Juan Dela Cruz"
              value={name} onChange={e => setName(e.target.value)} icon={<User className="h-4.5 w-4.5" />} />
            <FormField id="email" label="Email Address" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} icon={<Mail className="h-4.5 w-4.5" />} />
            <FormField id="password" label="Password" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} icon={<KeyRound className="h-4.5 w-4.5" />} />
            <FormField id="confirm" label="Confirm Password" type="password" placeholder="••••••••"
              value={confirm} onChange={e => setConfirm(e.target.value)} icon={<KeyRound className="h-4.5 w-4.5" />} />

            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-border/30 text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </div>
        </div>
      </main>
    </>
  )
}
