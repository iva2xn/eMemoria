'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { FormField } from '@/components/ui/form-field'
import { PhoneInput } from '@/components/ui/phone-input'
import { checkPassword, isPasswordStrong } from '@/lib/password-strength'
import { Mail, KeyRound, Phone, Check, X, Send, ShieldCheck, ScrollText, ChevronDown } from 'lucide-react'

const inp = 'w-full h-11 px-4 rounded-lg bg-background border border-border/80 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all'
const lbl = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5'

// ── Complete suffix list ──────────────────────────────────────────────────────
const SUFFIXES = [
  { value: '',    label: 'No Suffix' },
  { value: 'Jr.', label: 'Jr. – Junior' },
  { value: 'Sr.', label: 'Sr. – Senior' },
  { value: 'II',  label: 'II – The Second' },
  { value: 'III', label: 'III – The Third' },
  { value: 'IV',  label: 'IV – The Fourth' },
  { value: 'V',   label: 'V – The Fifth' },
  { value: 'VI',  label: 'VI – The Sixth' },
  { value: 'VII', label: 'VII – The Seventh' },
  { value: 'VIII',label: 'VIII – The Eighth' },
  { value: 'IX',  label: 'IX – The Ninth' },
  { value: 'X',   label: 'X – The Tenth' },
  { value: 'Esq.', label: 'Esq. – Esquire' },
  { value: 'PhD', label: 'PhD – Doctor of Philosophy' },
  { value: 'MD',  label: 'MD – Medical Doctor' },
  { value: 'DDS', label: 'DDS – Doctor of Dental Surgery' },
  { value: 'JD',  label: 'JD – Juris Doctor' },
  { value: 'CPA', label: 'CPA – Certified Public Accountant' },
  { value: 'RN',  label: 'RN – Registered Nurse' },
  { value: 'Ret.', label: 'Ret. – Retired' },
]

// ── Password checklist ────────────────────────────────────────────────────────
function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null
  const checks = checkPassword(password)
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(c => (
        <li key={c.label} className={`flex items-center gap-1.5 text-[11px] font-medium ${c.pass ? 'text-primary' : 'text-muted-foreground'}`}>
          {c.pass ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
          {c.label}
        </li>
      ))}
    </ul>
  )
}

