import React from 'react'
import { Metadata } from 'next'
import { HeroHeader } from '@/components/header'
import { ProseCard } from '@/components/ui/prose-card'

export const metadata: Metadata = {
  title: 'Terms of Service | eMemoria',
  description: 'Terms of Use for eMemoria - Marcelo P. Gayeta Funeral Services',
}

export default function TermsOfServicePage() {
  return (
    <>
      <HeroHeader />
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        <ProseCard title="Terms of Use" subtitle="Last Updated: March 20, 2026">
          <p>
            By accessing and using the eMemoria website, a web-based cremation and funeral service management system for Marcelo P. Gayeta Funeral Services in Sariaya, you agree to comply with and be bound by these Terms of Use. This website is intended to provide obituary and memorial information, display funeral service schedules, and share details about funeral services offered. Users are expected to use the website only for lawful purposes and in a respectful manner, without attempting to misuse, disrupt, or damage the system.
          </p>
          <p>
            All content available on this website, including obituary images, memorial information, funeral service details, design elements, and logos, are provided by Marcelo P. Gayeta Funeral Services for informational purposes only and remain the intellectual property of the organization. While efforts are made to ensure the accuracy and timeliness of information, details such as schedules and service arrangements may change without prior notice; therefore, users are encouraged to verify important information directly with the funeral service provider.
          </p>
          <p>
            Users are strictly prohibited from accessing restricted areas such as administrative or staff panels, transmitting harmful or illegal content, attempting to hack or interfere with the website&apos;s functionality, or using the website for unauthorized commercial purposes. Any violation of these rules may result in restricted access or legal action where applicable.
          </p>
          <p>
            This website may include links to external websites for convenience; however, Marcelo P. Gayeta Funeral Services is not responsible for the content, accuracy, or privacy practices of these third-party sites. Additionally, the organization shall not be held liable for any errors, interruptions, or damages arising from the use or inability to use the website. Use of the website is at the user&apos;s own risk.
          </p>
          <p>
            Marcelo P. Gayeta Funeral Services reserves the right to modify or update these Terms of Use at any time without prior notice. Continued use of the website following any changes constitutes acceptance of the updated terms. These Terms of Use shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines.
          </p>
          <p>
            For any questions, concerns, or clarifications regarding these Terms of Use, users may contact Marcelo P. Gayeta Funeral Services in Sariaya, Quezon, Philippines, through their official phone number or email address.
          </p>
        </ProseCard>
      </div>
    </>
  )
}
