import { CaseIcon } from '@sanity/icons/Case'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { altField, legacyWpIdField } from '../fields'

/**
 * A Company. Sponsor, venue, winner, partner and technology demonstrator are
 * roles a Company plays, not separate types.
 *
 * 1,451 come from the Pods `companies` CPT. A further 543 are created from
 * winner names that have no company record: a card carrying only a name is the
 * expected state, the publisher's team fills the rest in.
 *
 * The company-to-person relation is stored once, on person.companies. Pods
 * keeps it in `wp_podsrel`, which WXR never exports, so it was read from both
 * screens: all 1,548 pairs on the company side are also present on the person
 * side. Storing it twice would mean keeping two lists in sync by hand.
 */
export const company = defineType({
  name: 'company',
  title: 'Company',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description:
        'No public URL today, companies exist only as links from events. Kept so the Phase 2 entity layer is not blocked.',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'websiteUrl',
      title: 'Website',
      type: 'url',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'richText',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'googleMapLocation',
      title: 'Map location',
      type: 'string',
      description: 'Address as typed into the legacy Google Maps field.',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Phone number',
      type: 'string',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      description:
        'From the `company_category` taxonomy. A field, not a document: these terms have no public URL.',
      validation: (Rule) => Rule.unique(),
    }),
    legacyWpIdField,
  ],
  preview: {
    select: { title: 'title', website: 'websiteUrl', media: 'logo' },
    prepare({ title, website, media }) {
      return {
        title: title || 'Untitled company',
        subtitle: website ? website.replace(/^https?:\/\//, '') : 'No website',
        media,
      }
    },
  },
})
