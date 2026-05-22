'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/app/context/store'
import { Button } from '@/components/ui/button'
import { HeroHeader } from '@/components/header'
import { AlertBanner } from '@/components/ui/alert-banner'
import { FormField } from '@/components/ui/form-field'
import { KeyRound, Mail, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
  const { login, recoverPassword } = useStore()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Password Recovery state
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!email || !password) {
      setErrorMsg('Please fill in all fields.')
      return
    }

    const res = login(email, password)
    if (res.success) {
      setSuccessMsg(res.message)
      setTimeout(() => router.push('/'), 1000)
    } else {
      setErrorMsg(res.message)
    }
  }

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryError('')
    setRecoverySuccess('')

    if (!recoveryEmail) {
      setRecoveryError('Please input your email address.')
      return
    }

    const res = recoverPassword(recoveryEmail)
    if (res.success) {
      setRecoverySuccess(res.message)
    } else {
      setRecoveryError(res.message)
    }
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl transition-all duration-300">

          {!showRecovery ? (
            /* LOGIN CARD */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-serif text-3xl font-bold text-foreground">Welcome Back</h1>
                <p className="text-sm text-muted-foreground">Access your M.P. Gayeta account to view billing and slots.</p>
              </div>

              {/* Demo Notice */}
              <div className="p-3 bg-accent/40 rounded-lg border border-primary/20 flex gap-2 text-xs text-muted-foreground leading-relaxed">
                <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-primary">Demo Account Credentials:</span>
                  <br />
                  &bull; Client Login: <code className="font-mono text-foreground font-semibold">client@gfs.com</code>
                  <br />
                  &bull; Staff Login: <code className="font-mono text-foreground font-semibold">admin@gfs.com</code>
                  <br />
                  &bull; Password: <code className="font-mono text-foreground">any password</code>
                </div>
              </div>

              {errorMsg && <AlertBanner variant="error" message={errorMsg} />}
              {successMsg && <AlertBanner variant="success" message={successMsg} />}

              <form onSubmit={handleLogin} className="space-y-4">
                <FormField
                  id="email"
                  label="Email Address"
                  type="email"
                  placeholder="client@gfs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4.5 w-4.5" />}
                />

                <FormField
                  id="pass"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<KeyRound className="h-4.5 w-4.5" />}
                  labelRight={
                    <button
                      type="button"
                      onClick={() => setShowRecovery(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  }
                />

                <Button type="submit" className="w-full h-11 font-semibold mt-2">
                  Authenticate Account
                </Button>
              </form>

              <div className="text-center pt-2 border-t border-border/30 text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="font-semibold text-primary hover:underline">
                  Create a new account
                </Link>
              </div>
            </div>
          ) : (
            /* PASSWORD RECOVERY CARD */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-serif text-3xl font-bold text-foreground">Password Recovery</h1>
                <p className="text-sm text-muted-foreground">
                  Provide your registered email. We will search the database and simulate a password reset dispatch.
                </p>
              </div>

              {recoveryError && <AlertBanner variant="error" message={recoveryError} />}
              {recoverySuccess && <AlertBanner variant="success" message={recoverySuccess} />}

              <form onSubmit={handleRecovery} className="space-y-4">
                <FormField
                  id="recovery-email"
                  label="Email Address"
                  type="email"
                  placeholder="client@gfs.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  icon={<Mail className="h-4.5 w-4.5" />}
                />

                <Button type="submit" className="w-full h-11 font-semibold mt-2">
                  Send Recovery Request
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowRecovery(false)
                    setRecoveryError('')
                    setRecoverySuccess('')
                  }}
                  className="w-full h-11 font-semibold"
                >
                  Back to login
                </Button>
              </form>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
