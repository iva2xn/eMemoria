'use client'

import { useState, useEffect } from 'react'
import { ScrollText, Clock, CheckCircle2, PlusCircle, BookOpen } from 'lucide-react'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ObituarySubmitModal } from '@/components/obituaries/obituary-submit-modal'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { splitName } from '@/components/obituaries/tarp-card'
import { useRouter } from 'next/navigation'
import type { Obituary } from '@/lib/supabase/types'

type Tab = 'submit' | 'approved'

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
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
      <Clock className="h-2.5 w-2.5" /> Pending Review
    </span>
  )
}

// ── Obituary card ─────────────────────────────────────────────
function ObituaryCard({ o, getPhotoUrl }: { o: Obituary; getPhotoUrl: (o: Obituary) => string | null }) {
  const { firstName, middleName, lastName } = splitName(o.full_name)
  const photoUrl = getPhotoUrl(o)
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
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

      {/* Status footer */}
      {!o.is_approved && !o.is_published && (
        <div className="px-5 py-3 bg-muted/30 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
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
}

// ── Main page ─────────────────────────────────────────────────
export default function ObituariesPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [activeTab,  setActiveTab]  = useState<Tab>('submit')
  const [obituaries, setObituaries] = useState<Obituary[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)

  const getPhotoUrl = (o: Obituary) => {
    if (!o.image_path || o.image_path === 'obituaries/placeholder.png') return null
    return supabase.storage.from('obituaries').getPublicUrl(o.image_path).data.publicUrl
  }

  const fetchObituaries = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login?next=/obituaries'); return }

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

  const pending  = obituaries.filter(o => !o.is_approved && !o.is_published)
  const approved = obituaries.filter(o => o.is_approved || o.is_published)

  return (
    <ClientLayout>
      <main className="flex-1 bg-background">

        {/* Hero */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">In Memoriam</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Obituaries</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Submit a memorial tarpaulin for your loved one. Our staff will review and publish it.
          </p>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/60">
          <div className="max-w-3xl mx-auto px-4 md:px-6 flex gap-0">
            {([
              { id: 'submit'   as Tab, label: 'Submit Obituary',     icon: PlusCircle, badge: undefined as number | undefined },
              { id: 'approved' as Tab, label: 'Approved Obituaries', icon: BookOpen,   badge: approved.length > 0 ? approved.length : undefined },
            ]).map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors -mb-px
                  ${activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {badge !== undefined && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-background min-h-[400px]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">

          {/* ── Tab 1: Submit ── */}
          {activeTab === 'submit' && (
            <div className="space-y-6">
              {/* CTA card */}
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground mb-1">Create a Memorial Tarpaulin</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Fill in your loved one&apos;s details and upload their photo. Background removal is applied automatically. Our staff will review and publish it.
                  </p>
                </div>
                <Button
                  onClick={() => setShowModal(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl font-semibold text-sm h-10 px-5"
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  Submit an Obituary
                </Button>
              </div>

              {/* Pending submissions */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : pending.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Review</p>
                  {pending.map(o => <ObituaryCard key={o.id} o={o} getPhotoUrl={getPhotoUrl} />)}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No pending submissions.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 2: Approved ── */}
          {activeTab === 'approved' && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : approved.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-semibold text-muted-foreground">No approved obituaries yet.</p>
                  <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                    Once our staff approves your submission it will appear here, and you&apos;ll be able to download the tarpaulin.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('submit')}
                    className="mt-2 rounded-xl text-xs"
                  >
                    Submit an obituary →
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {approved.map(o => <ObituaryCard key={o.id} o={o} getPhotoUrl={getPhotoUrl} />)}
                </div>
              )}
            </div>
          )}

        </div>
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
