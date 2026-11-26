import { SearchIcon } from '@sanity/icons/Search'
import { defineField, defineType } from 'sanity'

/** Soft limits: search engines cut longer titles and descriptions. */
export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 160

/**
 * A page's search and share overrides: meta title, meta description and share image, all optional. The field using
 * it says in one line what empty fields fall back to. A filled title replaces the whole <title>, without the
 * " | {brand}" suffix.
 */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  icon: SearchIcon,
  options: { collapsible: false },
  fields: [
    defineField({
      name: 'title',
      title: 'Meta title',
      type: 'string',
      description: 'Used as written, no site name added.',
      validation: (Rule) =>
        Rule.max(SEO_TITLE_MAX).warning(`Search engines may cut titles longer than about ${SEO_TITLE_MAX} characters.`),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: (Rule) =>
        Rule.max(SEO_DESCRIPTION_MAX).warning(
          `Search engines may cut descriptions longer than about ${SEO_DESCRIPTION_MAX} characters.`,
        ),
    }),
    defineField({
      name: 'image',
      title: 'Share image',
      type: 'image',
      description: 'Cut to 1200×630 around the hotspot.',
      options: { hotspot: true },
    }),
  ],
})
