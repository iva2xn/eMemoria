'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/app/context/store'
import { Button } from '@/components/ui/button'
import { HeroHeader } from '@/components/header'
import { KeyRound, Mail, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'

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
      setTimeout(() => {
        router.push('/')
      }, 1000)
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

              {errorMsg && (
                <div className="p-3.5 bg-destructive/15 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-primary/15 text-primary border border-primary/20 rounded-lg flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                    <input
                      id="email"
                      type="email"
                      placeholder="client@gfs.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pass" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecovery(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                    <input
                      id="pass"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                    />
                  </div>
                </div>

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

              {recoveryError && (
                <div className="p-3.5 bg-destructive/15 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {recoverySuccess && (
                <div className="p-3.5 bg-primary/15 text-primary border border-primary/20 rounded-lg flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{recoverySuccess}</span>
                </div>
              )}

              <form onSubmit={handleRecovery} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                    <input
                      id="recovery-email"
                      type="email"
                      placeholder="client@gfs.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                    />
                  </div>
                </div>

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
