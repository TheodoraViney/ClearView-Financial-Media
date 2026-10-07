import { ChevronDownIcon } from '@sanity/icons/ChevronDown'
import { defineArrayMember, defineField, defineType } from 'sanity'

/** A header menu item that opens a dropdown of links. */
export const navGroup = defineType({
  name: 'navGroup',
  title: 'Dropdown',
  type: 'object',
  icon: ChevronDownIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Menu text that opens the dropdown.',
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
    select: { label: 'label', links: 'links' },
    prepare({ label, links }) {
      const count = Array.isArray(links) ? links.length : 0

      return {
        title: label || 'Untitled dropdown',
        subtitle: `Dropdown · ${count} ${count === 1 ? 'link' : 'links'}`,
        media: ChevronDownIcon,
      }
    },
  },
})
