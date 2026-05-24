'use client'

import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </>
  )
}
