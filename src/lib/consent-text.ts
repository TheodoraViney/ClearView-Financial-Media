import { stegaClean } from 'next-sanity'

import { CONSENT_LINK_TOKEN } from './subscribe'

/**
 * A form's consent text split around its `{link}` token, for the subscribe pop-up and the Contact form: the Privacy
 * Policy link goes between `before` and `after`. The token is matched on the cleaned text; stega sits at the end of
 * the string, so it stays in `after`. Without the token the link follows the text.
 */
export function splitConsentText(consentText: string): { before: string; after: string } {
  const [before = '', ...rest] = stegaClean(consentText).includes(CONSENT_LINK_TOKEN)
    ? consentText.split(CONSENT_LINK_TOKEN)
    : [`${consentText} `]

  return { before, after: rest.join(CONSENT_LINK_TOKEN) }
}
