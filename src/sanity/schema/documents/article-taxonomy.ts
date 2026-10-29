import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { FolderIcon } from '@sanity/icons/Folder'
import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

/*
 * The three ways a post is classified, all shared by every brand and edited in
 * the Studio under Articles:
 *
 * - category: exactly one per post (Comment & Analysis, News, News from
 *   Compliance Matters, People Moves). Plays the role of the legacy article type.
 * - topic: one primary and up to three secondary per post.
 * - region: People Moves posts only.
 *
 * Created once with the values in the design. The legacy site used more
 * categories and regions, so editors may extend the lists here. Category ids
 * the schema relies on come from `src/lib/article-taxonomy.ts`.
 */

const titleField = defineField({
  name: 'title',
  title: 'Title',
  type: 'string',
  validation: (Rule) => Rule.required(),
})

const slugField = defineField({
  name: 'slug',
  title: 'Slug',
  type: 'slug',
  description: 'Used in the address of the filtered articles list.',
  options: { source: 'title', maxLength: 96 },
  validation: (Rule) => Rule.required(),
})

const descriptionField = defineField({
  name: 'description',
  title: 'Description',
  type: 'text',
  rows: 3,
  description: 'Optional. Introduction for the articles list filtered by this entry.',
})

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: FolderIcon,
  fields: [titleField, slugField, descriptionField],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
})

export const topic = defineType({
  name: 'topic',
  title: 'Topic',
  type: 'document',
  icon: TagIcon,
  fields: [titleField, slugField, descriptionField],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
})

export const region = defineType({
  name: 'region',
  title: 'Region',
  type: 'document',
  icon: EarthGlobeIcon,
  fields: [titleField, slugField],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
})
