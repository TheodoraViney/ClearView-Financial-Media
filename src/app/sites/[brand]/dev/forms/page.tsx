import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BRANDS, EDITORIAL_BRAND_KEYS, isBrandKey } from '@/brands'
import { Container } from '@/components/ui/Container'
import { HONEYPOT_FIELD } from '@/lib/forms'

import { subscribeAction, upsertAction } from './actions'
import { DevForm } from './DevForm.client'

// Temporary Brevo test page on the client's live Brevo account. Both forms send to the newsletter list
// of the chosen publication, from its Brand settings → Newsletter in the CMS.

const PUBLICATIONS = EDITORIAL_BRAND_KEYS.map((key) => ({ value: key, label: BRANDS[key].title }))

export default async function FormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>
  searchParams: Promise<{ confirmed?: string }>
}) {
  const { brand } = await params

  if (!isBrandKey(brand) || !['development', 'staging'].includes(process.env.NEXT_PUBLIC_SITE_ENV ?? '')) {
    notFound()
  }

  // Preselect the brand this page is on when it has a newsletter.
  const defaultPublication = (EDITORIAL_BRAND_KEYS as readonly string[]).includes(brand) ? brand : undefined

  return (
    <main className="py-section">
      <Container className="flex flex-col gap-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-heading-lg font-medium">Forms</h1>
          <p className="text-base text-grey">Brand: {BRANDS[brand].title}.</p>
          {/* Search params make the render dynamic, so the notice sits in its own boundary. */}
          <Suspense>
            <ConfirmedNotice searchParams={searchParams} />
          </Suspense>
        </header>

        <DevForm
          title="Subscribe (double opt-in)"
          action={subscribeAction}
          honeypotField={HONEYPOT_FIELD}
          publications={PUBLICATIONS}
          defaultPublication={defaultPublication}
        />
        <DevForm
          title="Upsert contact (lead / pack)"
          action={upsertAction}
          honeypotField={HONEYPOT_FIELD}
          publications={PUBLICATIONS}
          defaultPublication={defaultPublication}
          firstNameRequired
        />
      </Container>
    </main>
  )
}

async function ConfirmedNotice({ searchParams }: { searchParams: Promise<{ confirmed?: string }> }) {
  const { confirmed } = await searchParams

  return confirmed === '1' ? <p role="status">Subscription confirmed.</p> : null
}
