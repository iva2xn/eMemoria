'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TarpPreview } from '@/components/ui/tarp-preview'
import { Badge, SectionHeader, EmptyState, Spinner, inputCls } from './admin-primitives'
import { ScrollText, UploadCloud, X, Check, Plus } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { Obituary } from '@/lib/supabase/types'

// ── Create Tarp Modal ────────────────────────────────────────
function CreateTarpModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [firstName,     setFirstName]     = useState('')
  const [middleName,    setMiddleName]    = useState('')
  const [lastName,      setLastName]      = useState('')
  const [birthDate,     setBirthDate]     = useState('')
  const [deathDate,     setDeathDate]     = useState('')
  const [age,           setAge]           = useState('')
  const [venueAddress,  setVenueAddress]  = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [photo,         setPhoto]         = useState<File | null>(null)
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null)
  const [fileName,      setFileName]      = useState('')
  const [isPublished,   setIsPublished]   = useState(true)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [done,          setDone]          = useState(false)

  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5'
  const inp = 'w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all'

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setFileName(f.name)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim())    { setError('First name is required.'); return }
    if (!lastName.trim())     { setError('Last name is required.'); return }
    if (!birthDate)           { setError('Date of birth is required.'); return }
    if (!deathDate)           { setError('Date of death is required.'); return }
    if (!age)                 { setError('Age is required.'); return }
    if (!venueAddress.trim()) { setError('Venue address is required.'); return }
    if (!contactNumber.trim()){ setError('Contact number is required.'); return }

    setLoading(true)
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ')

    let imagePath = 'obituaries/placeholder.png'
    if (photo) {
      const ext  = photo.name.split('.').pop()
      const path = `obituaries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('obituaries').upload(path, photo, { upsert: false })
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setLoading(false); return }
      imagePath = path
    }

    const { error: insertErr } = await supabase.from('obituaries').insert({
      full_name:      fullName.trim(),
      birth_date:     birthDate || null,
      death_date:     deathDate || null,
      age:            age ? Number(age) : null,
      image_path:     imagePath,
      venue_address:  venueAddress.trim(),
      contact_number: contactNumber.trim(),
      is_published:   isPublished,
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl my-4 pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Create Tarpaulin / Obituary</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {done ? (
            <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">Tarp Created</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                The obituary record has been saved{isPublished ? ' and published' : ' as a draft'}.
              </p>
              <Button onClick={() => { onSuccess(); onClose() }} className="rounded-xl px-8 mt-2">Done</Button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <p className={lbl}>Live Tarpaulin Preview</p>
                <TarpPreview
                  firstName={firstName || 'FIRST NAME'}
                  middleName={middleName}
                  lastName={lastName || 'LAST NAME'}
                  birthDate={birthDate}
                  deathDate={deathDate}
                  age={age}
                  photoUrl={photoPreview}
                  venueAddress={venueAddress}
                  contactNumber={contactNumber}
                />
              </div>

              {error && <AlertBanner variant="error" message={error} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={lbl}>First Name of Deceased <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Juan" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Middle Name (optional)</label>
                    <input type="text" placeholder="e.g. Santos" value={middleName} onChange={e => setMiddleName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Last Name / Surname <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Date of Birth <span className="text-primary">*</span></label>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Date of Death <span className="text-primary">*</span></label>
                    <input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Age <span className="text-primary">*</span></label>
                    <input type="number" placeholder="e.g. 72" min="0" max="150" value={age} onChange={e => setAge(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Contact Number <span className="text-primary">*</span></label>
                    <input type="tel" placeholder="e.g. 0916 797 8416" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Venue / Wake Address <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Brgy. Mayuwi, Tayabas City" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className={inp} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Photo of Deceased (PNG with transparent background preferred)</label>
                  <div
                    className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-background cursor-pointer group"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs font-semibold text-foreground truncate px-4">{fileName || 'Click to upload photo'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG recommended · max 5 MB</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsPublished(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${isPublished ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-foreground font-medium">
                    {isPublished ? 'Publish immediately' : 'Save as draft'}
                  </span>
                </label>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 font-bold rounded-xl">
                    {loading ? 'Creating…' : 'Create Tarp'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Obituaries Tab ───────────────────────────────────────────
export function ObituariesTab() {
  const supabase = createClient()
  const [rows, setRows]       = useState<Obituary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Obituary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [editFirst,   setEditFirst]   = useState('')
  const [editMiddle,  setEditMiddle]  = useState('')
  const [editLast,    setEditLast]    = useState('')
  const [editBirth,   setEditBirth]   = useState('')
  const [editDeath,   setEditDeath]   = useState('')
  const [editAge,     setEditAge]     = useState('')
  const [editVenue,   setEditVenue]   = useState('')
  const [editContact, setEditContact] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('obituaries').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const openEdit = (o: Obituary) => {
    setSelected(o)
    const parts = o.full_name.trim().split(' ')
    setEditFirst(parts[0] ?? '')
    setEditLast(parts.length > 1 ? parts[parts.length - 1] : '')
    setEditMiddle(parts.length > 2 ? parts.slice(1, -1).join(' ') : '')
    setEditBirth(o.birth_date ?? '')
    setEditDeath(o.death_date ?? '')
    setEditAge(o.age ? String(o.age) : '')
    setEditVenue(o.venue_address ?? '')
    setEditContact(o.contact_number ?? '')
  }

  const saveEdit = async () => {
    if (!selected) return
    setSaving(true)
    const fullName = [editFirst.trim(), editMiddle.trim(), editLast.trim()].filter(Boolean).join(' ')
    const updates = {
      full_name:      fullName,
      birth_date:     editBirth || null,
      death_date:     editDeath || null,
      age:            editAge ? Number(editAge) : null,
      venue_address:  editVenue || null,
      contact_number: editContact || null,
    }
    await supabase.from('obituaries').update(updates).eq('id', selected.id)
    setRows(r => r.map(x => x.id === selected.id ? { ...x, ...updates } : x))
    setSelected(prev => prev ? { ...prev, ...updates } : null)
    setSaving(false)
  }

  const togglePublish = async (id: string, current: boolean) => {
    const { data: { user } } = supabase.auth.getUser ? await supabase.auth.getUser() : { data: { user: null } }
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    const obit = rows.find(r => r.id === id)

    await supabase.from('obituaries').update({ is_published: !current }).eq('id', id)
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: !current } : x))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_published: !current } : null)

    await logActivity({
      category:     'log',
      event_type:   !current ? 'obituary_published' : 'obituary_unpublished',
      entity_table: 'obituaries',
      entity_id:    id,
      actor_id:     user?.id,
      actor_name:   actorName,
      message:      `${actorName} ${!current ? 'published' : 'unpublished'} obituary for ${obit?.full_name ?? 'unknown'}`,
      metadata:     { full_name: obit?.full_name },
    })
  }

  const getPhotoUrl = (path: string) => {
    if (!path || path === 'obituaries/placeholder.png') return null
    return supabase.storage.from('obituaries').getPublicUrl(path).data.publicUrl
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="Obituaries" sub={`${rows.length} records · ${rows.filter(r => r.is_published).length} published`} />
        <button
          onClick={() => setShowCreateModal(true)}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Create Tarp
        </button>
      </div>

      {showCreateModal && (
        <CreateTarpModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            supabase.from('obituaries').select('*').order('created_at', { ascending: false })
              .then(({ data }) => setRows(data ?? []))
          }}
        />
      )}

      {rows.length === 0 ? <EmptyState message="No obituary records yet." /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map(o => {
            const parts = o.full_name.trim().split(' ')
            const first  = parts[0] ?? ''
            const last   = parts.slice(-1)[0] ?? ''
            const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : ''
            return (
              <div key={o.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${selected?.id === o.id ? 'border-primary shadow-md' : 'border-border hover:border-primary/40'}`}>
                <div className="p-3 bg-muted/20 border-b border-border">
                  <TarpPreview
                    firstName={first} middleName={middle} lastName={last}
                    birthDate={o.birth_date ?? ''} deathDate={o.death_date ?? ''}
                    age={o.age ?? ''} photoUrl={getPhotoUrl(o.image_path)}
                    venueAddress={o.venue_address ?? ''} contactNumber={o.contact_number ?? ''}
                    showDownload
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{o.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.submitter_name ?? ''} · {o.submitter_email ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge label={o.is_published ? 'Published' : 'Draft'} variant={o.is_published ? 'green' : 'muted'} />
                    <button onClick={() => openEdit(o)}
                      className="h-7 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => togglePublish(o.id, o.is_published)}
                      className={`h-7 px-3 rounded-lg text-[10px] font-bold border transition-all ${o.is_published ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500' : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'}`}>
                      {o.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Edit Obituary — Live Preview</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'First Name',   value: editFirst,   set: setEditFirst,   placeholder: 'e.g. Juan' },
                  { label: 'Middle Name',  value: editMiddle,  set: setEditMiddle,  placeholder: 'optional' },
                  { label: 'Last Name',    value: editLast,    set: setEditLast,    placeholder: 'e.g. Dela Cruz' },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                    <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Birth Date', value: editBirth, set: setEditBirth, type: 'date' },
                  { label: 'Death Date', value: editDeath, set: setEditDeath, type: 'date' },
                  { label: 'Age',        value: editAge,   set: setEditAge,   type: 'number' },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                    <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} className={inputCls} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venue / Address</label>
                <input value={editVenue} onChange={e => setEditVenue(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Number</label>
                <input value={editContact} onChange={e => setEditContact(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={saveEdit} disabled={saving} className="flex-1 h-10 font-bold rounded-xl">
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <button
                  onClick={() => togglePublish(selected.id, selected.is_published)}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-all ${selected.is_published ? 'bg-muted border-border text-muted-foreground hover:border-red-500/40 hover:text-red-500' : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'}`}
                >
                  {selected.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
            <div className="px-6 py-5 bg-muted/10 flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Tarp Preview</p>
              <TarpPreview
                firstName={editFirst || 'FIRST'} middleName={editMiddle}
                lastName={editLast || 'LAST'} birthDate={editBirth}
                deathDate={editDeath} age={editAge}
                photoUrl={getPhotoUrl(selected.image_path)}
                venueAddress={editVenue} contactNumber={editContact}
                showDownload
              />
              <p className="text-[10px] text-muted-foreground">Updates as you type. Save to persist changes.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
