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
  description: string,
  fieldset: string,
  initialValue: string,
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

const NOUN = `Replaces ${RECORD_LISTING_TYPE_TOKEN} in the empty state text`

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
    { name: 'tabs', title: 'Tabs' },
    { name: 'filters', title: 'Filters', options: { collapsible: true, collapsed: true } },
    { name: 'statuses', title: 'Event and research statuses', options: { collapsible: true, collapsed: true } },
    { name: 'empty', title: 'Empty state', options: { collapsible: true, collapsed: true } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    label('awardsTabLabel', 'Awards tab', 'Tab of the awards list, opened at /events-category/awards.', 'tabs', 'Awards'),
    label(
      'eventsTabLabel',
      'Events tab',
      'Tab of the events list (summits, briefings and webinars together), opened at /events-category/summits, /events-category/briefings and /events-category/webinar.',
      'tabs',
      'Events',
    ),
    label('researchTabLabel', 'Research tab', 'Tab of the research list, opened at /resource-categories/research.', 'tabs', 'Research'),

    label('regionFilterLabel', 'Region filter label', 'Label of the region filter (Awards and Events tabs).', 'filters', 'Region'),
    label('regionEuropeLabel', 'Europe region', 'Region of records held in Europe, on their row and as a region filter option.', 'filters', 'Europe'),
    label('regionMenaLabel', 'MENA region', 'Region of records held in the Middle East and North Africa.', 'filters', 'MENA'),
    label('regionAsiaLabel', 'Asia region', 'Region of records held in Asia.', 'filters', 'Asia'),
    label('regionNorthAmericaLabel', 'North America region', 'Region of records held in North America.', 'filters', 'North America'),
    label('yearFilterLabel', 'Year filter label', 'Label of the year filter.', 'filters', 'Year'),
    label(
      'statusFilterLabel',
      'Status filter label',
      'Label of the status filter. Its options on the Awards tab are the status labels of the Awards programme page document.',
      'filters',
      'Status',
    ),
    label('allOptionLabel', 'All option', 'First option of every filter: no filtering.', 'filters', 'All'),
    label('clearFiltersLabel', 'Clear filters link', 'Under the filters while any is set; resets them all to All.', 'filters', 'Clear filters'),

    label(
      'upcomingEventLabel',
      'Upcoming event status',
      'Status of an event whose last day is today or later, on its row and as a status filter option on the Events tab.',
      'statuses',
      'Upcoming',
    ),
    label(
      'pastEventLabel',
      'Past event status',
      'Status of an event whose last day has passed, on its row and as a status filter option on the Events tab.',
      'statuses',
      'Past',
    ),
    label(
      'publishedLabel',
      'Published research status',
      'Status of a research report, on its row and as the status filter option on the Research tab.',
      'statuses',
      'Published',
    ),

    label('emptyHeading', 'Empty state heading', 'Shown when no record matches the filters.', 'empty', 'No records match these filters'),
    defineField({
      name: 'emptyText',
      title: 'Empty state text',
      type: 'string',
      fieldset: 'empty',
      description: `Text under that heading. ${RECORD_LISTING_TYPE_TOKEN} is the open tab's noun, set in the fields below; use it exactly once. Placeholders: ${RECORD_LISTING_TYPE_TOKEN}.`,
      initialValue: `Try a different combination, or clear the filters to see every ${RECORD_LISTING_TYPE_TOKEN}.`,
      validation: (Rule) => Rule.required().custom((value: string | undefined) => emptyTextError(value) ?? true),
    }),
    label('emptyAwardNoun', 'Awards noun', `${NOUN} on the Awards tab.`, 'empty', 'award'),
    label('emptyEventNoun', 'Events noun', `${NOUN} on the Events tab.`, 'empty', 'event'),
    label('emptyResearchNoun', 'Research noun', `${NOUN} on the Research tab.`, 'empty', 'report'),
    label('emptyButtonLabel', 'Empty state button', 'Under the empty state text, resets every filter to All.', 'empty', 'Clear filters'),

    label('previousLabel', 'Previous page button', 'Pagination, shown when the list runs over more than one page.', 'pagination', 'Previous'),
    label('nextLabel', 'Next page button', 'Pagination, shown when the list runs over more than one page.', 'pagination', 'Next'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Awards, events and research list', subtitle: 'Record listing', media: ThListIcon }
    },
  },
})
