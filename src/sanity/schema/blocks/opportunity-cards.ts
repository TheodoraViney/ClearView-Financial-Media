import { DashboardIcon } from '@sanity/icons/Dashboard'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { OPPORTUNITY_CARD_ICONS } from '@/lib/opportunity-cards'

import { adminLabelField, headingField, headingText, linkField } from '../fields'
import { ENQUIRY_FORM_DEFAULT_ANCHOR } from './enquiry-form'

export const OPPORTUNITY_CARDS_MAX = 4
export const OPPORTUNITY_BENEFITS_MAX = 6

const iconTitle = (value: unknown) => OPPORTUNITY_CARD_ICONS.find((icon) => icon.value === value)?.title

/** Heading and up to four opportunity cards: icon, label, card heading, text, a list of benefits and a link. */
export const opportunityCards = defineType({
  name: 'opportunityCards',
  title: 'Opportunity cards',
  type: 'object',
  icon: DashboardIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      description: `Up to ${OPPORTUNITY_CARDS_MAX}, in display order.`,
      of: [
        defineArrayMember({
          name: 'opportunityCard',
          title: 'Card',
          type: 'object',
          fields: [
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: OPPORTUNITY_CARD_ICONS.map(({ value, title }) => ({ value, title })),
                layout: 'dropdown',
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Short coloured line above the card heading, e.g. "Awards".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'heading',
              title: 'Card heading',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'copy',
              title: 'Text',
              type: 'text',
              rows: 3,
              validation: (Rule) => [
                Rule.required(),
                Rule.max(200).warning('Longer than 200 characters; the card will grow taller than its neighbours'),
              ],
            }),
            defineField({
              name: 'benefits',
              title: 'Benefits',
              type: 'array',
              description: `Up to ${OPPORTUNITY_BENEFITS_MAX} short lines, in display order.`,
              of: [defineArrayMember({ type: 'string' })],
              validation: (Rule) => Rule.required().min(1).max(OPPORTUNITY_BENEFITS_MAX),
            }),
            linkField({
              title: 'Link',
              description: `To scroll to the enquiry form on this page, choose Web address and enter #${ENQUIRY_FORM_DEFAULT_ANCHOR} (the form's anchor id). An email link is mailto:name@example.com.`,
              required: true,
              labelRequired: true,
              allowAnchor: true,
            }),
          ],
          preview: {
            select: { label: 'label', heading: 'heading', icon: 'icon' },
            prepare({ label, heading, icon }) {
              return {
                title: heading || 'Empty card',
                subtitle: [label, iconTitle(icon)].filter(Boolean).join(' · ') || undefined,
              }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(OPPORTUNITY_CARDS_MAX),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', cards: 'cards' },
    prepare({ adminLabel, heading, cards }) {
      const count = Array.isArray(cards) ? cards.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Opportunity cards',
        subtitle: `Opportunity cards · ${count} ${count === 1 ? 'card' : 'cards'}`,
      }
    },
  },
})
