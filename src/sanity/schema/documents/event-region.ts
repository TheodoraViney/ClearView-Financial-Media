import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { defineField, defineType } from 'sanity'

/*
 * A region of awards editions and conference events: the region on each row of the shared listings page and an option
 * of its Region filter, shown only when a record falls in it. The one source of the region names. Not the article
 * regions (Articles > Regions), which are countries a post covers.
 *
 * A programme (Awards > Programmes > Region) sets the region of all its editions. An event takes the region of its
 * country from the table in code (src/lib/regions.ts), which names regions by slug: europe, mena, asia, north-america.
 */
export const eventRegion = defineType({
  name: 'eventRegion',
  title: 'Event region',
  type: 'document',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown on each award and event in this region on the listings page, and as a Region filter option.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Value of the Region filter in the page address, for example ?region=europe. Events find their region by this slug (europe, mena, asia, north-america): do not change those four.',
      options: { source: 'title', maxLength: 48 },
      validation: (Rule) => Rule.required(),
    }),
  ],
  orderings: [{ title: 'Title', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
})
