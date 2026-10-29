import { ThListIcon } from '@sanity/icons/ThList'
import { defineArrayMember, defineField, defineType } from 'sanity'

const FACT_BOX_VARIANTS = [
  { title: 'Filled', value: 'surface' },
  { title: 'Outlined', value: 'outline' },
]

/** "At a Glance": a short list of labelled facts summarising the article, placed between paragraphs. */
export const factBox = defineType({
  name: 'factBox',
  title: 'At a glance',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'At a Glance',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'facts',
      title: 'Facts',
      type: 'array',
      description: 'Each fact is a short label and its value, for example "Market" and "Nordic wealth management".',
      of: [
        defineArrayMember({
          name: 'fact',
          title: 'Fact',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'text',
              rows: 2,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Shown under the facts, for example "Summarised from this article."',
    }),
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      options: { list: FACT_BOX_VARIANTS, layout: 'radio', direction: 'horizontal' },
      initialValue: 'surface',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', facts: 'facts' },
    prepare({ title, facts }) {
      const count = Array.isArray(facts) ? facts.length : 0

      return {
        title: title || 'At a glance',
        subtitle: `${count} ${count === 1 ? 'fact' : 'facts'}`,
        media: ThListIcon,
      }
    },
  },
})
