'use client'

import { useState, useEffect } from 'react'
import { ScrollText, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ObituarySubmitModal } from '@/components/obituaries/obituary-submit-modal'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { splitName } from '@/components/obituaries/tarp-card'
import { useRouter } from 'next/navigation'
import type { Obituary } from '@/lib/supabase/types'

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ obit }: { obit: Obituary }) {
  if (obit.is_published) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="h-2.5 w-2.5" /> Published
    </span>
  )
  if (obit.is_approved) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="h-2.5 w-2.5" /> Approved
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
      <Clock className="h-2.5 w-2.5" /> Pending Review
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ObituariesPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [obituaries, setObituaries] = useState<Obituary[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [userId,     setUserId]     = useState<string | null>(null)

  const getPhotoUrl = (o: Obituary) => {
    if (!o.image_path || o.image_path === 'obituaries/placeholder.png') return null
    return supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
  }

  const fetchObituaries = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Not logged in — redirect to login
      router.replace('/auth/login?next=/obituaries')
      return
    }

    setUserId(user.id)

    // Only fetch THIS user's own obituaries
    const { data } = await supabase
      .from('obituaries')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setObituaries(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchObituaries()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ClientLayout>
      <main className="flex-1 bg-background">

        {/* Hero */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">In Memoriam</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">My Obituaries</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-5">
            Submit a memorial tarpaulin for your loved one. Our staff will review and publish it.
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

        {/* List */}
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>

          ) : obituaries.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <ScrollText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">No obituaries submitted yet.</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                Click "Submit an Obituary" above to create a memorial tarpaulin for your loved one.
              </p>
            </div>

          ) : (
            <div className="space-y-6">
              {obituaries.map(o => {
                const { firstName, middleName, lastName } = splitName(o.full_name)
                const photoUrl = getPhotoUrl(o)
                return (
                  <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
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
                        age={o.age ?? ''} photoUrl={photoUrl}
                        venueAddress={o.venue_address ?? ''} contactNumber={o.contact_number ?? ''}
                        showDownload={o.is_published}
                      />
                    </div>

                    {/* Status message */}
                    {!o.is_approved && !o.is_published && (
                      <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/20">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Your obituary is under review. Our staff will notify you once it&apos;s approved.
                        </p>
                      </div>
                    )}
                    {o.is_approved && !o.is_published && (
                      <div className="px-5 py-3 bg-blue-500/5 border-t border-blue-500/20">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Your obituary has been approved and will be published shortly.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <ObituarySubmitModal
          onClose={() => { setShowModal(false); fetchObituaries() }}
        />
      )}
    </ClientLayout>
  )
}
