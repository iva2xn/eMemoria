import React from 'react'
import Link from 'next/link'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { LockKeyhole } from 'lucide-react'

export default function RegisterPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="w-full max-w-md bg-card border border-border/40 p-10 rounded-2xl shadow-xl text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <LockKeyhole className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-foreground">Registration Unavailable</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              New account registration is currently closed. Please contact M.P. Gayeta Funeral Services staff to request access.
            </p>
          </div>
          <Button asChild className="w-full h-11 font-semibold rounded-xl">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Need help?{' '}
            <Link href="/contact" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Contact us
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
