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
 * Studio: tabs Company and Profile page. Fields the site never shows (map location, phone, categories, legacy id) sit in
 * a collapsed "Not shown on the site" fieldset; the data is kept.
 *
 * Company profile: a company referenced by an awards edition, an event or a post has a public page at /companies/{slug}
 * on ClearView Publishing (COMPANY_HAS_PROFILE in src/sanity/fragments.ts). The "Company profile page" fields are optional by
 * design, most companies have no such content: each section of the page is hidden when its field is empty. The page
 * also shows the name, logo, About and website from the main fields, and derives its activity and recognition from the
 * editions and events that name the company, so those have no field here.
 */
export const company = defineType({
  name: 'company',
  title: 'Company',
  type: 'document',
  icon: CaseIcon,
  groups: [
    { name: 'company', title: 'Company', default: true },
    { name: 'profile', title: 'Profile page' },
  ],
  fieldsets: [
    { name: 'legacy', title: 'Not shown on the site', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      group: 'company',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'company',
      options: { source: 'title', maxLength: 96 },
      description: 'The profile page exists only while an edition, event or post names the company.',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'company',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'websiteUrl',
      title: 'Website',
      type: 'url',
      group: 'company',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'richText',
      group: 'company',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 3,
      group: 'company',
      description: 'Shown on event pages when the company is the venue.',
    }),
    defineField({
      name: 'googleMapLocation',
      title: 'Map location',
      type: 'string',
      group: 'company',
      fieldset: 'legacy',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Phone number',
      type: 'string',
      group: 'company',
      fieldset: 'legacy',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      group: 'company',
      fieldset: 'legacy',
      validation: (Rule) => Rule.unique(),
    }),
    imageField('profileImage', {
      title: 'Profile image',
      group: 'profile',
      description: 'Without it the header shows the logo.',
    }),
    defineField({
      name: 'profileMetrics',
      title: 'At a glance figures',
      type: 'array',
      group: 'profile',
      of: [keyFindingMember()],
      validation: (Rule) => Rule.max(PROFILE_METRICS_MAX),
    }),
    defineField({
      name: 'profileFields',
      title: 'Clients and platform rows',
      type: 'array',
      group: 'profile',
      description: 'For example "Client types": Family offices, Private banks.',
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
      of: [linkRowMember({ title: 'Interview' })],
    }),
    defineField({
      name: 'awardsArchiveTitles',
      title: 'Awards archive coverage',
      type: 'array',
      group: 'profile',
      description: 'Shown as plain text, not links.',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
    }),
    defineField({
      name: 'officialLinks',
      title: 'Official links',
      type: 'array',
      group: 'profile',
      of: [linkRowMember({ title: 'Link' })],
    }),
    { ...legacyWpIdField, group: 'company', fieldset: 'legacy' },
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
