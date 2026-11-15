// Visible copy of the newsletter email, shared by the brand schema (Studio) and the email renderer (server).
// No server or Studio imports here.

/** Stands for the publication's title in the footer sentence. */
export const NEWSLETTER_TITLE_PLACEHOLDER = '{title}'

/**
 * Default copy of the newsletter email: the `initialValue` of the Brand settings → Newsletter → Email copy fields.
 * An empty field hides its element in the email; only `unsubscribe` falls back to its default, since every email must
 * carry the unsubscribe link.
 */
export const NEWSLETTER_COPY_DEFAULTS = {
  featuredLabel: 'Featured',
  readFullStory: 'Read the full story',
  readMore: 'Read more →',
  advertisementLabel: 'Advertisement',
  footerText: `You are receiving this email because you subscribed to the ${NEWSLETTER_TITLE_PLACEHOLDER} daily briefing.`,
  unsubscribe: 'Unsubscribe',
} as const

export type NewsletterCopy = Record<keyof typeof NEWSLETTER_COPY_DEFAULTS, string>
