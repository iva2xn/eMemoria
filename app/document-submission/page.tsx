'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { HeroHeader } from '@/components/header'
import { DocumentSubmissionForm } from '@/components/document-submission/document-submission-form'

function DocumentSubmissionContent() {
  const params = useSearchParams()

  // URL params passed from the "Avail" button on service pages
  const productType  = params.get('product') ?? 'package'
  const productRef   = params.get('ref')     ?? ''
  const productLabel = params.get('label')   ?? ''
  const productPrice = Number(params.get('price') ?? 0)

  return (
    <DocumentSubmissionForm
      productType={productType}
      productRef={productRef}
      productLabel={productLabel}
      productPrice={productPrice}
    />
  )
}

export default function DocumentSubmissionPage() {
  return (
    <>
      <HeroHeader />
      <main className="flex-1 bg-background">

        <div className="border-b border-border/40 bg-muted/20 px-6 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Document Submission
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
            Submit Your Documents
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Upload the required documents for verification. Our staff will review and notify you by email once approved.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
          <Suspense fallback={
            <div className="py-20 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          }>
            <DocumentSubmissionContent />
          </Suspense>
        </div>

      </main>
    </>
  )
}
