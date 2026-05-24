'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Mail, MailCheck } from 'lucide-react'

export function EmailVerifyModal({ email }: { email: string }) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-primary" />
        <div className="px-8 py-8 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-serif text-xl font-bold text-foreground">Verify Your Email</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must verify your account via email before signing in.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/60">
            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-mono font-semibold text-foreground truncate">{email}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We sent a confirmation link to the address above. Click it to activate your account, then come back to sign in.
          </p>
          <Button
            onClick={() => router.push('/auth/login')}
            className="w-full h-11 font-bold rounded-xl mt-1"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}
