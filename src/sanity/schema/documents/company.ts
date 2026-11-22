import { CaseIcon } from '@sanity/icons/Case'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { PROFILE_METRICS_MAX } from '@/lib/partner-profile-copy'

import { altField, imageField, keyFindingMember, legacyWpIdField, linkRowMember } from '../fields'

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
 *
 * Partner profile: a company referenced by an awards edition, an event or a post has a public page at /companies/{slug}
 * on ClearView Publishing (COMPANY_HAS_PROFILE in src/sanity/fragments.ts). The "Profile page" fields are optional by
 * design, most companies have no such content: each section of the page is hidden when its field is empty. The page
 * also shows the name, logo, About and website from the main fields, and derives its activity and recognition from the
 * editions and events that name the company, so those have no field here.
 */
export const company = defineType({
  name: 'company',
  title: 'Company',
  type: 'document',
  icon: CaseIcon,
  groups: [{ name: 'profile', title: 'Profile page' }],
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
        'Address of the partner profile page, /companies/{slug} on ClearView Publishing. The page exists only while an awards edition, an event or a post names the company.',
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
      description: 'Shown as the description beside the image on the partner profile page.',
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
    imageField('profileImage', {
      title: 'Profile image',
      group: 'profile',
      description: 'Optional. Large image in the header of the partner profile page. Without it the logo is shown there, and without a logo the name.',
    }),
    defineField({
      name: 'profileMetrics',
      title: 'At a glance figures',
      type: 'array',
      group: 'profile',
      description: `Optional. Up to ${PROFILE_METRICS_MAX} figures in a row under the header. Hidden when empty.`,
      of: [keyFindingMember({ textExample: 'clients in 26 countries' })],
      validation: (Rule) => Rule.max(PROFILE_METRICS_MAX),
    }),
    defineField({
      name: 'profileFields',
      title: 'Clients and platform rows',
      type: 'array',
      group: 'profile',
      description:
        'Optional. Rows of a label and a list of values, for example "Client types" with "Family offices", "Private banks". Hidden when empty.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'profileField',
          title: 'Row',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'values',
              title: 'Values',
              type: 'array',
              of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: { title: 'label', values: 'values' },
            prepare({ title, values }) {
              return { title: title || 'Untitled row', subtitle: ((values as string[] | undefined) ?? []).join(', ') }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'sponsorInterviews',
      title: 'Sponsor interviews',
      type: 'array',
      group: 'profile',
      description:
        'Optional. Links to interviews with the company, for example an archived article. Shown under Sponsor and editorial coverage, hidden when empty.',
      of: [linkRowMember({ title: 'Interview', labelDescription: 'The interview title as shown on the page.' })],
    }),
    defineField({
      name: 'awardsArchiveTitles',
      title: 'Awards archive coverage',
      type: 'array',
      group: 'profile',
      description:
        'Optional. Titles of archived awards articles about the company, shown as plain text (not links) under Sponsor and editorial coverage. Hidden when empty.',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
    }),
    defineField({
      name: 'officialLinks',
      title: 'Official links',
      type: 'array',
      group: 'profile',
      description: "Optional. Links to the company's own pages, for example customer stories or a contact page. Hidden when empty.",
      of: [linkRowMember({ title: 'Link', labelDescription: 'Link text, for example "Contact WIZE".' })],
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
