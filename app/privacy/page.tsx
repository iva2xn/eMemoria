import React from 'react'
import { Metadata } from 'next'
import { ClientLayout } from '@/components/client-layout'
import { ProseCard } from '@/components/ui/prose-card'

export const metadata: Metadata = {
  title: 'Privacy Policy | eMemoria',
  description: 'Privacy Policy for eMemoria – Marcelo P. Gayeta Funeral Services',
}

export default function PrivacyPolicyPage() {
  return (
    <ClientLayout>
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        <ProseCard title="Privacy Policy" subtitle="Last Updated: September 2026">

          <p>
            Marcelo P. Gayeta Funeral Services (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is
            committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use,
            store, and protect your personal information when you use the eMemoria website and its services. By
            using this website, you consent to the practices described in this policy.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We may collect the following types of personal information:</p>
          <ul>
            <li><strong>Account Information:</strong> Full name, email address, phone number, and password when you register for an account.</li>
            <li><strong>Service-Related Information:</strong> Documents submitted for funeral or cremation services, including government-issued IDs, death certificates, and other required documents.</li>
            <li><strong>Payment Information:</strong> Payment method, reference numbers, and proof of payment screenshots. We do not store full bank account or card details.</li>
            <li><strong>Memorial Content:</strong> Obituary details, photos, and information about the deceased provided by the client.</li>
            <li><strong>Usage Data:</strong> Browser type, device information, IP address, and pages visited, collected automatically to improve website performance.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>The information we collect is used for the following purposes:</p>
          <ul>
            <li>To process and manage your service bookings, payments, and document submissions.</li>
            <li>To communicate with you regarding your account, service status, and inquiries.</li>
            <li>To send notifications related to your transactions and service updates.</li>
            <li>To publish obituaries and memorial content upon your request and approval.</li>
            <li>To improve website functionality and user experience.</li>
            <li>To comply with legal obligations and protect against fraud or misuse.</li>
          </ul>

          <h2>3. Data Sharing and Disclosure</h2>
          <p>
            We do not sell, rent, or trade your personal information to third parties. Your information may only
            be shared in the following circumstances:
          </p>
          <ul>
            <li>With our authorized staff for the purpose of processing your service requests.</li>
            <li>When required by law, court order, or government regulation.</li>
            <li>To protect the rights, property, or safety of Marcelo P. Gayeta Funeral Services, our clients, or the public.</li>
          </ul>

          <h2>4. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as necessary to provide
            our services. Accounts scheduled for deletion are subject to a 30-day grace period before permanent
            removal. You may request deletion of your account and associated data at any time through your account
            settings or by contacting us directly.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction. However, no method
            of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.
            You are responsible for keeping your account credentials confidential.
          </p>

          <h2>6. Cookies and Tracking Technologies</h2>
          <p>
            This website may use cookies and similar technologies to enhance user experience, remember preferences,
            and analyze website traffic. You may configure your browser settings to refuse cookies; however, doing
            so may affect the functionality of certain features on this website.
          </p>

          <h2>7. Your Rights</h2>
          <p>
            Under applicable Philippine privacy laws, including the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>,
            you have the right to:
          </p>
          <ul>
            <li>Be informed about how your personal data is being processed.</li>
            <li>Access a copy of your personal information held by us.</li>
            <li>Request correction of inaccurate or incomplete personal data.</li>
            <li>Request deletion or blocking of your personal data under certain conditions.</li>
            <li>Object to the processing of your personal data in certain circumstances.</li>
            <li>File a complaint with the <strong>National Privacy Commission (NPC)</strong> if you believe your privacy rights have been violated.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us using the details provided below.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            This website is not directed at individuals under the age of 18. We do not knowingly collect personal
            information from minors. If we become aware that a minor has provided personal information without
            parental consent, we will take steps to remove such information promptly.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We reserve the right to update or modify this Privacy Policy at any time. Any changes will be reflected
            on this page with a revised effective date. We encourage you to review this policy periodically.
            Continued use of the website after any updates constitutes your acceptance of the revised policy.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your
            personal information, please contact us:
          </p>
          <p>
            <strong>Marcelo P. Gayeta Funeral Services</strong><br />
            Main Branch: Maharlika Highway, Brgy. Sampaloc 2, Sariaya, Quezon<br />
            Branch: Brgy. Mayuwi, Tayabas City<br />
            Phone: +63 961-134-1255 / +63 918-901-9978<br />
            Email: support@ememoria.site
          </p>

        </ProseCard>
      </div>
    </ClientLayout>
  )
}
