import React from 'react'
import { Metadata } from 'next'
import { HeroHeader } from '@/components/header'
import { ProseCard } from '@/components/ui/prose-card'

export const metadata: Metadata = {
  title: 'Privacy Policy | eMemoria',
  description: 'Privacy Policy for eMemoria - Marcelo P. Gayeta Funeral Services',
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <HeroHeader />
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        <ProseCard title="Privacy Policy" subtitle="Last Updated: March 20, 2026">
          <p>
            eMemoria, a web-based cremation and funeral service management system for Marcelo P. Gayeta Funeral Services in Sariaya, values and respects the privacy of its users. This Privacy Policy explains how information is collected, used, and protected when you access and use the website. By using this website, you agree to the terms outlined in this policy.
          </p>
          <p>
            The website may collect basic information such as names and contact details when voluntarily provided by users through inquiries or communication with the funeral service. Additionally, limited system data such as browser type, device information, and website usage may be collected to help improve system performance and user experience. This information is used solely for purposes such as responding to inquiries, maintaining website functionality, improving services, and ensuring system security.
          </p>
          <p>
            Obituary and memorial information displayed on the website, including names, dates, images, and service details of deceased individuals, are provided by Marcelo P. Gayeta Funeral Services and are intended for public viewing and memorial purposes. This information is carefully handled and published with respect and dignity.
          </p>
          <p>
            eMemoria does not sell, trade, or share personal information with third parties. Information may only be disclosed if required by law or necessary to protect the security and integrity of the system. Appropriate measures are implemented to safeguard data against unauthorized access, misuse, or disclosure.
          </p>
          <p>
            The website may use cookies or similar technologies to enhance user experience and analyze website traffic. Users may choose to disable cookies through their browser settings if preferred. Additionally, the website may contain links to external websites; however, Marcelo P. Gayeta Funeral Services is not responsible for the privacy practices or content of these third-party sites.
          </p>
          <p>
            Users have the right to request correction or removal of their personal information, where applicable, by contacting the funeral service directly. Marcelo P. Gayeta Funeral Services reserves the right to update or modify this Privacy Policy at any time, and any changes will be reflected on this page. Continued use of the website after updates constitutes acceptance of the revised policy.
          </p>
          <p>
            For any questions, concerns, or requests regarding this Privacy Policy, users may contact Marcelo P. Gayeta Funeral Services in Sariaya, Quezon, Philippines, through their official phone number or email address.
          </p>
        </ProseCard>
      </div>
    </>
  )
}
