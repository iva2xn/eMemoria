import React from 'react'
import { Metadata } from 'next'
import { ClientLayout } from '@/components/client-layout'
import { ProseCard } from '@/components/ui/prose-card'

export const metadata: Metadata = {
  title: 'Terms and Conditions | eMemoria',
  description: 'Terms and Conditions for eMemoria – Marcelo P. Gayeta Funeral Services',
}

export default function TermsOfServicePage() {
  return (
    <ClientLayout>
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        <ProseCard title="Terms and Conditions" subtitle="Last Updated: September 2026">

          <p>
            Welcome to eMemoria, the official online portal of <strong>Marcelo P. Gayeta Funeral Services</strong>,
            located at Maharlika Highway, Brgy. Sampaloc 2, Sariaya, Quezon. By accessing or using this website and
            its services, you acknowledge that you have read, understood, and agreed to be bound by these Terms and
            Conditions. If you do not agree with any part of these terms, please discontinue use of this website.
          </p>

          <h2>1. Use of the Website</h2>
          <p>
            This website is provided for informational and transactional purposes related to funeral, cremation,
            columbarium, and memorial services offered by Marcelo P. Gayeta Funeral Services. You agree to use this
            website only for lawful purposes and in accordance with these Terms. You must not use this site in any
            way that causes or may cause damage to the website or impairment of its availability or accessibility,
            or in any way that is fraudulent, harmful, unlawful, or deceptive.
          </p>

          <h2>2. Account Registration</h2>
          <p>
            Certain features of this website require account registration. You agree to provide accurate, current,
            and complete information during registration and to keep your account credentials confidential. You are
            responsible for all activities that occur under your account. Marcelo P. Gayeta Funeral Services reserves
            the right to suspend or terminate accounts found to be in violation of these Terms.
          </p>

          <h2>3. Services and Bookings</h2>
          <p>
            All service packages, pricing, and availability displayed on this website are subject to change without
            prior notice. Submission of a booking, document, or payment through this portal does not constitute a
            confirmed reservation until reviewed and approved by our staff. We reserve the right to decline any
            booking at our discretion.
          </p>

          <h2>4. Payments</h2>
          <p>
            Payments submitted through this portal are subject to verification by our staff. Proof of payment must
            be uploaded accurately. Marcelo P. Gayeta Funeral Services shall not be liable for payments made to
            incorrect accounts or for unauthorized transactions resulting from the user&apos;s failure to secure
            their account. All amounts displayed are in Philippine Peso (₱).
          </p>

          <h2>5. Document Submissions</h2>
          <p>
            Documents submitted through this portal are used solely for the purpose of verifying eligibility for
            funeral and cremation services. Users are responsible for ensuring that submitted documents are accurate,
            authentic, and legally obtained. Submission of falsified documents may result in account termination and
            may be reported to appropriate authorities.
          </p>

          <h2>6. Obituaries and Memorial Content</h2>
          <p>
            Obituary content submitted by clients or published by our staff is intended for memorial and
            informational purposes. By submitting content, you represent that you have the right to share such
            information and images. Marcelo P. Gayeta Funeral Services reserves the right to review, edit, or
            decline any content that is deemed inappropriate, inaccurate, or disrespectful.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            All content on this website, including but not limited to text, graphics, logos, images, and design
            elements, is the property of Marcelo P. Gayeta Funeral Services and is protected under applicable
            intellectual property laws. Unauthorized reproduction, distribution, or use of any content from this
            website is strictly prohibited without prior written consent.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            Marcelo P. Gayeta Funeral Services shall not be held liable for any direct, indirect, incidental, or
            consequential damages arising from the use or inability to use this website, including but not limited
            to system downtime, data loss, or service interruptions. The website and its services are provided
            &ldquo;as is&rdquo; without warranties of any kind, express or implied.
          </p>

          <h2>9. Third-Party Links</h2>
          <p>
            This website may contain links to external websites for reference or convenience. Marcelo P. Gayeta
            Funeral Services is not responsible for the content, accuracy, or privacy practices of any third-party
            websites. Access to such sites is at your own risk.
          </p>

          <h2>10. Modifications to Terms</h2>
          <p>
            Marcelo P. Gayeta Funeral Services reserves the right to revise these Terms and Conditions at any time.
            Changes will be posted on this page with an updated effective date. Continued use of the website after
            any modifications constitutes your acceptance of the revised Terms.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These Terms and Conditions shall be governed by and construed in accordance with the laws of the
            Republic of the Philippines. Any disputes arising from the use of this website shall be subject to
            the jurisdiction of the appropriate courts in Quezon Province.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            For questions or concerns regarding these Terms and Conditions, please contact us:
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
