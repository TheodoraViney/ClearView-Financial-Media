import { defineField, type ConditionalPropertyCallback, type ImageRule } from 'sanity'

import { NEWSLETTER_BANNERS, type NewsletterBannerSlot } from '@/lib/newsletter-banners'

/*
 * The image and link of a newsletter sponsor banner, used by Brand settings → Newsletter (every issue's default) and by
 * a newsletter issue's own banner.
 */

// `image-<hash>-<width>x<height>-<ext>`, the original pixel size in the asset id.
const ASSET_SIZE = /-(\d+)x(\d+)-[a-z0-9]+$/

/** A warning when the image is not in the place's proportions or is smaller than it shows. */
const sizeWarning = (slot: NewsletterBannerSlot) => (Rule: ImageRule) =>
  Rule.custom((value: { asset?: { _ref?: string } } | undefined) => {
    const match = ASSET_SIZE.exec(value?.asset?._ref ?? '')

    if (!match) {
      return true
    }

    const { width, height } = NEWSLETTER_BANNERS[slot]
    const [imageWidth, imageHeight] = [Number(match[1]), Number(match[2])]

    if (Math.abs(imageWidth / imageHeight - width / height) > 0.05 * (width / height)) {
      return `This image is ${imageWidth} × ${imageHeight}; the banner is ${width} × ${height}, so it will show taller or shorter than designed.`
    }

    return imageWidth < width ? `Upload at least ${width} × ${height}, ideally ${width * 2} × ${height * 2}, for sharp screens.` : true
  }).warning()

export const bannerFields = (
  slot: NewsletterBannerSlot,
  { hidden, required }: { hidden?: ConditionalPropertyCallback; required?: (parent: unknown) => boolean } = {},
) => {
  const { width, height } = NEWSLETTER_BANNERS[slot]
  const requiredMessage = (field: string) => (value: unknown, context: { parent?: unknown }) =>
    value || !required?.(context.parent) ? true : `Add the ${field}`

  return [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: `${width} × ${height}, or ${width * 2} × ${height * 2} for sharp screens. JPG, PNG or GIF; an animated GIF goes out unchanged (Outlook on Windows shows its first frame).`,
      options: { accept: 'image/jpeg,image/png,image/gif' },
      hidden,
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Shown when the reader\'s email app blocks images, e.g. "FWR Awards 2027: register now".',
        }),
      ],
      validation: (Rule) => [Rule.custom(requiredMessage('image')), sizeWarning(slot)(Rule)],
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description:
        'Where the banner leads. From an Ad Manager creative, copy the address after %%CLICK_URL_UNESC%%.',
      hidden,
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }).custom(requiredMessage('link')),
    }),
  ]
}
