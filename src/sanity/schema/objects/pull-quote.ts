import { BlockquoteIcon } from '@sanity/icons/Blockquote'
import { defineField, defineType } from 'sanity'

/** A quotation set large between two rules inside an article, with the person or firm quoted under it. */
export const pullQuote = defineType({
  name: 'pullQuote',
  title: 'Pull quote',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      description: 'Without quotation marks: the site adds them.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cite',
      title: 'Quoted',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { quote: 'quote', cite: 'cite' },
    prepare({ quote, cite }) {
      return { title: quote || 'Pull quote', subtitle: cite, media: BlockquoteIcon }
    },
  },
})
