import { ThListIcon } from '@sanity/icons/ThList'
import { defineArrayMember, defineField, defineType } from 'sanity'

/** One footer link column: a plain title over a list of links. */
export const footerColumn = defineType({
  name: 'footerColumn',
  title: 'Column',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Text above the links.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({ type: 'navLink' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'title', links: 'links' },
    prepare({ title, links }) {
      const count = Array.isArray(links) ? links.length : 0

      return {
        title: title || 'Untitled column',
        subtitle: `${count} ${count === 1 ? 'link' : 'links'}`,
        media: ThListIcon,
      }
    },
  },
})
