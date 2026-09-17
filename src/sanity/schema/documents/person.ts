import { UserIcon } from '@sanity/icons/User'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { altField, legacyWpIdField } from '../fields'

/**
 * A Person. One type for judges, speakers, chairs and resource authors: the
 * source keeps a single `people` CPT and the same record appears in several
 * roles across events.
 *
 * 1,558 records from the Pods `people` CPT.
 *
 * The source also carries `pods_meta_email` on 10 of 1,558 records. It is
 * deliberately not modelled: the site reads published documents anonymously so
 * they stay CDN-cacheable, which would publish those addresses. Raise it with
 * the client if they need contact details held in the CMS.
 */
export const person = defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Full name',
      type: 'string',
      description: 'As it appears on event pages. Kept alongside the name parts, which are the source of truth for sorting.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'firstName',
      title: 'First name',
      type: 'string',
    }),
    defineField({
      name: 'lastName',
      title: 'Last name',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description:
        'No public URL today, people exist only as links from events. Kept so the Phase 2 entity layer is not blocked.',
    }),
    defineField({
      name: 'jobTitle',
      title: 'Job title',
      type: 'string',
    }),
    defineField({
      name: 'companies',
      title: 'Companies',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'company' }] })],
      description: '33 people are attached to more than one company in the source.',
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'richText',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      description:
        'From the `people_category` taxonomy. A field, not a document: these terms have no public URL.',
      validation: (Rule) => Rule.unique(),
    }),
    legacyWpIdField,
  ],
  preview: {
    select: {
      title: 'title',
      jobTitle: 'jobTitle',
      company: 'companies.0.title',
      media: 'photo',
    },
    prepare({ title, jobTitle, company, media }) {
      return {
        title: title || 'Unnamed person',
        subtitle: [jobTitle, company].filter(Boolean).join(', ') || 'No job title',
        media,
      }
    },
  },
})
