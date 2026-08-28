'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSections } from '@/components/home/home-sections'
import { Footer } from '@/components/footer'
import { LAST_PAGE_KEY } from '@/components/last-page-tracker'

const HOME_SEEN_KEY = 'home:seen' // sessionStorage — cleared when tab closes

export default function HomePage() {
  const router = useRouter()

  // On fresh load: redirect to last visited page.
  // Once the user has been on home this session, skip the redirect
  // so clicking the Home nav link always works.
  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(HOME_SEEN_KEY)
    sessionStorage.setItem(HOME_SEEN_KEY, '1')

    if (!alreadySeen) {
      const last = localStorage.getItem(LAST_PAGE_KEY)
      if (last && last !== '/') {
        router.push(last)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <main className="overflow-x-hidden flex-1">
        <Suspense>
          <HeroSection />
        </Suspense>
        <HomeSections />
      </main>
      <Footer />
    </>
  )
}
