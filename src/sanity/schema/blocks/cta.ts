import { defineField, defineType } from 'sanity'

import { isAllowedLinkTarget } from '@/lib/links'

export const cta = defineType({
  name: 'cta',
  title: 'CTA',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'text',
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'object',
      fields: [
        defineField({
          name: 'label',
          title: 'Label',
          type: 'string',
        }),
        defineField({
          name: 'href',
          title: 'Href',
          type: 'string',
          description: 'https://…, mailto:…, tel:… or a path on this site starting with /',
          validation: (Rule) =>
            Rule.custom((value) => {
              if (!value) {
                return true
              }

              // A bare startsWith('/') let "//evil.com" through, which browsers treat as another host.
              return isAllowedLinkTarget(value.trim())
                ? true
                : 'Use https://, http://, mailto:, tel: or a path starting with a single /'
            }),
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'heading',
    },
  },
})
