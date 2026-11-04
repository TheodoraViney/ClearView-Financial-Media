import type { SelectOption } from '@/components/ui/Select'
import type { SubscribeModalTextField } from '@/lib/subscribe'

/** The copy fields of the pop-up as the page gets them, from its document. */
export type SubscribeModalText = Record<SubscribeModalTextField, string>

// `checked`: ticked when the pop-up opens, unless the opener names its own ticks.
export type SubscribeInterestOption = { key: string; label: string; locked: boolean; checked: boolean }

/**
 * What the browser gets for a brand's pop-up: copy, interest keys with their labels, Brevo's Country and Industry
 * option texts, and the privacy link. No Brevo attribute name, list or template.
 */
export type SubscribeModalData = {
  text: SubscribeModalText
  // The consent text split around the Privacy Policy link; `href` is null when the link has no route.
  consent: { before: string; after: string; href: string | null }
  interests: SubscribeInterestOption[]
  // ClearView: no heading above the interests, none always ticked, and at least one must be ticked.
  chooseAny: boolean
  countries: SelectOption[]
  industries: SelectOption[]
}

/**
 * Filled in from ClearView "Stay informed": its email, and the interest keys to tick in place of the defaults (the
 * pop-up's interests that set the same Brevo attributes as the block's ticked options).
 */
export type SubscribePrefill = { email?: string; interests?: string[] }

export type SubscribeOpenOptions = {
  // Where focus goes when the pop-up closes; else the element focused before it opened.
  returnFocus?: HTMLElement | null
  prefill?: SubscribePrefill
}
