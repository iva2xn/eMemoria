'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react'

export function AuthGateModal({ returnUrl }: { returnUrl: string }) {
  const router  = useRouter()
  const encoded = encodeURIComponent(returnUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-primary" />
        <div className="px-8 py-8 flex flex-col items-center text-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-serif text-xl font-bold text-foreground">Account Required</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please sign in or create an account to avail our services. Your details will be pre-filled for a faster checkout.
            </p>
          </div>
          <div className="w-full space-y-2.5">
            <Button
              onClick={() => router.push(`/auth/login?next=${encoded}`)}
              className="w-full h-11 font-bold rounded-xl gap-2"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/auth/register?next=${encoded}`)}
              className="w-full h-11 font-bold rounded-xl gap-2"
            >
              <UserPlus className="h-4 w-4" /> Create Account
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Already verified? Sign in to continue.</p>
        </div>
      </div>
    </div>
  )
}
