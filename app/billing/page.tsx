'use client'

import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { BillingForm } from '@/components/billing/billing-form'

export default function BillingPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        <div className="border-b border-border/40 bg-muted/20 px-6 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Secure Payment</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Payment Portal</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Submit your payment details and proof of transaction. Our team will verify and confirm within the day.
          </p>
        </div>

        <Suspense fallback={
          <div className="py-20 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }>
          <BillingForm />
        </Suspense>

      </main>
    </>
  )
}
