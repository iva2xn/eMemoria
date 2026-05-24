'use client'

import { useState, useEffect } from 'react'
import { X, ScrollText } from 'lucide-react'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ObituarySlideshow } from '@/components/obituaries/obituary-slideshow'
import { TarpCard, type RichObituary } from '@/components/obituaries/tarp-card'
import { ObituarySubmitModal } from '@/components/obituaries/obituary-submit-modal'
import type { Obituary } from '@/lib/supabase/types'

export default function ObituariesPage() {
  const supabase = createClient()

  // OBITUARY DATA — list of published obituaries from admin, 
  // kasi upon user submission hindi yan naka auto publish
  const [allPublished, setAllPublished] = useState<RichObituary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RichObituary | null>(null)
  const [showModal, setShowModal] = useState(false)

  // OBITUARY FETCH — eto yung sa page naten for user previewing
  // 10 max lang yung finefetch natin dito since masyadong magiging bloated if ddadagdagan
  useEffect(() => {
    const fetchObituaries = async () => {
      const { data, error } = await supabase
        .from('obituaries')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) { setLoading(false); return }
      const enriched: RichObituary[] = (data ?? []).map((o: Obituary) => ({
        ...o,
        photoUrl: o.image_path && o.image_path !== 'obituaries/placeholder.png'
          ? supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
          : null,
      }))

      setAllPublished(enriched)
      setLoading(false)
    }

    fetchObituaries()
  }, [supabase])

  return (
    <>
      <HeroHeader />

      <main
        className="flex flex-col bg-background overflow-hidden"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Obituaries</h1>
          <Button
            onClick={() => setShowModal(true)}
            size="sm"
            className="inline-flex items-center gap-1.5 rounded-xl font-semibold text-xs"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Submit
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center px-4 md:px-8 py-4">
          {loading ? (
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : allPublished.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No published obituaries yet.</p>
          ) : (
            <ObituarySlideshow obituaries={allPublished} onSelect={setSelected} />
          )}
        </div>
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-5 right-5 z-[110] h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={e => { e.stopPropagation(); setSelected(null) }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <TarpCard obituary={selected} />
          </div>
        </div>
      )}

      {showModal && <ObituarySubmitModal onClose={() => setShowModal(false)} />}
    </>
  )
}
