import { createClient, type FilterDefault } from 'next-sanity'

import { apiVersion, dataset, projectId } from './env'

/*
 * Field names that contain "type" but hold visible copy. Sanity's default stega filter skips every path with "type" in
 * any segment (to keep enum values such as `eventType` clean), which also left the sponsor tier and speaker group
 * names and the event type labels without click-to-edit in Presentation. These names are passed to the default filter
 * with "type" masked, so every other rule of the default still applies. Enum fields (`type`, `eventType`,
 * `sessionType`) are not listed and stay unencoded.
 */
const VISIBLE_TYPE_NAMED = new Set([
  'sponsorTypes',
  'speakerTypes',
  'summitTypeLabel',
  'briefingTypeLabel',
  'webinarTypeLabel',
])

const mask = <T extends readonly unknown[]>(path: T): T =>
  path.map((segment) => (typeof segment === 'string' && VISIBLE_TYPE_NAMED.has(segment) ? segment.replace(/type/gi, 'kind') : segment)) as unknown as T

const stegaFilter: FilterDefault = (props) =>
  props.filterDefault({ ...props, sourcePath: mask(props.sourcePath), resultPath: mask(props.resultPath) })

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
  stega: { studioUrl: '/studio', filter: stegaFilter },
})
