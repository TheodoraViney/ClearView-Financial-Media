import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, EDITORIAL_BRAND_KEYS, isBrandKey } from '@/brands'

import { adminLabelField, headingField, headingText, imageField } from '../fields'

export const PUBLICATIONS_CARD_MAX = 3

const brandTitle = (key: unknown) =>
  typeof key === 'string' && isBrandKey(key) ? BRANDS[key].title : undefined

/**
 * Intro heading and text with a card per editorial publication. The card link
 * is not authored: the site renders "Visit {brand}" to that brand's origin.
 */
export const publications = defineType({
  name: 'publications',
  title: 'Publications',
  type: 'object',
  icon: EarthGlobeIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h1', required: true }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'cards',
      title: 'Publication cards',
      type: 'array',
      description: `Up to ${PUBLICATIONS_CARD_MAX}, one per publication.`,
      of: [
        defineArrayMember({
          name: 'publicationCard',
          title: 'Publication card',
          type: 'object',
          fields: [
            defineField({
              name: 'brand',
              title: 'Publication',
              type: 'string',
              options: {
                list: EDITORIAL_BRAND_KEYS.map((key) => ({ title: BRANDS[key].title, value: key })),
                layout: 'radio',
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
              validation: (Rule) => [
                Rule.required(),
                Rule.max(160).warning('Longer than 160 characters; the card will wrap onto more lines'),
              ],
            }),
            imageField('image', { required: true }),
          ],
          preview: {
            select: { brand: 'brand', description: 'description', media: 'image' },
            prepare({ brand, description, media }) {
              return {
                title: brandTitle(brand) ?? 'Choose a publication',
                subtitle: description,
                media,
              }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .max(PUBLICATIONS_CARD_MAX)
          .custom((cards) => {
            const seen = new Set<string>()

            for (const card of (cards as { brand?: string }[] | undefined) ?? []) {
              if (!card.brand) {
                continue
              }

              if (seen.has(card.brand)) {
                return `${brandTitle(card.brand) ?? card.brand} is chosen more than once`
              }

              seen.add(card.brand)
            }

            return true
          }),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', cards: 'cards' },
    prepare({ adminLabel, heading, cards }) {
      const count = Array.isArray(cards) ? cards.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Publications',
        subtitle: `Publications · ${count} ${count === 1 ? 'card' : 'cards'}`,
      }
    },
  },
})
