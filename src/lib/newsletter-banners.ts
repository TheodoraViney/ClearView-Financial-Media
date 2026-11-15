// The sponsor banners of the newsletter email, shared by the Studio schema and the email renderer (server).
// No server or Studio imports here.

/**
 * The two banner places of the design: Banner 1 under the header, Banner 2 under the articles. The size is the design
 * size; Banner 1 shows at the email's content width (552 px), Banner 2 at its own width up to 300 px.
 */
export const NEWSLETTER_BANNERS = {
  topBanner: { title: 'Banner 1', width: 600, height: 100, where: 'under the header' },
  bottomBanner: { title: 'Banner 2', width: 300, height: 250, where: 'under the articles' },
} as const

export type NewsletterBannerSlot = keyof typeof NEWSLETTER_BANNERS

export const NEWSLETTER_BANNER_SLOTS = Object.keys(NEWSLETTER_BANNERS) as NewsletterBannerSlot[]

/** What an issue shows in a banner place: the brand's banner, its own, or none. */
export const ISSUE_BANNER_CHOICES = [
  { title: 'Brand banner', value: 'brand' },
  { title: 'Own banner', value: 'own' },
  { title: 'No banner', value: 'none' },
] as const

export type IssueBannerChoice = (typeof ISSUE_BANNER_CHOICES)[number]['value']
