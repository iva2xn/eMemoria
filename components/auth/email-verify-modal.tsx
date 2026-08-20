'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Mail, MailCheck, CheckCircle2 } from 'lucide-react'

export function EmailVerifyModal({ email, nextUrl = '/' }: { email: string; nextUrl?: string }) {
  const router   = useRouter()
  const supabase = useRef(createClient()).current

  // When the user clicks the confirmation link (even on another device/tab),
  // Supabase broadcasts a SIGNED_IN / USER_UPDATED event via the realtime
  // auth channel. Listen for it and auto-redirect to login on this tab.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Sign them back out on this tab — they should go through login
        // so the session is fresh and the redirect is clean.
        supabase.auth.signOut().then(() => {
          router.replace('/auth/login?verified=1')
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, router, nextUrl])

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
              Check your inbox and click the confirmation link to activate your account.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/60 w-full justify-center">
            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-mono font-semibold text-foreground truncate">{email}</span>
          </div>

          {/* Auto-proceed hint */}
          <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 text-left w-full">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              Once you confirm on your phone or another tab, <strong>this page will automatically proceed</strong> to the sign-in form.
            </p>
          </div>

          <Button
            onClick={() => router.push('/auth/login')}
            variant="outline"
            className="w-full h-11 font-bold rounded-xl"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}
