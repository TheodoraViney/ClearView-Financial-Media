import { defineField, defineType } from 'sanity'

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
          validation: (Rule) =>
            Rule.custom((value) => {
              if (!value) {
                return true
              }

              if (
                value.startsWith('/') ||
                value.startsWith('http://') ||
                value.startsWith('https://')
              ) {
                return true
              }

              return 'Link must be a relative path or an http(s) URL'
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
