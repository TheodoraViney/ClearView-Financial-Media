import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, linkField } from '../fields'

/**
 * A publication's newsletter call to action: heading, a short description and one button that opens the subscribe
 * pop-up. Not the ClearView "Stay informed" form (`newsletterSignup`).
 */
export const subscribeBanner = defineType({
  name: 'subscribeBanner',
  title: 'Subscribe banner',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Stay informed', required: true }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      initialValue: 'Get the latest WealthBriefing news, analysis, research and event updates in your inbox.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the banner will wrap onto more lines'),
      ],
    }),
    defineField({
      name: 'buttonLabel',
      title: 'Button label',
      type: 'string',
      description: 'Label of the button that opens the subscribe pop-up.',
      initialValue: 'Subscribe to the daily newsletter',
      validation: (Rule) => Rule.required(),
    }),
    // Replaced by buttonLabel: the button opens the pop-up, so it has no target. Read by the site until the label is
    // copied over and this field cleared on every banner, then removed.
    defineField({
      ...linkField({ name: 'cta', title: 'Button link (old)' }),
      deprecated: { reason: 'The button opens the subscribe pop-up; its label is Button label above.' },
      readOnly: true,
      hidden: ({ value }) => value === undefined,
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      return {
        title: adminLabel || headingText(heading) || 'Subscribe banner',
        subtitle: `Subscribe banner · ${headingText(heading) ?? 'No heading'}`,
      }
    },
  },
})
