'use client'

import { useState, useEffect } from 'react'
import { X, ScrollText, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { TarpCard, type RichObituary } from '@/components/obituaries/tarp-card'
import { ObituarySubmitModal } from '@/components/obituaries/obituary-submit-modal'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { splitName } from '@/components/obituaries/tarp-card'
import type { Obituary } from '@/lib/supabase/types'

type TabId = 'published' | 'mine'

// ── Status badge for "My Obituaries" tab ─────────────────────
function StatusBadge({ obit }: { obit: Obituary }) {
  if (obit.is_published) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-2.5 w-2.5" /> Published
      </span>
    )
  }
  if (obit.is_approved) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-2.5 w-2.5" /> Approved
      </span>
    )
  }
  if ((obit as Obituary & { deleted_at?: string | null }).deleted_at) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
        <XCircle className="h-2.5 w-2.5" /> Removed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
      <Clock className="h-2.5 w-2.5" /> Pending Review
    </span>
  )
}

export default function ObituariesPage() {
  const supabase = createClient()

  const [activeTab,     setActiveTab]     = useState<TabId>('published')
  const [published,     setPublished]     = useState<RichObituary[]>([])
  const [mine,          setMine]          = useState<RichObituary[]>([])
  const [userId,        setUserId]        = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState<RichObituary | null>(null)
  const [showModal,     setShowModal]     = useState(false)

  const getPhotoUrl = (o: Obituary, isOwner: boolean) => {
    if (!isOwner) return null
    if (!o.image_path || o.image_path === 'obituaries/placeholder.png') return null
    return supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
  }

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    // Published tab — everyone sees these but photo only shown to owner
    const { data: pubData } = await supabase
      .from('obituaries')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setPublished((pubData ?? []).map((o: Obituary) => ({
      ...o,
      photoUrl: getPhotoUrl(o, !!(user?.id && (o.user_id === user.id || o.created_by === user.id))),
    })))

    // My Obituaries tab — only for logged-in users
    if (user?.id) {
      const { data: myData } = await supabase
        .from('obituaries')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      setMine((myData ?? []).map((o: Obituary) => ({
        ...o,
        photoUrl: getPhotoUrl(o, true), // always show own photo
      })))
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ClientLayout>
      <main className="flex-1 bg-background">
        {/* Hero */}
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

        {/* Tab switcher */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
          <div className="flex gap-1 bg-muted/40 border border-border/60 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab('published')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'published'
                  ? 'bg-card shadow-sm text-foreground border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Published Obituaries
              {published.length > 0 && (
                <span className="ml-1.5 text-[9px] text-muted-foreground">({published.length})</span>
              )}
            </button>
            {userId && (
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'mine'
                    ? 'bg-card shadow-sm text-foreground border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Obituaries
                {mine.length > 0 && (
                  <span className="ml-1.5 text-[9px] text-muted-foreground">({mine.length})</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>

          ) : activeTab === 'published' ? (
            published.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-20">No published obituaries yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {published.map(o => (
                  <TarpCard key={o.id} obituary={o} onClick={() => setSelected(o)} />
                ))}
              </div>
            )

          ) : (
            // My Obituaries tab
            mine.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <ScrollText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-semibold text-muted-foreground">No obituaries submitted yet.</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                  Click "Submit an Obituary" above to create a memorial tarpaulin for your loved one.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {mine.map(o => {
                  const { firstName, middleName, lastName } = splitName(o.full_name)
                  return (
                    <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                        <div>
                          <p className="text-sm font-bold text-foreground">{o.full_name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Submitted {new Date(o.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <StatusBadge obit={o} />
                      </div>
                      {/* Tarp preview */}
                      <div className="p-4 bg-muted/10">
                        <TarpPreview
                          firstName={firstName} middleName={middleName} lastName={lastName}
                          birthDate={o.birth_date ?? ''} deathDate={o.death_date ?? ''}
                          age={o.age ?? ''} photoUrl={o.photoUrl}
                          venueAddress={o.venue_address ?? ''} contactNumber={o.contact_number ?? ''}
                          showDownload={o.is_published}
                        />
                      </div>
                      {!o.is_approved && !o.is_published && (
                        <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/20">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Your obituary is under review. Our staff will approve it shortly.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
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

      {showModal && (
        <ObituarySubmitModal
          onClose={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </ClientLayout>
  )
}
