// Pure UI card for the inquiry form.
// All state + submit logic lives in the page — this just renders.

import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SelectField } from '@/components/ui/select-field'
import { CheckCircle2 } from 'lucide-react'

export interface InquiryFormCardProps {
  name: string;       setName: (v: string) => void
  email: string;      setEmail: (v: string) => void
  subject: string;    setSubject: (v: string) => void
  message: string;    setMessage: (v: string) => void
  success: boolean;   setSuccess: (v: boolean) => void
  loading: boolean
  error: string
  onSubmit: (e: React.FormEvent) => void
}

export function InquiryFormCard({
  name, setName, email, setEmail, subject, setSubject,
  message, setMessage, success, setSuccess, loading, error, onSubmit,
}: InquiryFormCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      {error && <AlertBanner variant="error" message={error} />}

      {success ? (
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-foreground" />
          </div>
          <p className="font-serif text-lg font-bold text-foreground">Message Received</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            A memorial counselor will reach out to you shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-2 text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="inq-name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
              <input
                id="inq-name" type="text" placeholder="Juan Dela Cruz"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 outline-hidden transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inq-email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
              <input
                id="inq-email" type="email" placeholder="juan@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-background border border-border/80 text-sm focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 outline-hidden transition-all"
                required
              />
            </div>
          </div>

          <SelectField id="inq-subject" label="Subject" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="Funeral Package Inquiry">Funeral Package Inquiry</option>
            <option value="Pre-planning Memorial Schemes">Pre-planning Memorial Schemes</option>
            <option value="Custom Altar / wake Decorations">Custom Chapel Altar Details</option>
            <option value="Columbarium Reservation">Columbarium Reservation</option>
            <option value="General Inquiry">General Inquiry</option>
          </SelectField>

          <div className="space-y-1.5">
            <label htmlFor="inq-msg" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
            <textarea
              id="inq-msg" rows={5}
              placeholder="How can we help you? Include any relevant details about your needs..."
              value={message} onChange={e => setMessage(e.target.value)}
              className="w-full p-4 rounded-xl bg-background border border-border/80 text-sm focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 outline-hidden transition-all resize-none"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 font-semibold rounded-xl">
            {loading ? 'Sending…' : 'Send Message'}
          </Button>
        </form>
      )}
    </div>
  )
}
