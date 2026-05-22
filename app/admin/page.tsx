'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/app/context/store'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { StatCard } from '@/components/ui/stat-card'
import { SelectField } from '@/components/ui/select-field'
import {
  ShieldCheck, Mail, Users, Landmark, Banknote,
  ShieldAlert, CheckSquare, Clock, ArrowRight
} from 'lucide-react'

export default function AdminPage() {
  const { user, usersList, bookings, payments, inquiries, recordCashPayment, approvePayment } = useStore()
  const router = useRouter()

  const [cashUserId, setCashUserId] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashNotes, setCashNotes] = useState('')
  const [cashError, setCashError] = useState('')
  const [cashSuccess, setCashSuccess] = useState('')

  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user])

  if (!user || user.role !== 'admin') {
    return (
      <>
        <HeroHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-32 px-6 text-center space-y-6 bg-background">
          <div className="h-16 w-16 bg-destructive/5 text-destructive rounded-full flex items-center justify-center mx-auto border border-destructive/10 shadow-2xs">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-primary">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Only authorized GFS Staff and Administrators are permitted here. Please log in using credentials{' '}
            <code className="font-mono text-primary font-bold">admin@gfs.com</code>.
          </p>
          <Button asChild className="rounded-xl px-6">
            <Link href="/auth/login">Re-authenticate Staff &rarr;</Link>
          </Button>
        </main>
      </>
    )
  }

  const pendingPayments = payments.filter(p => p.status === 'pending')

  const handleRecordCash = (e: React.FormEvent) => {
    e.preventDefault()
    setCashError('')
    setCashSuccess('')

    if (!cashUserId) {
      setCashError('Please select a target client.')
      return
    }

    if (!cashAmount || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) {
      setCashError('Please enter a valid cash amount.')
      return
    }

    const res = recordCashPayment(cashUserId, Number(cashAmount), cashNotes)
    if (res.success) {
      setCashSuccess(res.message)
      setCashAmount('')
      setCashNotes('')
    } else {
      setCashError(res.message)
    }
  }

  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background transition-colors duration-300">

        {/* Banner */}
        <section className="relative py-16 bg-gradient-to-b from-primary/5 to-background border-b border-border/40 overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary font-bold">
                <ShieldCheck className="h-4.5 w-4.5" /> Executive Console
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary tracking-tight">
                Staff Administration Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Approve client payments and respond to incoming family inquiries.
              </p>
            </div>
          </div>
        </section>

        {/* WORKSPACE PANELS */}
        <section className="py-12 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* STATS (Col 12) */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              icon={<Clock className="h-6 w-6 text-primary animate-pulse" />}
              label="Pending Approvals"
              value={`${pendingPayments.length} Invoices`}
            />
            <StatCard
              icon={<Landmark className="h-6 w-6 text-primary" />}
              label="Active Reservations"
              value={`${bookings.filter(b => b.status === 'active').length} Packages`}
            />
            <StatCard
              icon={<Mail className="h-6 w-6 text-primary" />}
              label="Inquiry Inbox"
              value={`${inquiries.length} Messages`}
            />
          </div>

          {/* VERIFY TRANSACTIONS (Col 7) */}
          <div className="lg:col-span-7 space-y-8">

            {/* PENDING APPROVAL LIST */}
            <div className="bg-card border border-border p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-border/50 pb-4 flex justify-between items-center">
                <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" /> Verify Uploaded Receipts
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 font-bold animate-pulse">
                  Awaiting Review
                </span>
              </div>

              {pendingPayments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  All submitted transaction receipts have been processed.
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-xl border border-border bg-muted/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-primary/30 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />

                      <div className="space-y-2 pl-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {p.method}
                          </span>
                          <span className="text-xs font-bold text-foreground font-mono">Ref: {p.referenceNumber}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">Client: {p.userName}</h4>

                        <div className="text-[11px] text-muted-foreground space-y-1">
                          <p>Booking ID: <code className="font-mono bg-card px-1 py-0.5 rounded border border-border">{p.bookingId ? p.bookingId.substring(0, 8).toUpperCase() : 'N/A'}...</code></p>
                          <p>Proof Attached: <a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline font-mono font-medium">{p.receiptFileName}</a></p>
                          <p className="font-mono text-[9px] text-muted-foreground pt-1">{new Date(p.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3.5 shrink-0 self-stretch md:self-auto justify-between md:justify-start pl-1.5 border-l border-dashed border-border md:pl-5">
                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Settle Amount</span>
                          <p className="text-xl font-serif font-bold text-primary mt-0.5">&#8369;{p.amount.toLocaleString()}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => approvePayment(p.id)}
                          className="font-bold rounded-lg text-[10px] px-3 h-8 shadow-xs tracking-wide uppercase transition-colors"
                        >
                          Approve Reference
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AUDIT LOG BOOKINGS */}
            <div className="bg-card border border-border p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-border/50 pb-4">
                <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Active Memorial Reservation Logs
                </h3>
                <p className="text-xs text-muted-foreground">Complete database audit of registered memorial packages and funeral arrangements.</p>
              </div>

              {bookings.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No reservations recorded in local registry.</p>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl bg-card/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-primary/5 border-b border-border font-bold uppercase tracking-wider text-primary font-mono">
                        <th className="p-4">Client</th>
                        <th className="p-4">Reference</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/20 transition-colors duration-300">
                          <td className="p-4 font-semibold text-foreground">{b.userName}</td>
                          <td className="p-4 font-mono text-muted-foreground">{b.id.substring(0, 8).toUpperCase()}...</td>
                          <td className="p-4">
                            <span className="font-bold text-foreground block">Memorial Service</span>
                            <span className="text-[10px] text-muted-foreground font-light">{b.packageName}</span>
                          </td>
                          <td className="p-4 font-bold text-primary font-serif">&#8369;{b.price.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                              b.status === 'active'
                                ? 'bg-primary/10 border-primary/25 text-primary'
                                : b.status === 'pending'
                                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 animate-pulse'
                                  : 'bg-muted border-border/30 text-muted-foreground'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* CASH PAYMENT INTAKE & INQUIRIES (Col 5) */}
          <div className="lg:col-span-5 space-y-8">

            {/* RECORD CASH PAYMENT */}
            <div className="bg-card border border-border p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" /> Record Cash Payment
                </h3>
                <p className="text-xs text-muted-foreground">Record transactions settled by physical currency or bank checks.</p>
                <div className="w-10 h-[1.5px] bg-primary mt-3" />
              </div>

              {cashError && <AlertBanner variant="error" message={cashError} />}
              {cashSuccess && <AlertBanner variant="success" message={cashSuccess} />}

              <form onSubmit={handleRecordCash} className="space-y-4">
                <SelectField label="Select Target Client">
                  <option value="">-- Choose Client --</option>
                  {usersList.filter(u => u.role !== 'admin').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </SelectField>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Settle Denomination (₱)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter cash payment amount"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Official Receipt Number / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GFS-Receipt No. 89201"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-300"
                  />
                </div>

                <Button type="submit" className="w-full h-11 font-bold rounded-xl transition-all duration-300 shadow-sm mt-4">
                  Log Cash Settle
                </Button>
              </form>
            </div>

            {/* INQUIRIES BOX */}
            <div className="bg-card border border-border p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-border/50 pb-3">
                <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" /> Inquiry Communications
                </h3>
                <p className="text-xs text-muted-foreground">Inbox logs tracking family inquiries and coordinate consultation requests.</p>
              </div>

              {inquiries.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No feedback messages in inbox.</p>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 select-none">
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-4 rounded-xl border border-border bg-background space-y-3 text-xs relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-foreground text-xs font-semibold">{inq.name}</strong>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{inq.email}</p>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {new Date(inq.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="border-t border-border/50 pt-2.5 text-foreground">
                        <span className="font-serif font-bold text-primary block text-xs">Sub: {inq.subject}</span>
                        <p className="text-muted-foreground text-[11px] leading-relaxed mt-1.5 font-light">{inq.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </section>

      </main>
    </>
  )
}
