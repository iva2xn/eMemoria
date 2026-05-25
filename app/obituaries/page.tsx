'use client'

import { useState, useEffect } from 'react'
import { X, ScrollText } from 'lucide-react'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { TarpCard, type RichObituary } from '@/components/obituaries/tarp-card'
import { ObituarySubmitModal } from '@/components/obituaries/obituary-submit-modal'
import type { Obituary } from '@/lib/supabase/types'

export default function ObituariesPage() {
  const supabase = createClient()

  const [obituaries, setObituaries] = useState<RichObituary[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<RichObituary | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Get current user (may be null for guests)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data, error } = await supabase
        .from('obituaries')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) { setLoading(false); return }

      const enriched: RichObituary[] = (data ?? []).map((o: Obituary) => {
        // Only show the actual photo to the user who submitted it
        const isOwner = user?.id && o.created_by && user.id === o.created_by
        const photoUrl = isOwner && o.image_path && o.image_path !== 'obituaries/placeholder.png'
          ? supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
          : null
        return { ...o, photoUrl }
      })

      setObituaries(enriched)
      setLoading(false)
    }

    init()
  }, [supabase])

  return (
    <>
      <HeroHeader />

      <main className="flex-1 bg-background">
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">In Memoriam</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Obituaries</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-5">
            Honoring those who have passed. Each life remembered with dignity.
          </p>
          <Button
            onClick={() => setShowModal(true)}
            size="sm"
            className="inline-flex items-center gap-1.5 rounded-xl font-semibold text-xs"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Submit an Obituary
          </Button>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : obituaries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-20">No published obituaries yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {obituaries.map(o => (
                <TarpCard key={o.id} obituary={o} onClick={() => setSelected(o)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox */}
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
