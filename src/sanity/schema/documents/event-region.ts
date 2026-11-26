import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { countryName, EVENT_COUNTRIES } from '@/lib/countries'

/*
 * A region of awards editions and conference events: the region on each row of the shared listings page and an option
 * of its Region filter, shown only when a record falls in it. The one source of the region names. Not the article
 * regions (Articles > Regions), which are countries a post covers.
 *
 * An event, and an edition whose programme sets no region, takes the region listing its country. A programme
 * (Awards > Programmes > Region) sets the region of all its editions, whatever the venue country; a region with no
 * countries, like Global, is reached that way only. See src/lib/regions.ts.
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
      description: 'Value of the Region filter in the page address, for example ?region=europe.',
      options: { source: 'title', maxLength: 48 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'countries',
      title: 'Countries',
      type: 'array',
      description:
        'Events and awards held in these countries fall in this region, unless their awards programme sets a region. A country belongs to one region at most. Leave empty for a region set on programmes only, like Global.',
      of: [defineArrayMember({ type: 'string', options: { list: EVENT_COUNTRIES } })],
      validation: (Rule) =>
        Rule.unique().custom(async (countries, context) => {
          if (!countries?.length) return true

          const id = context.document?._id.replace(/^drafts\./, '')
          const taken: { title: string | null; countries: string[] | null }[] = await context
            .getClient({ apiVersion: '2025-01-01' })
            .fetch(
              `*[_type == "eventRegion" && !(_id in [$id, "drafts." + $id]) && !(_id in path("drafts.**"))]{ title, countries }`,
              { id },
            )
          const clashes = (countries as string[]).flatMap((code) => {
            const other = taken.find((region) => region.countries?.includes(code))
            return other ? [`${countryName(code) ?? code} (in ${other.title ?? 'another region'})`] : []
          })

          return clashes.length ? `Already in another region: ${clashes.join(', ')}.` : true
        }),
    }),
  ],
  orderings: [{ title: 'Title', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', countries: 'countries' },
    prepare: ({ title, countries }: { title?: string; countries?: string[] }) => ({
      title,
      subtitle: countries?.length ? `${countries.length} countries` : 'Set on programmes only',
    }),
  },
})
