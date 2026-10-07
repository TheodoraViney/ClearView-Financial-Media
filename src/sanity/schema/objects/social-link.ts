import { ShareIcon } from '@sanity/icons/Share'
import { defineField, defineType } from 'sanity'

export const SOCIAL_PLATFORMS = [
  { value: 'youtube', title: 'YouTube' },
  { value: 'linkedin', title: 'LinkedIn' },
  { value: 'x', title: 'X' },
] as const

/** One social network icon in the footer: which network and its profile address. */
export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  icon: ShareIcon,
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      description: 'Picks the icon and its screen-reader name.',
      options: { list: [...SOCIAL_PLATFORMS], layout: 'radio', direction: 'horizontal' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Profile address, starting with https://.',
      validation: (Rule) => Rule.required().uri({ scheme: ['https'] }),
    }),
  ],
  preview: {
    select: { platform: 'platform', url: 'url' },
    prepare({ platform, url }) {
      const match = SOCIAL_PLATFORMS.find((item) => item.value === platform)

      return {
        title: match?.title ?? 'No platform',
        subtitle: url || 'No URL',
        media: ShareIcon,
      }
    },
  },
})
