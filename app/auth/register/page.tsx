'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/app/context/store'
import { Button } from '@/components/ui/button'
import { HeroHeader } from '@/components/header'
import { Mail, KeyRound, User as UserIcon, AlertCircle, CheckCircle2, FileText, X } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useStore()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Terms and Conditions Modal state
  const [modalOpen, setModalOpen] = useState(false)

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('All fields are required.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    if (!acceptTerms) {
      setErrorMsg('Please read and acknowledge the Terms and Conditions.')
      return
    }

    const res = register(name, email, password)
    if (res.success) {
      setSuccessMsg('Account created successfully! Logging you in...')
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      setErrorMsg(res.message)
    }
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-16 bg-background relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="w-full max-w-md bg-card border border-border/40 p-8 rounded-2xl shadow-xl transition-all duration-300">
          
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-3xl font-bold text-foreground">Create Account</h1>
              <p className="text-sm text-muted-foreground">Register your account with Marcelo P. Gayeta Funeral Services.</p>
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

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="juan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-pass" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    id="reg-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    id="reg-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all text-sm"
                  />
                </div>
              </div>

              {/* Terms and conditions Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary/30 accent-primary"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-normal select-none">
                  I acknowledge and accept the{' '}
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    Terms and Conditions
                  </button>{' '}
                  and Privacy Policy of M.P. Gayeta.
                </label>
              </div>

              <Button type="submit" className="w-full h-11 font-semibold mt-2">
                Create Client Account
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-border/30 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                Login here
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* TERMS AND CONDITIONS MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                <span className="font-serif text-lg font-bold text-foreground">Terms and Conditions</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Scrollable Terms Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <h3 className="font-serif text-base font-bold text-foreground">1. Memorial & Services Agreement</h3>
              <p>
                By registering an account with Marcelo P. Gayeta Funeral Services, you acknowledge that all pricing quotes, memorial arrangements, and physical packages are subject to availability and formal validation by our staff counselors. Inclusions details (e.g. caskets, viewing rooms, hearse vehicles) are subject to scheduling constraints.
              </p>

              <h3 className="font-serif text-base font-bold text-foreground">2. Payment & Reference Submission</h3>
              <p>
                Users are solely responsible for inputting accurate GCash and Bank Transfer reference numbers. Supplying duplicate, fraudulent, or falsified transaction proofs is strictly prohibited and will result in the immediate cancellation of bookings and termination of user access. Marcelo P. Gayeta Funeral Services reserves the right to audit and verify reference logs with relevant financial institutions.
              </p>

              <h3 className="font-serif text-base font-bold text-foreground">3. Privacy Policy</h3>
              <p>
                We value your privacy. Your personal information, contact records, and transactional invoices are treated with the highest degree of confidentiality and are never shared.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/40 bg-muted/20 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAcceptTerms(false)
                  setModalOpen(false)
                }}
              >
                Decline
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setAcceptTerms(true)
                  setModalOpen(false)
                }}
              >
                Acknowledge & Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
