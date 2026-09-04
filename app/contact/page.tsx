'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClientLayout } from '@/components/client-layout'
import { ContactDetailsBar } from '@/components/contact/contact-details-bar'
import { MapBlock } from '@/components/contact/map-block'
import { InquiryFormCard } from '@/components/contact/inquiry-form-card'
import { useDraftForm } from '@/lib/hooks/use-draft-form'

export default function ContactPage() {
  const supabase = createClient()

  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [subject, setSubject] = useState('Funeral Package Inquiry')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Prefill name + email from profile if logged in
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthReady(true); return }
      setIsLoggedIn(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()
      if (profile?.name)  setName(profile.name)
      if (profile?.email) setEmail(profile.email)
      setAuthReady(true)
    })
  }, [supabase])

  const { clearDraft } = useDraftForm(
    'contact-inquiry-draft',
    { name, email, subject, message },
    (saved) => {
      // Only restore draft values for fields that aren't already prefilled from auth
      if (saved.name    && !name)    setName(saved.name)
      if (saved.email   && !email)   setEmail(saved.email)
      if (saved.subject) setSubject(saved.subject)
      if (saved.message) setMessage(saved.message)
    },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!name || !email || !message) { setError('Please fill in all required fields.'); return }

    setLoading(true)
    const { error: insertErr } = await supabase
      .from('inquiries')
      .insert({ name: name.trim(), email: email.trim(), subject, message: message.trim() })
    setLoading(false)

    if (insertErr) { setError(insertErr.message); return }

    clearDraft()
    setSuccess(true)
    setName(''); setEmail(''); setMessage('')
  }

  const formProps = {
    name, setName, email, setEmail,
    subject, setSubject, message, setMessage,
    success, setSuccess, loading, error,
    isLoggedIn,
    onSubmit: handleSubmit,
  }

  return (
    <ClientLayout>

      <main className="flex-1 bg-background">

        <div className="max-w-2xl mx-auto px-6 pt-16 pb-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Get in Touch</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Contact Us</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our team is available around the clock to assist your family with care and compassion.
          </p>
        </div>

        <ContactDetailsBar />

        <div className="md:hidden max-w-xl mx-auto px-6 py-10 space-y-10">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Inquiry Form</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Send a Message</h2>
            </div>
            <InquiryFormCard {...formProps} />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Location</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Find Us</h2>
            </div>
            <MapBlock />
          </div>
        </div>

        <div className="hidden md:grid max-w-6xl mx-auto px-6 py-14 grid-cols-2 gap-12 items-stretch">
          <div className="space-y-4 flex flex-col">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Location</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Find Us</h2>
            </div>
            <div className="flex-1">
              <MapBlock />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Inquiry Form</p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Send a Message</h2>
            </div>
            <InquiryFormCard {...formProps} />
          </div>
        </div>

      </main>
    </ClientLayout>
  )
}
