import { stegaClean } from 'next-sanity'

import {
  NewsletterSignup as NewsletterSignupSection,
  type NewsletterOption,
} from '@/components/sections/NewsletterSignup'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

type Option = NonNullable<BlockProps<'newsletterSignup'>['block']['options']>[number]

// The label keeps stega for click-to-edit; only the emptiness check reads the cleaned text.
function toOption(option: Option): NewsletterOption | null {
  if (!stegaClean(option.label)?.trim()) {
    return null
  }

  return { key: option._key, label: option.label ?? '', defaultChecked: stegaClean(option.defaultChecked) === true }
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
      // Alt is read by screen readers, not shown, so toImage cleans it like the other adapters do.
      image={toImage(block.image)}
    />
  )
}
