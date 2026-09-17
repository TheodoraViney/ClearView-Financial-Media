import { InlineIcon } from '@sanity/icons/Inline'
import { defineField, defineType } from 'sanity'

/**
 * A free-form extra tab on an event page.
 *
 * `cyph_custom_tabs` on 14 events, all of them conference events. Editors use
 * it for one-off sections such as "Webinar Information".
 */
export const customTab = defineType({
  name: 'customTab',
  title: 'Custom tab',
  type: 'object',
  icon: InlineIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Tab name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Tab content',
      type: 'richText',
    }),
  ],
  preview: {
    select: { name: 'name' },
    prepare({ name }) {
      return { title: name || 'Unnamed tab', subtitle: 'Custom tab' }
    },
  },
})
