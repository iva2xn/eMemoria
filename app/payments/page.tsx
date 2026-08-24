'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { Button } from '@/components/ui/button'
import {
  CreditCard, Clock, CheckCircle2, XCircle,
  Ban, ArrowRight, Receipt,
} from 'lucide-react'
import type { Payment } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatAmount(amount: number) {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    gcash:    'GCash',
    bdo_bank: 'BDO Bank',
    bpi_bank: 'BPI Bank',
    cash:     'Cash',
  }
  return map[method] ?? method
}

function productLabel(p: Payment) {
  if (p.product_ref) return `${p.product_type} · ${p.product_ref}`
  return p.product_type
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = {
    pending:  { icon: Clock,         label: 'Pending Review', cls: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400' },
    approved: { icon: CheckCircle2,  label: 'Approved',       cls: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-500' },
    rejected: { icon: XCircle,       label: 'Not Approved',   cls: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400' },
    voided:   { icon: Ban,           label: 'Voided',         cls: 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400' },
  }[status] ?? { icon: CreditCard, label: status, cls: 'bg-muted border-border text-muted-foreground' }

  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

// ── Payment card ──────────────────────────────────────────────
function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground capitalize truncate">
            {productLabel(payment)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Submitted {formatDate(payment.created_at)}
          </p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {/* Details grid */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Amount</p>
          <p className="font-serif font-bold text-primary text-base">{formatAmount(payment.amount)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Method</p>
          <p className="font-semibold text-foreground">{methodLabel(payment.method)}</p>
        </div>
        {payment.reference_number && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Reference #</p>
            <p className="font-mono text-xs text-foreground">{payment.reference_number}</p>
          </div>
        )}
        {payment.approved_at && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Approved On</p>
            <p className="text-foreground text-xs">{formatDate(payment.approved_at)}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Ref ID</p>
          <p className="font-mono text-[10px] text-muted-foreground">{payment.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Notes / void reason */}
      {payment.notes && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{payment.notes}</p>
        </div>
      )}
      {payment.void_comment && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mb-1">Void Reason</p>
          <p className="text-xs text-foreground leading-relaxed">{payment.void_comment}</p>
        </div>
      )}

      {/* Approved — prompt to proceed if linked to a document submission */}
      {payment.status === 'approved' && payment.document_submission_id && (
        <div className="px-5 pb-5">
          <Link
            href={`/document-submission/status?id=${payment.document_submission_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            View linked submission <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

export default function PaymentsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<FilterTab>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login?next=/payments'); return }

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setPayments((data as Payment[]) ?? [])
    setLoading(false)
  }, [supabase, router])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const displayed = payments.filter(p => {
    if (filter === 'pending')  return p.status === 'pending'
    if (filter === 'approved') return p.status === 'approved'
    if (filter === 'rejected') return p.status === 'rejected' || p.status === 'voided'
    return true
  })

  const counts = {
    pending:  payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected' || p.status === 'voided').length,
  }

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',      label: `All (${payments.length})` },
    { id: 'pending',  label: `Pending${counts.pending  > 0 ? ` (${counts.pending})`  : ''}` },
    { id: 'approved', label: `Approved${counts.approved > 0 ? ` (${counts.approved})` : ''}` },
    { id: 'rejected', label: `Not Approved${counts.rejected > 0 ? ` (${counts.rejected})` : ''}` },
  ]

  return (
    <ClientLayout>
      <main className="flex-1 bg-background">

        {/* Hero strip */}
        <div className="border-b border-border/40 bg-muted/20 px-6 py-10">
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Account</p>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <Receipt className="h-7 w-7 text-primary" />
              Payments
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Track all your payment submissions and their current status.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === t.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mx-auto">
                <Receipt className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                {filter === 'all' ? 'No payments yet' : `No ${filter} payments`}
              </p>
              {filter === 'all' && (
                <Button asChild variant="outline" size="sm" className="rounded-xl mt-2">
                  <Link href="/services">Browse Services →</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayed.map(p => <PaymentCard key={p.id} payment={p} />)}
            </div>
          )}

        </div>
      </main>
    </ClientLayout>
  )
}
