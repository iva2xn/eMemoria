'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, QrCode, Building2, Pencil, Save, UploadCloud } from 'lucide-react'
import type { PaymentInfo } from '@/lib/supabase/types'

export function PaymentInfoCard({ canEdit = true }: { canEdit?: boolean }) {
  const supabase = createClient()
  const qrInputRef = useRef<HTMLInputElement>(null)

  const [info, setInfo]       = useState<PaymentInfo | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [draft, setDraft]     = useState<Partial<PaymentInfo>>({})
  const [qrPreview, setQrPreview] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => { setInfo(data ?? null); setDraft(data ?? {}) })
  }, [supabase])

  const getQrUrl = (path: string | null | undefined) => {
    if (!path) return null
    return supabase.storage.from('payment-info').getPublicUrl(path).data.publicUrl
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `gcash-qr.${ext}`
    const { error } = await supabase.storage.from('payment-info').upload(path, file, { upsert: true })
    if (!error) {
      setDraft(d => ({ ...d, gcash_qr_path: path }))
      setQrPreview(URL.createObjectURL(file))
    }
    setQrUploading(false)
  }

  const field = (key: keyof PaymentInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => ({ ...d, [key]: e.target.value }))

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('payment_info').update(draft).eq('id', 1)
    if (!error) {
      setInfo(prev => ({ ...prev!, ...draft }))
      setEditing(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2500)
    }
    setSaving(false)
  }

  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'
  const inp = 'w-full h-9 px-3 rounded-lg bg-white border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/10 outline-none transition-all'

  const displayQr = qrPreview ?? getQrUrl(editing ? draft.gcash_qr_path : info?.gcash_qr_path)

  return (
    <div className="rounded-2xl bg-primary overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Payment Receiving Details</span>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-[10px] font-semibold text-white/70">{saveMsg}</span>}
          {canEdit && (editing ? (
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white text-primary text-[10px] font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
            >
              <Save className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <button
              onClick={() => { setDraft(info ?? {}); setQrPreview(null); setEditing(true) }}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-white text-white text-[10px] font-bold hover:bg-white/10 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/10 px-5 pb-4 pt-1">

        {/* GCash */}
        <div className="px-1 py-1 space-y-3">
          <div className="flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5 text-white/70" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">GCash</span>
          </div>

          {editing ? (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">Account Name</label>
                <input value={draft.gcash_name ?? ''} onChange={field('gcash_name')} placeholder="e.g. Juan Dela Cruz" className="w-full h-9 px-3 rounded-lg bg-white/15 border border-white/30 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:ring-1 focus:ring-white/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">GCash Number</label>
                <input value={draft.gcash_number ?? ''} onChange={field('gcash_number')} placeholder="e.g. 0917 123 4567" className="w-full h-9 px-3 rounded-lg bg-white/15 border border-white/30 text-sm text-white placeholder:text-white/40 focus:border-white/60 focus:ring-1 focus:ring-white/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">QR Code Image</label>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  disabled={qrUploading}
                  className="w-full h-9 rounded-lg bg-white/10 border border-dashed border-white/30 text-[10px] font-semibold text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  {qrUploading ? 'Uploading…' : displayQr ? 'Replace QR Image' : 'Upload QR Image'}
                </button>
              </div>
              {displayQr && (
                <img src={displayQr} alt="GCash QR" className="w-28 h-28 rounded-xl object-contain border border-white/20 bg-white mx-auto" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {displayQr ? (
                <img src={displayQr} alt="GCash QR" className="w-24 h-24 rounded-xl object-contain border border-white/20 bg-white shrink-0" />
              ) : (
                <div className="w-24 h-24 rounded-xl border border-dashed border-white/30 bg-white/10 flex items-center justify-center shrink-0">
                  <QrCode className="h-8 w-8 text-white/30" />
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {info?.gcash_name || <span className="text-white/40 italic font-normal">No name set</span>}
                </p>
                <p className="font-mono text-sm text-white/80">
                  {info?.gcash_number || <span className="text-white/40 italic font-normal">No number set</span>}
                </p>
                <p className="text-[10px] text-white/50">Scan QR or send to number above</p>
              </div>
            </div>
          )}
        </div>

        {/* Bank Transfer */}
        <div className="bg-white rounded-xl p-4 space-y-3 lg:ml-5">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bank Transfer</span>
          </div>

          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([1, 2, 3, 4] as const).map(n => (
                <div key={n} className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bank {n}</p>
                  <div>
                    <label className={lbl}>Bank Name</label>
                    <input value={(draft as Record<string, string>)[`bank${n}_name`] ?? ''} onChange={field(`bank${n}_name` as keyof PaymentInfo)} placeholder="e.g. BDO" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Account Holder</label>
                    <input value={(draft as Record<string, string>)[`bank${n}_account_name`] ?? ''} onChange={field(`bank${n}_account_name` as keyof PaymentInfo)} placeholder="e.g. Juan Dela Cruz" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Account Number</label>
                    <input value={(draft as Record<string, string>)[`bank${n}_account_number`] ?? ''} onChange={field(`bank${n}_account_number` as keyof PaymentInfo)} placeholder="e.g. 0012-3456-789" className={inp} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([1, 2, 3, 4] as const).map(n => {
                const name   = (info as Record<string, string> | null)?.[`bank${n}_name`]           ?? ''
                const holder = (info as Record<string, string> | null)?.[`bank${n}_account_name`]   ?? ''
                const acct   = (info as Record<string, string> | null)?.[`bank${n}_account_number`] ?? ''
                if (!name && !acct) return null
                return (
                  <div key={n} className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{name}</p>
                    <p className="font-mono font-bold text-sm text-foreground">{acct}</p>
                    {holder && <p className="text-[10px] text-muted-foreground">{holder}</p>}
                  </div>
                )
              })}
              {([1, 2, 3, 4] as const).every(n => !(info as Record<string, string> | null)?.[`bank${n}_name`]) && (
                <p className="text-[10px] text-muted-foreground italic col-span-2">No bank accounts configured yet.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
