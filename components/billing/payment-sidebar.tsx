'use client'

import { createClient } from '@/lib/supabase/client'

interface PaymentInfo {
  gcash_name: string
  gcash_number: string
  gcash_qr_path: string | null
  [key: string]: string | null
}

export function PaymentSidebar({ paymentInfo }: { paymentInfo: PaymentInfo | null }) {
  const supabase = createClient()

  return (
    <div className="space-y-4 lg:sticky lg:top-24">

      {/* GCash */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">GCash</p>
        </div>
        <div className="p-5 flex flex-col items-center gap-3">
          {paymentInfo?.gcash_qr_path ? (
            <img
              src={supabase.storage.from('payment-info').getPublicUrl(paymentInfo.gcash_qr_path).data.publicUrl}
              alt="GCash QR Code"
              className="w-36 h-36 rounded-xl object-contain border border-border bg-white"
            />
          ) : (
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
              <span className="text-[10px] font-mono text-muted-foreground text-center leading-relaxed px-2">QR code<br/>not set yet</span>
            </div>
          )}
          {(paymentInfo?.gcash_name || paymentInfo?.gcash_number) && (
            <div className="text-center space-y-0.5">
              {paymentInfo.gcash_name && <p className="text-xs font-bold text-foreground">{paymentInfo.gcash_name}</p>}
              {paymentInfo.gcash_number && <p className="font-mono text-sm text-primary font-bold">{paymentInfo.gcash_number}</p>}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Scan with GCash app then upload screenshot as proof.
          </p>
        </div>
      </div>

      {/* Bank accounts */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Bank Transfer</p>
        </div>
        <div className="px-5 py-4 space-y-4 text-xs">
          {paymentInfo ? (
            <>
              {([1, 2, 3, 4] as const).map((n, i) => {
                const bankName = paymentInfo[`bank${n}_name`]
                const holder   = paymentInfo[`bank${n}_account_name`]
                const acct     = paymentInfo[`bank${n}_account_number`]
                if (!bankName && !acct) return null
                return (
                  <div key={n} className={i > 0 ? 'border-t border-border pt-3' : ''}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{bankName}</p>
                    <p className="font-mono font-bold text-foreground mt-1">{acct}</p>
                    {holder && <p className="text-[10px] text-muted-foreground mt-0.5">{holder}</p>}
                  </div>
                )
              })}
              {([1, 2, 3, 4] as const).every(n => !paymentInfo[`bank${n}_name`]) && (
                <p className="text-[10px] text-muted-foreground italic">No bank accounts configured yet.</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">Loading bank details…</p>
          )}
        </div>
      </div>

      {/* Help */}
      <div className="bg-muted/30 border border-border/60 rounded-2xl px-5 py-4 text-xs text-muted-foreground leading-relaxed space-y-1">
        <p className="font-bold text-foreground text-xs">Need help?</p>
        <p>Call us at <a href="tel:+639189019978" className="text-primary font-semibold hover:underline">+63 918 901 9978</a></p>
        <p>or email <a href="mailto:mgayetafuneralhome@gmail.com" className="text-primary font-semibold hover:underline">mgayetafuneralhome@gmail.com</a></p>
      </div>

    </div>
  )
}
