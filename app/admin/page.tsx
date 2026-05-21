'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/app/context/store'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Mail, Users, Landmark, Banknote, ShieldAlert, CheckSquare, Clock, ArrowRight } from 'lucide-react'

export default function AdminPage() {
  const { user, usersList, bookings, payments, inquiries, recordCashPayment, approvePayment } = useStore()
  const router = useRouter()

  // Cash Recording form state
  const [cashUserId, setCashUserId] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashNotes, setCashNotes] = useState('')
  const [cashError, setCashError] = useState('')
  const [cashSuccess, setCashSuccess] = useState('')

  // Redirection/Gatekeeping: If not admin, show unauthorized notice
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user])

  if (!user || user.role !== 'admin') {
    return (
      <>
        <HeroHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-32 px-6 text-center space-y-6 bg-background dark:bg-[var(--dark-page)]">
          <div className="h-16 w-16 bg-red-500/5 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-500/10 shadow-2xs">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)]">Access Restricted</h2>
          <p className="text-sm text-[var(--surface-muted)] dark:text-[var(--dark-muted)] max-w-sm mx-auto leading-relaxed">
            Only authorized GFS Staff and Administrators are permitted here. Please log in using credentials <code className="font-mono text-[var(--brand-gold)] font-bold">admin@gfs.com</code>.
          </p>
          <Button asChild className="bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 text-[rgb(240,248,255)] rounded-xl px-6">
            <Link href="/auth/login">Re-authenticate Staff &rarr;</Link>
          </Button>
        </main>
      </>
    )
  }

  // Filter lists
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
      <main className="flex-1 bg-background dark:bg-[var(--dark-page)] transition-colors duration-300">
        
        {/* Banner */}
        <section className="relative py-16 bg-gradient-to-b from-[var(--brand-green)]/5 to-background dark:from-[var(--brand-green-light)]/5 dark:to-[var(--dark-page)] border-b border-border/40 overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/25 text-xs text-[var(--brand-green)] dark:text-[var(--dark-text)] font-bold">
                <ShieldCheck className="h-4.5 w-4.5 text-[var(--brand-gold)]" /> Executive Console
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[var(--brand-green)] dark:text-[var(--dark-text)] tracking-tight">
                Staff Administration Dashboard
              </h1>
              <p className="text-xs md:text-sm text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                Approve client payments and respond to incoming family inquiries.
              </p>
            </div>
          </div>
        </section>

        {/* WORKSPACE PANELS */}
        <section className="py-12 max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* STATS COUNT SUMMARY (Col 12) */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-[var(--brand-gold)]/20 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                <Clock className="h-6 w-6 text-[var(--brand-gold)] animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] uppercase font-bold tracking-wider block">Pending Approvals</span>
                <p className="text-2xl font-serif font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] mt-0.5">{pendingPayments.length} Invoices</p>
              </div>
            </div>
            
            <div className="p-6 bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-[var(--brand-gold)]/20 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                <Landmark className="h-6 w-6 text-[var(--brand-gold)]" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] uppercase font-bold tracking-wider block">Active Reservations</span>
                <p className="text-2xl font-serif font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] mt-0.5">
                  {bookings.filter(b => b.status === 'active').length} Packages
                </p>
              </div>
            </div>

            <div className="p-6 bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-[var(--brand-gold)]/20 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/10 text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center justify-center shrink-0 border border-[var(--brand-green)]/10">
                <Mail className="h-6 w-6 text-[var(--brand-gold)]" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] uppercase font-bold tracking-wider block">Inquiry Inbox</span>
                <p className="text-2xl font-serif font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] mt-0.5">{inquiries.length} Messages</p>
              </div>
            </div>
          </div>

          {/* VERIFY INCOMING TRANSACTIONS (Col 7) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* PENDING APPROVAL LIST */}
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] pb-4 flex justify-between items-center">
                <h3 className="font-serif text-lg font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-[var(--brand-gold)]" /> Verify Uploaded Receipts
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 font-bold animate-pulse">
                  Awaiting Review
                </span>
              </div>

              {pendingPayments.length === 0 ? (
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)] italic py-6 text-center">
                  All submitted transaction receipts have been processed.
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-cream)]/20 dark:bg-[var(--dark-green-subtle)]/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-[var(--brand-gold)]/55 relative overflow-hidden"
                    >
                      {/* Sub-ribbon indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--brand-gold)]" />
                      
                      <div className="space-y-2 pl-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold font-mono text-[var(--brand-green)] dark:text-[var(--dark-text)] bg-[var(--brand-green)]/10 dark:bg-[var(--brand-green-light)]/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {p.method}
                          </span>
                          <span className="text-xs font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] font-mono">Ref: {p.referenceNumber}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)]">Client: {p.userName}</h4>
                        
                        <div className="text-[11px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] space-y-1">
                          <p>Booking ID: <code className="font-mono bg-card dark:bg-zinc-950 px-1 py-0.5 rounded border border-[var(--brand-cream-border)] dark:border-zinc-800">{p.bookingId ? p.bookingId.substring(0, 8).toUpperCase() : 'N/A'}...</code></p>
                          <p>Proof Attached: <a href="#" onClick={(e) => e.preventDefault()} className="text-[var(--brand-green)] dark:text-[var(--brand-green-light)] hover:underline font-mono font-medium">{p.receiptFileName}</a></p>
                          <p className="font-mono text-[9px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] pt-1">{new Date(p.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3.5 shrink-0 self-stretch md:self-auto justify-between md:justify-start pl-1.5 border-l border-dashed border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 md:pl-5">
                        <div className="text-right">
                          <span className="text-[9px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] uppercase font-bold tracking-wider block">Settle Amount</span>
                          <p className="text-xl font-serif font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] mt-0.5">&#8369;{p.amount.toLocaleString()}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => approvePayment(p.id)}
                          className="bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/95 text-[rgb(240,248,255)] font-bold rounded-lg text-[10px] px-3 h-8 shadow-xs tracking-wide uppercase transition-colors"
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
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] pb-4">
                <h3 className="font-serif text-lg font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center gap-2">
                  <Users className="h-5 w-5 text-[var(--brand-gold)]" /> active Memorial reservations logs
                </h3>
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">Complete database audit of registered memorial packages and funeral arrangements.</p>
              </div>

              {bookings.length === 0 ? (
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)] italic text-center py-4">No reservations recorded in local registry.</p>
              ) : (
                <div className="overflow-x-auto border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] rounded-xl bg-card/50 dark:bg-[var(--dark-page)]/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--brand-green)]/5 dark:bg-[var(--brand-green-light)]/5 border-b border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] font-bold uppercase tracking-wider text-[var(--brand-green)] dark:text-[var(--dark-muted)] font-mono">
                        <th className="p-4">Client</th>
                        <th className="p-4">Reference</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-cream-border)] dark:divide-[var(--dark-border)]">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[var(--brand-cream)]/20 dark:hover:bg-[var(--dark-green-subtle)]/5 transition-colors duration-300">
                          <td className="p-4 font-semibold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)]">{b.userName}</td>
                          <td className="p-4 font-mono text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">{b.id.substring(0, 8).toUpperCase()}...</td>
                          <td className="p-4">
                            <span className="font-bold text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] block">
                              Memorial Service
                            </span>
                            <span className="text-[10px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] font-light">{b.packageName}</span>
                          </td>
                          <td className="p-4 font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] font-serif">&#8369;{b.price.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                              b.status === 'active' 
                                ? 'bg-[var(--brand-green)]/10 border-[var(--brand-green)]/25 text-[var(--brand-green)] dark:text-[var(--brand-green-light)]' 
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

          {/* CASH PAYMENT INTAKE & INQUIRIES BOX (Col 5) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* INTAKE INTAKE INTAKE */}
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-[var(--brand-gold)]" /> Record Cash Payment
                </h3>
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">Record transactions settled by physical currency or bank checks.</p>
                <div className="w-10 h-[1.5px] bg-[var(--brand-gold)] mt-3" />
              </div>

              {cashError && (
                <div className="p-3.5 bg-red-500/5 text-red-600 border border-red-500/10 rounded-xl flex items-center gap-2.5 text-xs animate-shake">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>{cashError}</span>
                </div>
              )}

              {cashSuccess && (
                <div className="p-3.5 bg-[var(--brand-green)]/5 text-[var(--brand-green)] dark:text-[var(--brand-green-light)] border border-[var(--brand-green)]/10 rounded-xl flex items-center gap-2.5 text-xs">
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-[var(--brand-gold)]" />
                  <span>{cashSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRecordCash} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                    Select Target Client
                  </label>
                  <div className="relative">
                    <select
                      value={cashUserId}
                      onChange={(e) => setCashUserId(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300 appearance-none font-medium"
                    >
                      <option value="">-- Choose Client --</option>
                      {usersList.filter(u => u.role !== 'admin').map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--surface-muted)]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                    Settle Denomination (₱)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter cash payment amount"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                    Official Receipt Number / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GFS-Receipt No. 89201"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background dark:bg-[var(--dark-page)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] text-sm text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]/20 outline-hidden transition-all duration-300"
                  />
                </div>

                <Button type="submit" className="w-full h-11 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/95 text-[rgb(240,248,255)] font-bold rounded-xl transition-all duration-300 shadow-sm mt-4">
                  Log Cash Settle
                </Button>
              </form>
            </div>

            {/* INQUIRIES BOX INTAKE */}
            <div className="bg-card dark:bg-[var(--dark-card)] border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
              <div className="border-b border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] pb-3">
                <h3 className="font-serif text-lg font-bold text-[var(--brand-green)] dark:text-[var(--dark-text)] flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[var(--brand-gold)]" /> Inquiry Communications
                </h3>
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">Inbox logs tracking family inquiries and coordinate consultation requests.</p>
              </div>

              {inquiries.length === 0 ? (
                <p className="text-xs text-[var(--surface-muted)] dark:text-[var(--dark-muted)] italic text-center py-4">No feedback messages in inbox.</p>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 select-none">
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-4 rounded-xl border border-[var(--brand-cream-border)] dark:border-[var(--dark-border)] bg-background dark:bg-[var(--dark-page)] space-y-3 text-xs relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-[var(--surface-text-dark)] dark:text-[var(--dark-text)] text-xs font-semibold">{inq.name}</strong>
                          <p className="text-[10px] text-[var(--surface-muted)] dark:text-[var(--dark-muted)] font-mono mt-0.5">{inq.email}</p>
                        </div>
                        <span className="text-[9px] font-mono text-[var(--surface-muted)] dark:text-[var(--dark-muted)]">
                          {new Date(inq.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="border-t border-[var(--brand-cream-border)] dark:border-[var(--dark-border)]/50 pt-2.5 text-[var(--surface-text-dark)] dark:text-[var(--dark-text)]">
                        <span className="font-serif font-bold text-[var(--brand-green)] dark:text-[var(--brand-green-light)] block text-xs">Sub: {inq.subject}</span>
                        <p className="text-[var(--surface-muted)] dark:text-[var(--dark-muted)] text-[11px] leading-relaxed mt-1.5 font-light">{inq.message}</p>
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
