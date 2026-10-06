import { stegaClean } from 'next-sanity'

import {
  NewsletterSignup as NewsletterSignupSection,
  type NewsletterOption,
} from '@/components/sections/NewsletterSignup'
import { toHeading } from '@/sanity/heading'
import { urlFor } from '@/sanity/image'

import type { BlockProps } from './types'

// About 900px wide at 1440 and full width on mobile and tablet. 1600 matches the hero: near 2x on desktop
// and 2x for a full-width image up to 800px; the source photo is wider, so `fit('max')` never upscales.
const IMAGE_WIDTH = 1600

type Option = NonNullable<BlockProps<'newsletterSignup'>['block']['options']>[number]

// The label keeps stega for click-to-edit; only the emptiness check reads the cleaned text.
function toOption(option: Option): NewsletterOption | null {
  if (!stegaClean(option.label)?.trim()) {
    return null
  }

  return { key: option._key, label: option.label ?? '' }
}

export function NewsletterSignup({ block }: BlockProps<'newsletterSignup'>) {
  const options = (block.options ?? []).map(toOption).filter((option): option is NewsletterOption => option !== null)

  return (
    <NewsletterSignupSection
      heading={toHeading(block.heading)}
      body={block.body ?? ''}
      preferencesLabel={block.preferencesLabel ?? ''}
      options={options}
      emailPlaceholder={block.emailPlaceholder ?? ''}
      buttonLabel={block.buttonLabel ?? ''}
      invalidEmailMessage={block.invalidEmailMessage ?? ''}
      noOptionMessage={block.noOptionMessage ?? ''}
      image={
        block.image?.asset
          ? {
              src: urlFor(block.image).width(IMAGE_WIDTH).fit('max').auto('format').url(),
              // Alt is read by screen readers, not shown, so it is cleaned like the other adapters do.
              alt: stegaClean(block.image.alt) ?? '',
            }
          : null
      }
    />
  )
}
