import { ThListIcon } from '@sanity/icons/ThList'
import { defineField, defineType } from 'sanity'

import { emptyTextError, RECORD_LISTING_TYPE_TOKEN, type RecordListingCopyKey } from '@/lib/record-listing-copy'
import { SHARED_LISTINGS_PAGE_DOCUMENT_ID } from '@/lib/shared-listings'

import { adminLabelField } from '../fields'

/*
 * The awards, events and research lists of the shared listings page (ClearView): tabs, Region / Year / Status filters,
 * the records and the pagination. The records come from the awards editions, conference events and research reports
 * themselves; the route picks the tab from its path. This block holds every visible label. The awards status labels
 * are the awards programme page's (its Statuses tab), the one source for every awards page.
 * The design texts are the fields' initial values only: the page renders what is stored.
 */

const label = (
  name: RecordListingCopyKey,
  title: string,
  fieldset: string,
  initialValue: string,
  description?: string,
) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    fieldset,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

const onSharedListingsPage = (document: unknown) =>
  String((document as { _id?: string } | undefined)?._id ?? '').replace(/^drafts\./, '') === SHARED_LISTINGS_PAGE_DOCUMENT_ID

export const recordListing = defineType({
  name: 'recordListing',
  title: 'Awards, events and research list',
  type: 'object',
  icon: ThListIcon,
  // Only the shared listings page's routes give the block its records and tab: anywhere else it would render nothing.
  validation: (Rule) =>
    Rule.custom((_value, context) =>
      onSharedListingsPage(context.document) ? true : 'This block works on the shared listings page only',
    ),
  fieldsets: [
    // Tab paths: Awards /events-category/awards; Events /events-category/summits, /briefings and /webinar together;
    // Research /resource-categories/research.
    { name: 'tabs', title: 'Tabs', options: { columns: 3 } },
    { name: 'filters', title: 'Filters', options: { collapsible: true, collapsed: true, columns: 2 } },
    {
      name: 'statuses',
      title: 'Event and research statuses',
      options: { collapsible: true, collapsed: true, columns: 3 },
    },
    { name: 'empty', title: 'Empty state', options: { collapsible: true, collapsed: true, columns: 2 } },
    {
      name: 'emptyNouns',
      title: 'Empty state nouns',
      description: `Replaces ${RECORD_LISTING_TYPE_TOKEN} in the empty state text.`,
      options: { collapsible: true, collapsed: true, columns: 3 },
    },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    label('awardsTabLabel', 'Awards', 'tabs', 'Awards'),
    label('eventsTabLabel', 'Events', 'tabs', 'Events'),
    label('researchTabLabel', 'Research', 'tabs', 'Research'),

    label('regionFilterLabel', 'Region', 'filters', 'Region', 'Options: the Event regions that have records.'),
    label('yearFilterLabel', 'Year', 'filters', 'Year'),
    label('statusFilterLabel', 'Status', 'filters', 'Status', 'Awards options come from Awards page texts.'),
    label('allOptionLabel', 'All option', 'filters', 'All'),
    label('clearFiltersLabel', 'Clear filters link', 'filters', 'Clear filters'),

    // Upcoming: the event's last day is today or later. Each label also names its status filter option.
    label('upcomingEventLabel', 'Upcoming event', 'statuses', 'Upcoming'),
    label('pastEventLabel', 'Past event', 'statuses', 'Past'),
    label('publishedLabel', 'Published research', 'statuses', 'Published'),

    label('emptyHeading', 'Heading', 'empty', 'No records match these filters'),
    defineField({
      name: 'emptyText',
      title: 'Text',
      type: 'string',
      fieldset: 'empty',
      description: `${RECORD_LISTING_TYPE_TOKEN} becomes the open tab's noun, set below; use it once.`,
      initialValue: `Try a different combination, or clear the filters to see every ${RECORD_LISTING_TYPE_TOKEN}.`,
      validation: (Rule) => Rule.required().custom((value: string | undefined) => emptyTextError(value) ?? true),
    }),
    label('emptyButtonLabel', 'Button', 'empty', 'Clear filters'),
    label('emptyAwardNoun', 'Awards', 'emptyNouns', 'award'),
    label('emptyEventNoun', 'Events', 'emptyNouns', 'event'),
    label('emptyResearchNoun', 'Research', 'emptyNouns', 'report'),

    label('previousLabel', 'Previous page', 'pagination', 'Previous'),
    label('nextLabel', 'Next page', 'pagination', 'Next'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Awards, events and research list', subtitle: 'Record listing', media: ThListIcon }
    },
  },
})
