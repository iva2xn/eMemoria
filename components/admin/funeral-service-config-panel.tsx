'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { inputCls } from './admin-primitives'
import { AlertBanner } from '@/components/ui/alert-banner'
import {
  Settings, ChevronDown, ChevronUp, Plus, Trash2,
  X, Check, Pencil, GripVertical, Image as ImageIcon,
  Package,
} from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { TraditionalPackage, CremationUrn, FuneralAddon } from '@/lib/supabase/types'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type ServiceKey = 'traditional' | 'cremation'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────
// Traditional Package Editor Modal
// ─────────────────────────────────────────────────────────────
function TraditionalPackageModal({
  pkg,
  index,
  onClose,
  onSave,
}: {
  pkg: TraditionalPackage | null   // null = new
  index: number | null
  onClose: () => void
  onSave: (pkg: TraditionalPackage) => void
}) {
  const supabase  = createClient()
  const isNew     = pkg === null
  const [title,   setTitle]   = useState(pkg?.title ?? '')
  const [price,   setPrice]   = useState(String(pkg?.price ?? ''))
  const [imgSrc,  setImgSrc]  = useState(pkg?.imageSrc ?? '')
  const [feats,   setFeats]   = useState<string[]>(pkg?.features ?? [''])
  const [uploading, setUploading] = useState(false)
  const [error,   setError]   = useState('')

  const addFeature    = () => setFeats(f => [...f, ''])
  const removeFeature = (i: number) => setFeats(f => f.filter((_, idx) => idx !== i))
  const updateFeature = (i: number, v: string) => setFeats(f => f.map((x, idx) => idx === i ? v : x))

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `service-packages/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('service-assets').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('service-assets').getPublicUrl(path)
    setImgSrc(urlData?.publicUrl ?? `/${path}`)
    setUploading(false)
  }

  const handleSave = () => {
    if (!title.trim())            { setError('Package title is required.'); return }
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('Price must be a positive number.'); return }
    const cleanFeatures = feats.map(f => f.trim()).filter(Boolean)
    if (cleanFeatures.length === 0) { setError('At least one inclusion is required.'); return }
    onSave({ title: title.trim(), price: priceNum, imageSrc: imgSrc.trim() || '/traditional/placeholder.png', features: cleanFeatures })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="font-bold text-sm text-foreground">{isNew ? 'Add Package' : 'Edit Package'}</p>
            <p className="text-[10px] text-muted-foreground">Traditional Burial</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Package Title <span className="text-destructive">*</span>
            </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. OMB" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Price (₱) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₱</span>
              <input type="number" min="0" step="500" value={price} onChange={e => setPrice(e.target.value)} className={`${inputCls} pl-7`} />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Package Image</label>
            <div className="flex items-center gap-3">
              {imgSrc ? (
                <div className="relative h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted/30 shrink-0">
                  <Image src={imgSrc} alt="Package" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/20 shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer">
                  {uploading ? 'Uploading…' : 'Upload Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
                <input type="text" value={imgSrc} onChange={e => setImgSrc(e.target.value)} placeholder="or paste image path/URL" className={`${inputCls} h-8 text-xs`} />
              </div>
            </div>
          </div>

          {/* Inclusions */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Inclusions <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {feats.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  <input
                    type="text"
                    value={f}
                    onChange={e => updateFeature(i, e.target.value)}
                    placeholder={`Inclusion ${i + 1}`}
                    className={`${inputCls} flex-1 h-8 text-xs`}
                  />
                  <button onClick={() => removeFeature(i)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addFeature} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
              <Plus className="h-3 w-3" /> Add Inclusion
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
            {isNew ? 'Add Package' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─────────────────────────────────────────────────────────────
// Cremation Urn Editor Modal
// ─────────────────────────────────────────────────────────────
function CremationUrnModal({
  urn,
  onClose,
  onSave,
}: {
  urn: CremationUrn | null
  onClose: () => void
  onSave: (urn: CremationUrn) => void
}) {
  const supabase     = createClient()
  const isNew        = urn === null
  const [name,  setName]  = useState(urn?.name ?? '')
  const [desc,  setDesc]  = useState(urn?.description ?? '')
  const [price, setPrice] = useState(String(urn?.price ?? ''))
  const [img,   setImg]   = useState(urn?.image ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `service-urns/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('service-assets').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('service-assets').getPublicUrl(path)
    setImg(urlData?.publicUrl ?? `/${path}`)
    setUploading(false)
  }

  const handleSave = () => {
    if (!name.trim())   { setError('Urn name is required.');  return }
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('Price must be a positive number.'); return }
    onSave({ name: name.trim(), description: desc.trim(), price: priceNum, image: img.trim() || '/urns/placeholder.png' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="font-bold text-sm text-foreground">{isNew ? 'Add Urn' : 'Edit Urn'}</p>
            <p className="text-[10px] text-muted-foreground">Cremation Services</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Urn Name <span className="text-destructive">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wooden Urn" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price (₱) <span className="text-destructive">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₱</span>
              <input type="number" min="0" step="100" value={price} onChange={e => setPrice(e.target.value)} className={`${inputCls} pl-7`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Urn Image</label>
            <div className="flex items-center gap-3">
              {img ? (
                <div className="relative h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted/30 shrink-0">
                  <Image src={img} alt="Urn" fill className="object-contain p-1" unoptimized />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/20 shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer">
                  {uploading ? 'Uploading…' : 'Upload Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
                <input type="text" value={img} onChange={e => setImg(e.target.value)} placeholder="or paste image path/URL" className={`${inputCls} h-8 text-xs`} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
            {isNew ? 'Add Urn' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─────────────────────────────────────────────────────────────
// Traditional Burial Section
// ─────────────────────────────────────────────────────────────
function TraditionalSection() {
  const supabase  = createClient()
  const [packages, setPackages] = useState<TraditionalPackage[]>([])
  const [loaded,   setLoaded]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [editIdx,  setEditIdx]  = useState<number | null>(null)   // null = new
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('funeral_service_config')
      .select('packages_json')
      .eq('service_key', 'traditional')
      .single()
    if (data) setPackages((data.packages_json as TraditionalPackage[]) ?? [])
    setLoaded(true)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const persist = async (updated: TraditionalPackage[]) => {
    setSaving(true); setError(''); setSuccess(false)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('funeral_service_config')
      .update({ packages_json: updated as unknown as never[], updated_by: user?.id ?? null })
      .eq('service_key', 'traditional')
    if (err) { setError(err.message); setSaving(false); return }
    await logActivity({
      category: 'log', event_type: 'funeral_service_config_updated',
      entity_table: 'funeral_service_config', entity_id: undefined,
      actor_id: user?.id, actor_name: 'Admin',
      message: 'Admin updated Traditional Burial packages',
      metadata: { count: updated.length },
    })
    setPackages(updated)
    setSaving(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handleSavePackage = (pkg: TraditionalPackage) => {
    const updated = editIdx === null
      ? [...packages, pkg]
      : packages.map((p, i) => i === editIdx ? pkg : p)
    persist(updated)
  }

  const handleDelete = (idx: number) => {
    if (!confirm('Remove this package?')) return
    persist(packages.filter((_, i) => i !== idx))
  }

  if (!loaded) return <div className="py-4 flex justify-center"><div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-3">
      {error   && <AlertBanner variant="error"   message={error} />}
      {success && <AlertBanner variant="success" message="Saved successfully!" />}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {packages.map((pkg, idx) => (
          <div key={idx} className="bg-muted/20 border border-border rounded-xl overflow-hidden">
            {/* Image */}
            <div className="relative aspect-[4/3] w-full bg-muted/30">
              {pkg.imageSrc ? (
                <Image src={pkg.imageSrc} alt={pkg.title} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="px-3 py-2.5 space-y-1">
              <p className="text-xs font-bold text-foreground">{pkg.title}</p>
              <p className="text-xs font-semibold text-primary">{fmtPrice(pkg.price)}</p>
              <p className="text-[10px] text-muted-foreground">{pkg.features.length} inclusion{pkg.features.length !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => { setEditIdx(idx); setShowModal(true) }}
                  className="flex-1 h-7 rounded-lg border border-border text-[10px] font-semibold text-foreground hover:bg-muted/40 flex items-center justify-center gap-1 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add new package card */}
        <button
          onClick={() => { setEditIdx(null); setShowModal(true) }}
          disabled={saving}
          className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/10 transition-all disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">Add Package</span>
        </button>
      </div>

      {/* Package editor modal */}
      {showModal && (
        <TraditionalPackageModal
          pkg={editIdx !== null ? packages[editIdx] : null}
          index={editIdx}
          onClose={() => setShowModal(false)}
          onSave={handleSavePackage}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Cremation Services Section
// ─────────────────────────────────────────────────────────────
function CremationSection() {
  const supabase = createClient()
  const [urns,     setUrns]     = useState<CremationUrn[]>([])
  const [loaded,   setLoaded]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [editIdx,  setEditIdx]  = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('funeral_service_config')
      .select('packages_json')
      .eq('service_key', 'cremation')
      .single()
    if (data) setUrns((data.packages_json as CremationUrn[]) ?? [])
    setLoaded(true)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const persist = async (updated: CremationUrn[]) => {
    setSaving(true); setError(''); setSuccess(false)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('funeral_service_config')
      .update({ packages_json: updated as unknown as never[], updated_by: user?.id ?? null })
      .eq('service_key', 'cremation')
    if (err) { setError(err.message); setSaving(false); return }
    await logActivity({
      category: 'log', event_type: 'funeral_service_config_updated',
      entity_table: 'funeral_service_config', entity_id: undefined,
      actor_id: user?.id, actor_name: 'Admin',
      message: 'Admin updated Cremation Service urns',
      metadata: { count: updated.length },
    })
    setUrns(updated)
    setSaving(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handleSaveUrn = (urn: CremationUrn) => {
    const updated = editIdx === null
      ? [...urns, urn]
      : urns.map((u, i) => i === editIdx ? urn : u)
    persist(updated)
  }

  const handleDelete = (idx: number) => {
    if (!confirm('Remove this urn?')) return
    persist(urns.filter((_, i) => i !== idx))
  }

  if (!loaded) return <div className="py-4 flex justify-center"><div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-3">
      {error   && <AlertBanner variant="error"   message={error} />}
      {success && <AlertBanner variant="success" message="Saved successfully!" />}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {urns.map((urn, idx) => (
          <div key={idx} className="bg-muted/20 border border-border rounded-xl overflow-hidden">
            <div className="relative aspect-square w-full bg-muted/30">
              {urn.image ? (
                <Image src={urn.image} alt={urn.name} fill className="object-contain p-3" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="px-3 py-2.5 space-y-1">
              <p className="text-xs font-bold text-foreground">{urn.name}</p>
              <p className="text-xs font-semibold text-primary">{fmtPrice(urn.price)}</p>
              {urn.description && <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{urn.description}</p>}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => { setEditIdx(idx); setShowModal(true) }}
                  className="flex-1 h-7 rounded-lg border border-border text-[10px] font-semibold text-foreground hover:bg-muted/40 flex items-center justify-center gap-1 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => { setEditIdx(null); setShowModal(true) }}
          disabled={saving}
          className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/10 transition-all disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">Add Urn</span>
        </button>
      </div>

      {showModal && (
        <CremationUrnModal
          urn={editIdx !== null ? urns[editIdx] : null}
          onClose={() => setShowModal(false)}
          onSave={handleSaveUrn}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main exported panel — collapsible, admin-only
// ─────────────────────────────────────────────────────────────
type ServiceTab = 'traditional' | 'cremation' | 'addons'

// ─────────────────────────────────────────────────────────────
// Add-ons Section
// ─────────────────────────────────────────────────────────────
function AddonItemModal({
  addon,
  onClose,
  onSave,
}: {
  addon: FuneralAddon | null
  onClose: () => void
  onSave: (addon: Omit<FuneralAddon, 'id' | 'created_at' | 'updated_at'>) => void
}) {
  const supabase   = createClient()
  const isNew      = addon === null
  const [name,     setName]     = useState(addon?.name ?? '')
  const [desc,     setDesc]     = useState(addon?.description ?? '')
  const [price,    setPrice]    = useState(String(addon?.price ?? ''))
  const [maxQty,   setMaxQty]   = useState(String(addon?.max_qty ?? 99))
  const [imgPath,  setImgPath]  = useState(addon?.image_path ?? '')
  const [active,   setActive]   = useState(addon?.is_active ?? true)
  const [uploading, setUploading] = useState(false)
  const [error,    setError]    = useState('')

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `addon-images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('service-assets').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('service-assets').getPublicUrl(path)
    setImgPath(urlData?.publicUrl ?? `/${path}`)
    setUploading(false)
  }

  const handleSave = () => {
    if (!name.trim()) { setError('Item name is required.'); return }
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum < 0) { setError('Price must be a non-negative number.'); return }
    const maxNum = Number(maxQty)
    if (!maxQty || isNaN(maxNum) || maxNum < 1) { setError('Max qty must be at least 1. Use 99 for unlimited.'); return }
    onSave({
      name: name.trim(),
      description: desc.trim(),
      price: priceNum,
      image_path: imgPath.trim(),
      max_qty: maxNum,
      is_active: active,
      sort_order: addon?.sort_order ?? 99,
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="font-bold text-sm text-foreground">{isNew ? 'Add Add-on Item' : 'Edit Add-on Item'}</p>
            <p className="text-[10px] text-muted-foreground">Traditional Burial Add-ons</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <AlertBanner variant="error" message={error} />}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Item Name <span className="text-destructive">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Additional Flower Basket" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description for clients" rows={2}
              className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Price (₱) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₱</span>
                <input type="number" min="0" step="100" value={price} onChange={e => setPrice(e.target.value)} className={`${inputCls} pl-7`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Max Qty (99 = unlimited)
              </label>
              <input type="number" min="1" max="99" value={maxQty} onChange={e => setMaxQty(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item Image</label>
            <div className="flex items-center gap-3">
              {imgPath ? (
                <div className="relative h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted/30 shrink-0">
                  <Image src={imgPath} alt="Item" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/20 shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer">
                  {uploading ? 'Uploading…' : 'Upload Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
                <input type="text" value={imgPath} onChange={e => setImgPath(e.target.value)} placeholder="or paste image URL" className={`${inputCls} h-8 text-xs`} />
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-semibold text-foreground">Visible to Clients</p>
              <p className="text-[10px] text-muted-foreground">Toggle to hide this item from the client add-ons page</p>
            </div>
            <button
              onClick={() => setActive(v => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
            {isNew ? 'Add Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function AddonsSection() {
  const supabase    = createClient()
  const [items,     setItems]     = useState<FuneralAddon[]>([])
  const [loaded,    setLoaded]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [editItem,  setEditItem]  = useState<FuneralAddon | null | undefined>(undefined)  // undefined = closed
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('funeral_addons')
      .select('*')
      .order('sort_order', { ascending: true })
    setItems((data ?? []) as FuneralAddon[])
    setLoaded(true)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSaveItem = async (data: Omit<FuneralAddon, 'id' | 'created_at' | 'updated_at'>) => {
    setSaving(true); setError(''); setSuccess(false)
    const { data: { user } } = await supabase.auth.getUser()

    if (editItem === null) {
      // New item
      const { error: err } = await supabase.from('funeral_addons').insert(data)
      if (err) { setError(err.message); setSaving(false); return }
    } else if (editItem) {
      // Update existing
      const { error: err } = await supabase.from('funeral_addons').update(data).eq('id', editItem.id)
      if (err) { setError(err.message); setSaving(false); return }
    }

    await logActivity({
      category: 'log', event_type: 'funeral_addon_updated',
      entity_table: 'funeral_addons', entity_id: editItem?.id,
      actor_id: user?.id, actor_name: 'Admin',
      message: editItem === null ? `Admin added new add-on: ${data.name}` : `Admin updated add-on: ${data.name}`,
    })
    load()
    setSaving(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handleDelete = async (item: FuneralAddon) => {
    if (!confirm(`Remove "${item.name}" from add-ons?`)) return
    setSaving(true)
    const { error: err } = await supabase.from('funeral_addons').delete().eq('id', item.id)
    if (err) { setError(err.message); setSaving(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    await logActivity({
      category: 'log', event_type: 'funeral_addon_deleted',
      entity_table: 'funeral_addons', entity_id: item.id,
      actor_id: user?.id, actor_name: 'Admin',
      message: `Admin deleted add-on: ${item.name}`,
    })
    load()
    setSaving(false)
  }

  const handleToggleActive = async (item: FuneralAddon) => {
    await supabase.from('funeral_addons').update({ is_active: !item.is_active }).eq('id', item.id)
    load()
  }

  if (!loaded) return <div className="py-4 flex justify-center"><div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-3">
      {error   && <AlertBanner variant="error"   message={error} />}
      {success && <AlertBanner variant="success" message="Saved successfully!" />}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={`bg-muted/20 border border-border rounded-xl flex items-center gap-3 px-3 py-2.5 ${!item.is_active ? 'opacity-50' : ''}`}>
            {/* Image / icon */}
            <div className="h-10 w-10 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
              {item.image_path && !item.image_path.startsWith('/addons/') ? (
                <div className="relative h-full w-full">
                  <Image src={item.image_path} alt={item.name} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                {!item.is_active && (
                  <span className="text-[9px] bg-muted px-1.5 rounded-full text-muted-foreground font-semibold shrink-0">Hidden</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-semibold text-primary">₱{item.price.toLocaleString('en-PH')}</p>
                <span className="text-[9px] text-muted-foreground">·</span>
                <p className="text-[10px] text-muted-foreground">Max {item.max_qty === 99 ? 'unlimited' : item.max_qty}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleToggleActive(item)}
                title={item.is_active ? 'Hide from clients' : 'Show to clients'}
                className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors ${
                  item.is_active
                    ? 'border-primary/30 text-primary hover:bg-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setEditItem(item); setShowModal(true) }}
                className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Add new */}
        <button
          onClick={() => { setEditItem(null); setShowModal(true) }}
          disabled={saving}
          className="w-full border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 py-3 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/10 transition-all text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add New Add-on Item
        </button>
      </div>

      {showModal && editItem !== undefined && (
        <AddonItemModal
          addon={editItem}
          onClose={() => { setShowModal(false); setEditItem(undefined) }}
          onSave={handleSaveItem}
        />
      )}
    </div>
  )
}

export function FuneralServiceConfigPanel() {
  const [open,       setOpen]       = useState(false)
  const [activeTab,  setActiveTab]  = useState<ServiceTab>('traditional')

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Settings className="h-4 w-4 text-primary" />
          <div>
            <span className="text-sm font-bold text-foreground">Funeral Service Settings</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin only — manage pricing, inclusions, images, and add-ons</p>
          </div>
        </div>
        {open
          ? <ChevronUp   className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="border-t border-border/60">
          {/* Service tabs */}
          <div className="flex border-b border-border/60">
            {(['traditional', 'cremation', 'addons'] as ServiceTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-bold capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                {tab === 'traditional' ? 'Traditional Burial' : tab === 'cremation' ? 'Cremation Services' : 'Add-ons Catalog'}
              </button>
            ))}
          </div>

          <div className="px-5 py-5">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {activeTab === 'traditional'
                  ? 'Manage packages — edit price, inclusions, and image'
                  : activeTab === 'cremation'
                    ? 'Manage urns — edit price, description, and image'
                    : 'Manage add-on items available to Traditional service clients'}
              </p>
            </div>
            {activeTab === 'traditional' ? <TraditionalSection /> : activeTab === 'cremation' ? <CremationSection /> : <AddonsSection />}
          </div>
        </div>
      )}
    </div>
  )
}