// ── Terms & Privacy modal ─────────────────────────────────────────────────────
function TermsModal({ onAccept }: { onAccept: () => void }) {
  const [tab,         setTab]         = useState<'terms' | 'privacy'>('terms')
  const [termsRead,   setTermsRead]   = useState(false)
  const [privacyRead, setPrivacyRead] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset "read" state when switching tabs so each must be scrolled
  const switchTab = (t: 'terms' | 'privacy') => {
    setTab(t)
    // Scroll back to top of content pane
    setTimeout(() => { scrollRef.current?.scrollTo({ top: 0 }) }, 0)
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    if (!atBottom) return
    if (tab === 'terms')   setTermsRead(true)
    if (tab === 'privacy') setPrivacyRead(true)
  }

  const bothRead = termsRead && privacyRead

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border border-border/50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-foreground">Before you continue</h2>
              <p className="text-xs text-muted-foreground">Please read and scroll through both documents to proceed.</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchTab('terms')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'terms'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {termsRead && <Check className="h-3 w-3 text-primary shrink-0" />}
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              onClick={() => switchTab('privacy')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'privacy'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {privacyRead && <Check className="h-3 w-3 text-primary shrink-0" />}
              Privacy Policy
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-foreground/80 leading-relaxed space-y-5 min-h-0"
        >
          {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-border/40 shrink-0">
          {/* Scroll nudge — shown while not yet at bottom */}
          {((tab === 'terms' && !termsRead) || (tab === 'privacy' && !privacyRead)) && (
            <p className="text-[11px] text-muted-foreground text-center mb-3 flex items-center justify-center gap-1 animate-bounce">
              <ChevronDown className="h-3 w-3" /> Scroll down to read the full document
            </p>
          )}

          {/* Progress pills */}
          <div className="flex gap-2 mb-4">
            <div className={`flex-1 rounded-full h-1.5 transition-colors ${termsRead ? 'bg-primary' : 'bg-border'}`} />
            <div className={`flex-1 rounded-full h-1.5 transition-colors ${privacyRead ? 'bg-primary' : 'bg-border'}`} />
          </div>

          <Button
            type="button"
            onClick={onAccept}
            disabled={!bothRead}
            className="w-full h-11 font-semibold"
          >
            {bothRead ? 'I Understand — Continue' : 'Read both documents to continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Inline Terms content ──────────────────────────────────────────────────────
function TermsContent() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Last Updated: September 2026</p>
      <p>
        Welcome to eMemoria, the official online portal of <strong>Marcelo P. Gayeta Funeral Services</strong>,
        located at Maharlika Highway, Brgy. Sampaloc 2, Sariaya, Quezon. By accessing or using this website and
        its services, you acknowledge that you have read, understood, and agreed to be bound by these Terms and
        Conditions. If you do not agree with any part of these terms, please discontinue use of this website.
      </p>
      <h3 className="font-bold text-foreground text-base">1. Use of the Website</h3>
      <p>
        This website is provided for informational and transactional purposes related to funeral, cremation,
        columbarium, and memorial services offered by Marcelo P. Gayeta Funeral Services. You agree to use this
        website only for lawful purposes and in accordance with these Terms. You must not use this site in any
        way that causes or may cause damage to the website or impairment of its availability or accessibility,
        or in any way that is fraudulent, harmful, unlawful, or deceptive.
      </p>
      <h3 className="font-bold text-foreground text-base">2. Account Registration</h3>
      <p>
        Certain features of this website require account registration. You agree to provide accurate, current,
        and complete information during registration and to keep your account credentials confidential. You are
        responsible for all activities that occur under your account. Marcelo P. Gayeta Funeral Services reserves
        the right to suspend or terminate accounts found to be in violation of these Terms.
      </p>
      <h3 className="font-bold text-foreground text-base">3. Services and Bookings</h3>
      <p>
        All service packages, pricing, and availability displayed on this website are subject to change without
        prior notice. Submission of a booking, document, or payment through this portal does not constitute a
        confirmed reservation until reviewed and approved by our staff. We reserve the right to decline any
        booking at our discretion.
      </p>
      <h3 className="font-bold text-foreground text-base">4. Payments</h3>
      <p>
        Payments submitted through this portal are subject to verification by our staff. Proof of payment must
        be uploaded accurately. Marcelo P. Gayeta Funeral Services shall not be liable for payments made to
        incorrect accounts or for unauthorized transactions resulting from the user&apos;s failure to secure
        their account. All amounts displayed are in Philippine Peso (₱).
      </p>
      <h3 className="font-bold text-foreground text-base">5. Document Submissions</h3>
      <p>
        Documents submitted through this portal are used solely for the purpose of verifying eligibility for
        funeral and cremation services. Users are responsible for ensuring that submitted documents are accurate,
        authentic, and legally obtained. Submission of falsified documents may result in account termination and
        may be reported to appropriate authorities.
      </p>
      <h3 className="font-bold text-foreground text-base">6. Obituaries and Memorial Content</h3>
      <p>
        Obituary content submitted by clients or published by our staff is intended for memorial and
        informational purposes. By submitting content, you represent that you have the right to share such
        information and images. Marcelo P. Gayeta Funeral Services reserves the right to review, edit, or
        decline any content that is deemed inappropriate, inaccurate, or disrespectful.
      </p>
      <h3 className="font-bold text-foreground text-base">7. Intellectual Property</h3>
      <p>
        All content on this website, including but not limited to text, graphics, logos, images, and design
        elements, is the property of Marcelo P. Gayeta Funeral Services and is protected under applicable
        intellectual property laws. Unauthorized reproduction, distribution, or use of any content from this
        website is strictly prohibited without prior written consent.
      </p>
      <h3 className="font-bold text-foreground text-base">8. Limitation of Liability</h3>
      <p>
        Marcelo P. Gayeta Funeral Services shall not be held liable for any direct, indirect, incidental, or
        consequential damages arising from the use or inability to use this website, including but not limited
        to system downtime, data loss, or service interruptions. The website and its services are provided
        &ldquo;as is&rdquo; without warranties of any kind, express or implied.
      </p>
      <h3 className="font-bold text-foreground text-base">9. Third-Party Links</h3>
      <p>
        This website may contain links to external websites for reference or convenience. Marcelo P. Gayeta
        Funeral Services is not responsible for the content, accuracy, or privacy practices of any third-party
        websites. Access to such sites is at your own risk.
      </p>
      <h3 className="font-bold text-foreground text-base">10. Modifications to Terms</h3>
      <p>
        Marcelo P. Gayeta Funeral Services reserves the right to revise these Terms and Conditions at any time.
        Changes will be posted on this page with an updated effective date. Continued use of the website after
        any modifications constitutes your acceptance of the revised Terms.
      </p>
      <h3 className="font-bold text-foreground text-base">11. Governing Law</h3>
      <p>
        These Terms and Conditions shall be governed by and construed in accordance with the laws of the
        Republic of the Philippines. Any disputes arising from the use of this website shall be subject to
        the jurisdiction of the appropriate courts in Quezon Province.
      </p>
      <h3 className="font-bold text-foreground text-base">12. Contact Us</h3>
      <p>
        For questions or concerns regarding these Terms and Conditions, please contact us:<br />
        <strong>Marcelo P. Gayeta Funeral Services</strong><br />
        Main Branch: Maharlika Highway, Brgy. Sampaloc 2, Sariaya, Quezon<br />
        Branch: Brgy. Mayuwi, Tayabas City<br />
        Phone: +63 961-134-1255 / +63 918-901-9978<br />
        Email: support@ememoria.site
      </p>
    </div>
  )
}

// ── Inline Privacy content ────────────────────────────────────────────────────
function PrivacyContent() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Last Updated: September 2026</p>
      <p>
        Marcelo P. Gayeta Funeral Services (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is
        committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use,
        store, and protect your personal information when you use the eMemoria website and its services. By
        using this website, you consent to the practices described in this policy.
      </p>
      <h3 className="font-bold text-foreground text-base">1. Information We Collect</h3>
      <p>We may collect the following types of personal information:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account Information:</strong> Full name, email address, phone number, and password when you register for an account.</li>
        <li><strong>Service-Related Information:</strong> Documents submitted for funeral or cremation services, including government-issued IDs, death certificates, and other required documents.</li>
        <li><strong>Payment Information:</strong> Payment method, reference numbers, and proof of payment screenshots. We do not store full bank account or card details.</li>
        <li><strong>Memorial Content:</strong> Obituary details, photos, and information about the deceased provided by the client.</li>
        <li><strong>Usage Data:</strong> Browser type, device information, IP address, and pages visited, collected automatically to improve website performance.</li>
      </ul>
      <h3 className="font-bold text-foreground text-base">2. How We Use Your Information</h3>
      <p>The information we collect is used for the following purposes:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>To process and manage your service bookings, payments, and document submissions.</li>
        <li>To communicate with you regarding your account, service status, and inquiries.</li>
        <li>To send notifications related to your transactions and service updates.</li>
        <li>To publish obituaries and memorial content upon your request and approval.</li>
        <li>To improve website functionality and user experience.</li>
        <li>To comply with legal obligations and protect against fraud or misuse.</li>
      </ul>
      <h3 className="font-bold text-foreground text-base">3. Data Sharing and Disclosure</h3>
      <p>
        We do not sell, rent, or trade your personal information to third parties. Your information may only
        be shared in the following circumstances:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>With our authorized staff for the purpose of processing your service requests.</li>
        <li>When required by law, court order, or government regulation.</li>
        <li>To protect the rights, property, or safety of Marcelo P. Gayeta Funeral Services, our clients, or the public.</li>
      </ul>
      <h3 className="font-bold text-foreground text-base">4. Data Retention</h3>
      <p>
        We retain your personal information for as long as your account is active or as necessary to provide
        our services. Accounts scheduled for deletion are subject to a 30-day grace period before permanent
        removal. You may request deletion of your account and associated data at any time through your account
        settings or by contacting us directly.
      </p>
      <h3 className="font-bold text-foreground text-base">5. Data Security</h3>
      <p>
        We implement appropriate technical and organizational security measures to protect your personal
        information against unauthorized access, alteration, disclosure, or destruction. However, no method
        of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.
        You are responsible for keeping your account credentials confidential.
      </p>
      <h3 className="font-bold text-foreground text-base">6. Cookies and Tracking Technologies</h3>
      <p>
        This website may use cookies and similar technologies to enhance user experience, remember preferences,
        and analyze website traffic. You may configure your browser settings to refuse cookies; however, doing
        so may affect the functionality of certain features on this website.
      </p>
      <h3 className="font-bold text-foreground text-base">7. Your Rights</h3>
      <p>
        Under applicable Philippine privacy laws, including the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>,
        you have the right to:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Be informed about how your personal data is being processed.</li>
        <li>Access a copy of your personal information held by us.</li>
        <li>Request correction of inaccurate or incomplete personal data.</li>
        <li>Request deletion or blocking of your personal data under certain conditions.</li>
        <li>Object to the processing of your personal data in certain circumstances.</li>
        <li>File a complaint with the <strong>National Privacy Commission (NPC)</strong> if you believe your privacy rights have been violated.</li>
      </ul>
      <p>To exercise any of these rights, please contact us using the details provided below.</p>
      <h3 className="font-bold text-foreground text-base">8. Children&apos;s Privacy</h3>
      <p>
        This website is not directed at individuals under the age of 18. We do not knowingly collect personal
        information from minors. If we become aware that a minor has provided personal information without
        parental consent, we will take steps to remove such information promptly.
      </p>
      <h3 className="font-bold text-foreground text-base">9. Changes to This Policy</h3>
      <p>
        We reserve the right to update or modify this Privacy Policy at any time. Any changes will be reflected
        on this page with a revised effective date. We encourage you to review this policy periodically.
        Continued use of the website after any updates constitutes your acceptance of the revised policy.
      </p>
      <h3 className="font-bold text-foreground text-base">10. Contact Us</h3>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your
        personal information, please contact us:<br />
        <strong>Marcelo P. Gayeta Funeral Services</strong><br />
        Main Branch: Maharlika Highway, Brgy. Sampaloc 2, Sariaya, Quezon<br />
        Branch: Brgy. Mayuwi, Tayabas City<br />
        Phone: +63 961-134-1255 / +63 918-901-9978<br />
        Email: support@ememoria.site
      </p>
    </div>
  )
}

// ── Main register form ────────────────────────────────────────────────────────
function RegisterContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const nextUrl      = searchParams.get('next') ?? '/'

  // Terms gate — user must read both docs before seeing the form
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Name fields
  const [firstName,  setFirstName]  = useState('')
  const [middleInit, setMiddleInit] = useState('')
  const [lastName,   setLastName]   = useState('')
  const [suffix,     setSuffix]     = useState('')   // '' = No Suffix

  // Contact
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('+63 9') // pre-fill +63 9
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')

  // OTP state
  const [otpSending,   setOtpSending]   = useState(false)
  const [otpSent,      setOtpSent]      = useState(false)
  const [otpCode,      setOtpCode]      = useState('')
  const [otpVerified,  setOtpVerified]  = useState(false)
  const [otpToken,     setOtpToken]     = useState('')
  const [otpError,     setOtpError]     = useState('')
  const [otpVerifying, setOtpVerifying] = useState(false)

  // Form state
  const [emailTaken, setEmailTaken] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // ── Middle initial: allow free typing, auto-format on blur ───
  const handleMiddleInitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z.\s]/g, '')
    setMiddleInit(raw)
  }
  const handleMiddleInitBlur = () => {
    if (!middleInit.trim()) { setMiddleInit(''); return }
    const letters = middleInit.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).filter(Boolean)
    if (!letters.length) { setMiddleInit(''); return }
    setMiddleInit(letters.map(w => w[0].toUpperCase() + '.').join(' '))
  }

  // ── Send OTP ─────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setOtpError('')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setOtpError('Please enter a valid email address first.')
      return
    }
    setOtpSending(true)
    setOtpVerified(false)
    setOtpCode('')
    try {
      const res = await fetch('/api/register-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setOtpError(data.error ?? 'Failed to send code.'); return }
      setOtpSent(true)
    } catch {
      setOtpError('Network error. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setOtpError('')
    if (!otpCode.trim()) { setOtpError('Please enter the code.'); return }
    setOtpVerifying(true)
    try {
      const res = await fetch('/api/register-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setOtpError(data.error ?? 'Invalid code.'); return }
      setOtpVerified(true)
      setOtpToken(data.verifiedToken ?? '')
      setOtpSent(false)
    } catch {
      setOtpError('Network error. Please try again.')
    } finally {
      setOtpVerifying(false)
    }
  }

  // ── Submit ───────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailTaken(false)

    if (!firstName.trim())           { setError('First name is required.'); return }
    if (!lastName.trim())            { setError('Last name is required.'); return }
    if (!email.trim())               { setError('Email address is required.'); return }
    if (!otpVerified)                { setError('Please verify your email address first.'); return }
    // Validate phone has full 10 digits after +63 prefix
    const phoneDigits = phone.replace(/\D/g, '')  // strip all non-digits
    if (phoneDigits.length < 12) {  // +63 = country code (2 digits) + 10-digit number = 12 total
      setError('Please enter a complete 10-digit contact number.'); return
    }
    if (!password)                   { setError('Password is required.'); return }
    if (!isPasswordStrong(password)) { setError('Password does not meet the requirements below.'); return }
    if (password !== confirm)        { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/create-user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       email.trim(),
          password,
          firstName:   firstName.trim(),
          middleInit:  middleInit.trim() || null,
          lastName:    lastName.trim(),
          suffix:      suffix || null,
          phone:       phone.trim(),
          otpVerifiedToken: otpToken || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'email_taken' || res.status === 409) {
          setEmailTaken(true)
          setError('This email has already been taken.')
        } else {
          setError(data.error ?? 'Registration failed. Please try again.')
        }
        return
      }

      router.push('/auth/login?registered=1')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrong = checkPassword(password).every(c => c.pass)

  // ── Terms gate ───────────────────────────────────────────────
  if (!termsAccepted) {
    return <TermsModal onAccept={() => setTermsAccepted(true)} />
  }

  return (
    <div className="w-full max-w-lg bg-card border border-border/40 p-8 rounded-2xl shadow-xl">
      <div className="text-center space-y-2 mb-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Create Account</h1>
        <p className="text-sm text-muted-foreground">Register to access your eMemoria account.</p>
      </div>

      {error && <AlertBanner variant="error" message={error} className="mb-5" />}

      <form onSubmit={handleRegister} className="space-y-5">

        {/* ── Name ── */}
        <div>
          <p className={lbl}>Full Name</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                First Name <span className="text-primary">*</span>
              </label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="" className={inp} maxLength={50} required />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                Middle Initial
              </label>
              <input
                type="text" value={middleInit}
                onChange={handleMiddleInitChange}
                onBlur={handleMiddleInitBlur}
                placeholder=""
                className={inp} maxLength={10}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">
                Last Name <span className="text-primary">*</span>
              </label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="" className={inp} maxLength={50} required />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Suffix</label>
              <div className="relative">
                <select
                  value={suffix}
                  onChange={e => setSuffix(e.target.value)}
                  className={`${inp} appearance-none pr-9 cursor-pointer`}
                >
                  {SUFFIXES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Email + OTP ── */}
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 opacity-60" />
              Email Address <span className="text-primary">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setEmailTaken(false); setOtpVerified(false); setOtpToken(''); setOtpSent(false); setOtpCode('') }}
                placeholder="" className={`${inp} flex-1 ${emailTaken ? 'border-destructive focus:border-destructive' : ''} ${otpVerified ? 'border-primary bg-primary/5' : ''}`}
                required
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpVerified}
                className="shrink-0 h-11 px-4 rounded-lg border border-border text-xs font-bold text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                {otpVerified
                  ? <><ShieldCheck className="h-3.5 w-3.5" /> Verified</>
                  : otpSending
                    ? 'Sending…'
                    : <><Send className="h-3.5 w-3.5" /> {otpSent ? 'Resend' : 'Send OTP'}</>
                }
              </button>
            </div>
            {emailTaken && (
              <p className="text-[11px] text-destructive font-semibold flex items-center gap-1">
                <X className="h-3 w-3" /> This email has already been taken.
              </p>
            )}
            {otpVerified && (
              <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Email address verified.
              </p>
            )}
          </div>

          {/* OTP input — shown after Send OTP is clicked */}
          {otpSent && !otpVerified && (
            <div className="space-y-1.5 bg-muted/30 border border-border/60 rounded-xl p-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Enter the 6-digit code sent to <span className="text-foreground">{email}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={`${inp} flex-1 font-mono tracking-widest text-center text-lg`}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="shrink-0 h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {otpVerifying ? 'Verifying…' : 'Verify'}
                </button>
              </div>
              {otpError && (
                <p className="text-[11px] text-destructive font-semibold flex items-center gap-1">
                  <X className="h-3 w-3" /> {otpError}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">Code expires in 10 minutes. Check your spam folder if not received.</p>
            </div>
          )}
          {otpError && !otpSent && (
            <p className="text-[11px] text-destructive font-semibold flex items-center gap-1">
              <X className="h-3 w-3" /> {otpError}
            </p>
          )}
        </div>

        {/* ── Phone ── */}
        <div>
          <label className={lbl}><Phone className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />Contact Number <span className="text-primary">*</span></label>
          <PhoneInput value={phone} onChange={setPhone} required className={inp} />
        </div>

        {/* ── Password ── */}
        <div>
          <FormField id="password" label="Password" type="password"
            placeholder="" value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
          />
          <PasswordChecklist password={password} />
        </div>

        {/* ── Confirm ── */}
        <FormField id="confirm" label="Confirm Password" type="password"
          placeholder="" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          icon={<KeyRound className="h-4 w-4" />}
        />

        {/* ── T&C notice (read-only, already accepted) ── */}
        <p className="text-xs text-muted-foreground text-center">
          By creating an account you agree to our{' '}
          <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">Terms &amp; Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">Privacy Policy</Link>.
        </p>

        <Button
          type="submit"
          disabled={loading || !otpVerified || (password.length > 0 && !pwStrong)}
          className="w-full h-11 font-semibold"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <div className="text-center pt-4 border-t border-border/30 text-sm text-muted-foreground mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-primary hover:underline">Login</Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <Suspense fallback={<div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />}>
          <RegisterContent />
        </Suspense>
      </main>
    </>
  )
}
