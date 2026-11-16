/*
 * Visible labels of the conference event page, edited in the "Event page" document (ClearView folder in the Studio).
 * The design texts live only as the fields' initial values in the schema; the page renders the stored values.
 * Section headings are heading fields (headingField) and are read separately. Pure: no Sanity or Next imports.
 */

export const EVENT_PAGE_COPY_KEYS = [
  'breadcrumbHomeLabel',
  'breadcrumbEventsLabel',
  'summitTypeLabel',
  'briefingTypeLabel',
  'webinarTypeLabel',
  'statusLabel',
  'upcomingLabel',
  'pastLabel',
  'eventFormatLabel',
  'chairLabel',
  'agendaChairLabel',
  'venueLabel',
  'addressLabel',
  'dateLabel',
  'timeLabel',
  'navOverviewLabel',
  'navSpeakersLabel',
  'navWhyAttendLabel',
  'navAgendaLabel',
  'navSponsorsLabel',
  'navVenueLabel',
  'navRelatedCoverageLabel',
] as const

export type EventPageCopyKey = (typeof EVENT_PAGE_COPY_KEYS)[number]

export type EventPageCopy = Record<EventPageCopyKey, string>
