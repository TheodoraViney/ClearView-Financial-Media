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
 * Studio: the full name, job title, companies, photo and biography are what the site shows. First and last name,
 * slug, categories and the legacy id sit in a collapsed "Not shown on the site" fieldset; the data is kept.
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
  fieldsets: [
    { name: 'legacy', title: 'Not shown on the site', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Full name',
      type: 'string',
      validation: (Rule) => Rule.required(),
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
      name: 'firstName',
      title: 'First name',
      type: 'string',
      fieldset: 'legacy',
    }),
    defineField({
      name: 'lastName',
      title: 'Last name',
      type: 'string',
      fieldset: 'legacy',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      fieldset: 'legacy',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      fieldset: 'legacy',
      validation: (Rule) => Rule.unique(),
    }),
    { ...legacyWpIdField, fieldset: 'legacy' },
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
