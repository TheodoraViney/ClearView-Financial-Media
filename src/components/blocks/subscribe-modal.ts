import { stegaClean } from 'next-sanity'

import type { BrandKey } from '@/brands'
import type { SubscribeModalData, SubscribeModalText } from '@/components/sections/subscribe/types'
import { resolveHref } from '@/lib/links'
import { CONSENT_LINK_TOKEN, SUBSCRIBE_MODAL_TEXT_FIELDS } from '@/lib/subscribe'
import type { SubscribeOptions } from '@/lib/subscribe-options'

import { isPresent, type ShellData } from './shell'

/**
 * The brand's subscribe pop-up for the browser, or null when the brand has no pop-up document (or, on ClearView, one
 * without interests): then no Subscribe button renders. Copy comes from the document only. Labels keep stega for
 * click-to-edit; keys, flags and the select lists are cleaned, since a native option cannot be clicked to edit and
 * stega would change its value. Country and Industry are Brevo's own options, passed in by the caller.
 */
export function toSubscribeModal(data: ShellData, brand: BrandKey, options: SubscribeOptions): SubscribeModalData | null {
  const doc = data.subscribeModal

  if (!doc) {
    return null
  }

  const text = Object.fromEntries(SUBSCRIBE_MODAL_TEXT_FIELDS.map((name) => [name, doc[name] ?? ''])) as SubscribeModalText

  text.countryPlaceholder = stegaClean(text.countryPlaceholder)
  text.industryPlaceholder = stegaClean(text.industryPlaceholder)

  // The token is matched on the cleaned text; stega sits at the end of the string, so it stays in `after`. Without the
  // token the link follows the text.
  const [before, ...rest] = stegaClean(text.consentText).includes(CONSENT_LINK_TOKEN)
    ? text.consentText.split(CONSENT_LINK_TOKEN)
    : [`${text.consentText} `]

  // ClearView offers a free choice: nothing is locked there, and its boxes start as the document ticks them. On a
  // publication the always ticked interests start ticked and the rest start empty.
  const chooseAny = brand === 'clearview'
  const interests = (doc.interests ?? [])
    .map((item) => {
      if (!stegaClean(item.label)?.trim()) {
        return null
      }

      const locked = !chooseAny && stegaClean(item.locked) === true

      return {
        key: stegaClean(item._key),
        label: item.label ?? '',
        locked,
        checked: locked || (chooseAny && stegaClean(item.defaultChecked) === true),
      }
    })
    .filter(isPresent)

  // ClearView needs one ticked interest to send, so without any the pop-up could never be sent: treated as missing.
  if (chooseAny && interests.length === 0) {
    return null
  }

  const toOptions = (values: string[]) => values.map((value) => ({ key: value, label: value }))

  return {
    text,
    consent: { before, after: rest.join(CONSENT_LINK_TOKEN), href: resolveHref(doc.privacyLink, brand) },
    interests,
    chooseAny,
    countries: toOptions(options.countries),
    industries: toOptions(options.industries),
  }
}
