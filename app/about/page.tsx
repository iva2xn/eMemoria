import React from 'react'
import { Metadata } from 'next'
import { HeroHeader } from '@/components/header'
import { PageHeader } from '@/components/ui/page-header'
import { ProseCard } from '@/components/ui/prose-card'

export const metadata: Metadata = {
  title: 'About Us | eMemoria',
  description: 'About Marcelo P. Gayeta Funeral Services',
}

export default function AboutPage() {
  return (
    <>
      <HeroHeader />
      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
        <PageHeader
          title="About Us"
          subtitle="Learn more about our history, our mission, and our commitment to serving the community."
        />
        <ProseCard title="Our History">
          <p>
            Marcelo P. Gayeta Funeral Services has been serving the Sariaya community with compassion and dedication. We understand the difficulties families face during times of loss, and we are committed to providing professional, dignified, and personalized funeral services.
          </p>
          <h2>Our Mission</h2>
          <p>
            Our mission is to support families by honoring their loved ones with respect, offering a comforting environment, and guiding them through every step of the funeral and cremation process.
          </p>
        </ProseCard>
      </div>
    </>
  )
}
