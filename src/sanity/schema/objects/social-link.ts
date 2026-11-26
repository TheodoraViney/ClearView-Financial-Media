import { ShareIcon } from '@sanity/icons/Share'
import { defineField, defineType } from 'sanity'

/** One social network in the footer, defined by the editor: its name, icon and profile address. */
export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  icon: ShareIcon,
  fieldsets: [{ name: 'link', title: 'Link', options: { columns: 2 } }],
  fields: [
    defineField({
      name: 'name',
      title: 'Network name',
      type: 'string',
      fieldset: 'link',
      description: 'Screen readers announce it as the link text.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      fieldset: 'link',
      validation: (Rule) => Rule.required().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'image',
      // Only its shape is used, on a transparent background.
      description: 'One colour, SVG preferred: the brand colour is applied.',
      options: { accept: 'image/svg+xml,image/png' },
      validation: (Rule) => Rule.required(),
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
