import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { NOT_FOUND_PAGE_ID } from '@/brands'
import { BouncingDigits } from '@/components/ui/BouncingDigits.client'
import { Button } from '@/components/ui/Button'
import { NOT_FOUND_COPY } from '@/lib/not-found-copy'
import { cachedSanity, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { NOT_FOUND_PAGE_QUERY } from '@/sanity/queries'

// The page title only: the brand layout's template adds the brand name.
export async function generateMetadata(): Promise<Metadata> {
  const { data } = await cachedSanity({
    query: NOT_FOUND_PAGE_QUERY,
    params: { id: NOT_FOUND_PAGE_ID },
    perspective: 'published',
    stega: false,
  })

  return { title: stegaClean(data?.title) || NOT_FOUND_COPY.title }
}

/**
 * The not-found page of every brand (wb-g-404). Header and footer come from the brand layout; the texts come from
 * the one "404 page" document, else the design texts. The button leads to the home page of the host's brand.
 */
export default async function NotFound() {
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={<NotFoundView />}>
        <DynamicNotFound />
      </Suspense>
    )
  }

  return <CachedNotFound perspective="published" stega={false} />
}

async function DynamicNotFound() {
  return <CachedNotFound {...await getDynamicFetchOptions()} />
}

async function CachedNotFound({ perspective, variant, stega }: DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: NOT_FOUND_PAGE_QUERY,
    params: { id: NOT_FOUND_PAGE_ID },
    perspective,
    variant,
    stega,
  })

  return (
    <NotFoundView
      title={data?.title || NOT_FOUND_COPY.title}
      description={data?.description || NOT_FOUND_COPY.description}
      buttonLabel={data?.buttonLabel || NOT_FOUND_COPY.buttonLabel}
    />
  )
}

// Spacing as the design: 64 / 96 above and below from md, 16 / 32 / 64 at the sides, heading 16 / 24 below the numeral.
function NotFoundView({
  title = NOT_FOUND_COPY.title,
  description = NOT_FOUND_COPY.description,
  buttonLabel = NOT_FOUND_COPY.buttonLabel,
}: {
  title?: string
  description?: string
  buttonLabel?: string
}) {
  return (
    <main
      aria-labelledby="error-title"
      className="flex flex-auto flex-col items-center justify-center px-side py-16 md:py-24"
    >
      <div className="flex w-full max-w-140 flex-col items-center text-center">
        <BouncingDigits text="404" />
        <h1 id="error-title" className="mt-4 text-heading-section font-medium text-balance md:mt-6">
          {title}
        </h1>
        <p className="mt-4 max-w-110 text-base leading-copy text-pretty text-grey">{description}</p>
        <div className="mt-8 flex justify-center">
          <Button href="/" size="compact" padding="wide">
            {buttonLabel}
          </Button>
        </div>
      </div>
    </main>
  )
}
