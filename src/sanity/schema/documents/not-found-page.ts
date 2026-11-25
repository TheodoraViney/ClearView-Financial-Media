import { ErrorOutlineIcon } from '@sanity/icons/ErrorOutline'
import { defineField, defineType } from 'sanity'

import { NOT_FOUND_COPY } from '@/lib/not-found-copy'

/*
 * The not-found page's texts: one document for every brand with the fixed id NOT_FOUND_PAGE_ID from `src/brands.ts`,
 * opened as "404 page" at the top level of the Studio. The header, footer and colours come from the brand the
 * visitor is on; the button always leads to that brand's home page.
 */
export const notFoundPage = defineType({
  name: 'notFoundPage',
  title: '404 page',
  type: 'document',
  icon: ErrorOutlineIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      description: 'Shown under the large 404 and as the browser tab title.',
      initialValue: NOT_FOUND_COPY.title,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Text',
      type: 'text',
      rows: 3,
      description: 'One or two sentences under the heading.',
      initialValue: NOT_FOUND_COPY.description,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'buttonLabel',
      title: 'Button label',
      type: 'string',
      description: 'The button leads to the home page of the brand the visitor is on.',
      initialValue: NOT_FOUND_COPY.buttonLabel,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: '404 page', media: ErrorOutlineIcon }),
  },
})
