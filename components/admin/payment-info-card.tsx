'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Building2, Pencil, Save, UploadCloud, Smartphone } from 'lucide-react'
import type { PaymentInfo } from '@/lib/supabase/types'

export function PaymentInfoCard({ canEdit = true }: { canEdit?: boolean }) {
  const supabase   = createClient()
  const qrInputRef = useRef<HTMLInputElement>(null)

  const [info,        setInfo]        = useState<PaymentInfo | null>(null)
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [draft,       setDraft]       = useState<Partial<PaymentInfo>>({})
  const [qrPreview,   setQrPreview]   = useState<string | null>(null)

  useEffect(() => {
    supabase.from('payment_info').select('*').eq('id', 1).single()
      .then(({ data }) => { setInfo(data ?? null); setDraft(data ?? {}) })
  }, [supabase])

  const getQrUrl = (path: string | null | undefined) =>
    path ? supabase.storage.from('payment-info').getPublicUrl(path).data.publicUrl : null

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

  const displayQr = qrPreview ?? getQrUrl(editing ? draft.gcash_qr_path : info?.gcash_qr_path)
  const inp = 'w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/10 outline-none transition-all'
  const lbl = 'block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1'

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <p className="text-sm font-semibold text-foreground">Payment Receiving Details</p>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-[10px] text-primary font-semibold">{saveMsg}</span>}
          {canEdit && (editing ? (
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
              <Save className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            <button onClick={() => { setDraft(info ?? {}); setQrPreview(null); setEditing(true) }}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">GCash</span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className={lbl}>Account Name</label>
                <input value={draft.gcash_name ?? ''} onChange={field('gcash_name')} placeholder="e.g. Juan Dela Cruz" className={inp} />
              </div>
              <div>
                <label className={lbl}>GCash Number</label>
                <input value={draft.gcash_number ?? ''} onChange={field('gcash_number')} placeholder="e.g. 0917 123 4567" className={inp} />
              </div>
              <div>
                <label className={lbl}>QR Code</label>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                <button type="button" onClick={() => qrInputRef.current?.click()} disabled={qrUploading}
                  className="w-full h-9 rounded-lg bg-muted border border-dashed border-border text-[11px] font-medium text-muted-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                  <UploadCloud className="h-3.5 w-3.5" />
                  {qrUploading ? 'Uploading…' : displayQr ? 'Replace QR' : 'Upload QR'}
                </button>
                {displayQr && (
                  <img src={displayQr} alt="GCash QR" className="w-24 h-24 rounded-xl object-contain border border-border bg-white mx-auto mt-3" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {displayQr ? (
                <img src={displayQr} alt="GCash QR" className="w-20 h-20 rounded-xl object-contain border border-border bg-white shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center shrink-0">
                  <QrCode className="h-7 w-7 text-muted-foreground/30" />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {info?.gcash_name ?? <span className="text-muted-foreground font-normal italic">Not set</span>}
                </p>
                <p className="font-mono text-sm text-muted-foreground">
                  {info?.gcash_number ?? <span className="italic text-xs">No number</span>}
                </p>
                <p className="text-[10px] text-muted-foreground/60">Scan QR or send to number</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">Bank Transfer</span>
          </div>

          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([1, 2, 3, 4] as const).map(n => (
                <div key={n} className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bank {n}</p>
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
                  <div key={n} className="p-3 rounded-xl bg-muted/30 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{name}</p>
                    <p className="font-mono font-semibold text-sm text-foreground mt-0.5">{acct}</p>
                    {holder && <p className="text-[10px] text-muted-foreground mt-0.5">{holder}</p>}
                  </div>
                )
              })}
              {([1, 2, 3, 4] as const).every(n => !(info as Record<string, string> | null)?.[`bank${n}_name`]) && (
                <p className="text-[11px] text-muted-foreground italic col-span-2">No bank accounts configured yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
