import { ShareIcon } from '@sanity/icons/Share'
import { defineField, defineType } from 'sanity'

/** One social network in the footer, defined by the editor: its name, icon and profile address. */
export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  icon: ShareIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Network name, e.g. "LinkedIn". Screen readers announce it as the link text.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'image',
      description:
        'One-colour icon on a transparent background, SVG preferred. Only its shape is used: the colour comes from the brand.',
      options: { accept: 'image/svg+xml,image/png' },
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
    select: { name: 'name', url: 'url', icon: 'icon' },
    prepare({ name, url, icon }) {
      return {
        title: name || 'No name',
        subtitle: url || 'No URL',
        media: icon?.asset ? icon : ShareIcon,
      }
    },
  },
})
