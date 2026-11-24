/**
 * The one analytics configuration applied to all four GTM containers and their GA4 properties, by gtm-apply.ts and
 * ga4-apply.ts. Edit here, then plan and apply. Shapes are GTM API v2 resources (lowerCamel enums, as the REST API
 * returns them; container exports print the same values in UPPER_SNAKE).
 *
 * The event list mirrors `AnalyticsEvents` in src/lib/analytics.ts: names and parameters must match what the app
 * pushes to the dataLayer, or the Custom Event triggers never fire.
 */

import type { BrandKey } from '@/brands'

// ─── Sources ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Each brand's GTM container (client-owned, live on the legacy sites today) and its GA4 web stream. */
export const BRAND_ANALYTICS = {
  wealthbriefing: { gtmPublicId: 'GTM-N289V7M', measurementId: 'G-CRT9ZTT2W3' },
  wealthbriefingasia: { gtmPublicId: 'GTM-TL59BQC', measurementId: 'G-TQPHF0K17Y' },
  familywealthreport: { gtmPublicId: 'GTM-MCCMFH8', measurementId: 'G-84B40V6NWC' },
  clearview: { gtmPublicId: 'GTM-N9LBW5C', measurementId: 'G-MFTQ96Q6FD' },
} as const satisfies Record<BrandKey, { gtmPublicId: string; measurementId: string }>

export const BRAND_ANALYTICS_KEYS = Object.keys(BRAND_ANALYTICS) as BrandKey[]

/** The cross-brand "Network" GA4 property, which every container also sends to. The env vars override the ids. */
export const NETWORK = {
  /** Web stream measurement id, for the GTM tags. "WealthBriefing Group – Network", created 2026-11-24. */
  measurementId: process.env.GA4_NETWORK_MEASUREMENT_ID || 'G-6CTZQHSNL3',
  /** Numeric property id, for the GA4 Admin API. */
  propertyId: process.env.GA4_NETWORK_PROPERTY_ID || '565701135',
}

/** Pushed by the brand layout before GTM loads. Persist in the dataLayer model, so every later event can read them. */
export const PAGE_CONTEXT = ['publication', 'site_env'] as const

/**
 * Every custom event the app pushes, with its parameters. `keyEvent` marks a GA4 key event (conversion).
 * Keep in step with `AnalyticsEvents` in src/lib/analytics.ts.
 */
export const EVENTS = {
  newsletter_signup: { params: ['signup_location'], keyEvent: true },
  newsletter_confirm: { params: [], keyEvent: true },
  sponsorship_enquiry: { params: [], keyEvent: true },
  contact_enquiry: { params: [], keyEvent: true },
  award_entry_click: { params: ['link_url', 'programme'], keyEvent: true },
  report_download: { params: ['link_url', 'report'], keyEvent: true },
  article_view: { params: ['content_source', 'article_id'], keyEvent: false },
} as const satisfies Record<string, { params: readonly string[]; keyEvent: boolean }>

export type EventName = keyof typeof EVENTS
export const EVENT_NAMES = Object.keys(EVENTS) as EventName[]

/** Event-scoped GA4 custom dimensions, created on every property. Parameters not here are collected but unreported. */
export const CUSTOM_DIMENSIONS = [
  { parameterName: 'publication', displayName: 'Publication', description: 'Brand that sent the event' },
  { parameterName: 'signup_location', displayName: 'Signup location', description: 'Opener of the subscribe pop-up' },
  { parameterName: 'programme', displayName: 'Awards programme', description: 'Programme of an award entry click' },
  { parameterName: 'report', displayName: 'Report', description: 'Research report downloaded' },
  { parameterName: 'content_source', displayName: 'Content source', description: 'cms or archive article' },
] as const

export const KEY_EVENTS = EVENT_NAMES.filter((name) => EVENTS[name].keyEvent)

/** Consent Mode is basic: CookieYes sets defaults to denied in the page; these tags wait for analytics consent. */
export const REQUIRED_CONSENT = ['analytics_storage'] as const

/** Named workspace the scripts write into. GTM allows three workspaces per container on the free tier. */
export const WORKSPACE_NAME = 'focusreactive-analytics'

/** In the notes of every entity the scripts created. Only these are ever updated; nothing is ever deleted. */
export const MANAGED_MARKER = '[managed by scripts/analytics]'

/** Built-in trigger ids. Initialization fires before All Pages; the brand Google tag already uses it. */
export const BUILT_IN_TRIGGER = { allPages: '2147479553', initialization: '2147479573' } as const

// ─── GTM resource shapes ────────────────────────────────────────────────────────────────────────────────────────────

export interface Param {
  type: 'template' | 'integer' | 'boolean' | 'list' | 'map'
  key?: string
  value?: string
  list?: Param[]
  map?: Param[]
}

export interface ConsentSettings {
  consentStatus: 'needed' | 'notNeeded' | 'notSet'
  consentType?: Param
}

/** `equals` with a `negate` boolean parameter is "does not equal". */
export interface Condition {
  type: 'equals' | 'matchRegex'
  parameter: Param[]
}

/** Where a tag fires: a trigger this config defines, a built-in trigger, or wherever the brand Google tag fires. */
export type FiringRef = { trigger: string } | { builtIn: string } | { sameAsBrandGoogleTag: true }

export interface DesiredVariable {
  kind: 'variable'
  name: string
  type: 'v'
  parameter: Param[]
  notes: string
}

export interface DesiredTrigger {
  kind: 'trigger'
  name: string
  type: 'customEvent'
  customEventFilter: Condition[]
  /** Extra conditions, all of which must hold ("Some Custom Events"). */
  filter?: Condition[]
  notes: string
}

export interface DesiredTag {
  kind: 'tag'
  name: string
  type: string
  parameter: Param[]
  firing: FiringRef[]
  /** Used when `firing` resolves nothing (offline dry run). */
  firingFallback?: string[]
  /** Names of triggers this config defines that block the tag. */
  blocking: string[]
  tagFiringOption: 'oncePerEvent'
  consentSettings: ConsentSettings
  notes: string
}

/**
 * A change to a tag the client already has. Matched by type (and a parameter value), never by name. Only the listed
 * parameters and table rows are set; everything else on the tag is left as it is.
 */
export interface TagPatch {
  kind: 'tagPatch'
  label: string
  match: { type: string; param?: { key: string; value: string } }
  parameter: Param[]
  consentSettings: ConsentSettings
}

export interface ContainerPlan {
  brand: BrandKey
  gtmPublicId: string
  builtInVariables: string[]
  variables: DesiredVariable[]
  triggers: DesiredTrigger[]
  tags: DesiredTag[]
  patches: TagPatch[]
}

// ─── Builders ───────────────────────────────────────────────────────────────────────────────────────────────────────

const template = (key: string, value: string): Param => ({ type: 'template', key, value })

/** A settings table (Google tag configSettingsTable / eventSettingsTable, GA4 event eventSettingsTable). */
const settingsTable = (key: string, rows: Record<string, string>): Param => ({
  type: 'list',
  key,
  list: Object.entries(rows).map(([parameter, parameterValue]) => ({
    type: 'map',
    map: [template('parameter', parameter), template('parameterValue', parameterValue)],
  })),
})

const consentNeeded: ConsentSettings = {
  consentStatus: 'needed',
  consentType: { type: 'list', list: REQUIRED_CONSENT.map((value) => ({ type: 'template', value })) },
}

export const dlvName = (key: string) => `DLV - ${key}`
export const triggerName = (event: string) => `CE - ${event}`
const ref = (variable: string) => `{{${variable}}}`

/**
 * Blocks every tag this config creates unless the page pushed `site_env: 'production'`. Staging, dev and preview
 * hosts push another value; the legacy sites push nothing, so the variable reads `undefined`. A Custom Event trigger
 * matching `.*` evaluates on every dataLayer event, gtm.init included, so it also blocks the Network Google tag that
 * fires on Initialization. The client's own Google tag and Crazy Egg are not blocked: the legacy sites need them.
 */
const BLOCK_NOT_PRODUCTION: DesiredTrigger = {
  kind: 'trigger',
  name: 'Block - not production',
  type: 'customEvent',
  customEventFilter: [
    { type: 'matchRegex', parameter: [template('arg0', '{{_event}}'), template('arg1', '.*')] },
  ],
  filter: [
    {
      type: 'equals',
      parameter: [
        template('arg0', ref(dlvName('site_env'))),
        template('arg1', 'production'),
        { type: 'boolean', key: 'negate', value: 'true' },
      ],
    },
  ],
  notes: `${MANAGED_MARKER} Blocking trigger: every event unless site_env is "production".`,
}

/** All event parameters across all events, each once. */
const EVENT_PARAMS = [...new Set(EVENT_NAMES.flatMap((name) => EVENTS[name].params as readonly string[]))]

const publicationRow = { publication: ref(dlvName('publication')) }

function eventTag(event: EventName, measurementId: string, label: string): DesiredTag {
  const params = Object.fromEntries((EVENTS[event].params as readonly string[]).map((p) => [p, ref(dlvName(p))]))

  return {
    kind: 'tag',
    name: `GA4 ${label} - ${event}`,
    type: 'gaawe',
    parameter: [
      template('eventName', event),
      template('measurementIdOverride', measurementId),
      // publication rides on the Google tag's shared event settings too; repeated here so the event is complete
      // even if the Google tag is edited by hand.
      settingsTable('eventSettingsTable', { ...publicationRow, ...params }),
      { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
    ],
    firing: [{ trigger: triggerName(event) }],
    blocking: [BLOCK_NOT_PRODUCTION.name],
    tagFiringOption: 'oncePerEvent',
    consentSettings: consentNeeded,
    notes: `${MANAGED_MARKER} GA4 event "${event}" to ${measurementId}.`,
  }
}

/** Everything one container should hold. Pure: no network, reads only this file and the env. */
export function containerPlan(brand: BrandKey): ContainerPlan {
  const { gtmPublicId, measurementId } = BRAND_ANALYTICS[brand]

  // No default value: a missing site_env must never read as "production".
  const variables: DesiredVariable[] = [...PAGE_CONTEXT, ...EVENT_PARAMS].map((key) => ({
    kind: 'variable',
    name: dlvName(key),
    type: 'v',
    parameter: [
      { type: 'integer', key: 'dataLayerVersion', value: '2' },
      { type: 'boolean', key: 'setDefaultValue', value: 'false' },
      template('name', key),
    ],
    notes: `${MANAGED_MARKER} dataLayer "${key}".`,
  }))

  const triggers: DesiredTrigger[] = [
    ...EVENT_NAMES.map<DesiredTrigger>((event) => ({
      kind: 'trigger',
      name: triggerName(event),
      type: 'customEvent',
      customEventFilter: [{ type: 'equals', parameter: [template('arg0', '{{_event}}'), template('arg1', event)] }],
      notes: `${MANAGED_MARKER} dataLayer event "${event}".`,
    })),
    BLOCK_NOT_PRODUCTION,
  ]

  const tags: DesiredTag[] = EVENT_NAMES.map((event) => eventTag(event, measurementId, 'Event'))

  tags.push(
    {
      kind: 'tag',
      name: 'Google tag - Network',
      type: 'googtag',
      parameter: [
        template('tagId', NETWORK.measurementId),
        settingsTable('configSettingsTable', { send_page_view: 'true' }),
        settingsTable('eventSettingsTable', publicationRow),
      ],
      firing: [{ sameAsBrandGoogleTag: true }],
      firingFallback: [BUILT_IN_TRIGGER.initialization],
      blocking: [BLOCK_NOT_PRODUCTION.name],
      tagFiringOption: 'oncePerEvent',
      consentSettings: consentNeeded,
      notes: `${MANAGED_MARKER} Cross-brand Network property ${NETWORK.measurementId}.`,
    },
    ...EVENT_NAMES.map((event) => eventTag(event, NETWORK.measurementId, 'Network Event')),
  )

  const patches: TagPatch[] = [
    {
      kind: 'tagPatch',
      label: `Google tag ${measurementId} (existing)`,
      match: { type: 'googtag', param: { key: 'tagId', value: measurementId } },
      // Shared event settings: sent with every event of this tag id, page_view included.
      parameter: [settingsTable('eventSettingsTable', publicationRow)],
      consentSettings: consentNeeded,
    },
    {
      kind: 'tagPatch',
      label: 'Crazy Egg (existing)',
      match: { type: 'cegg' },
      parameter: [],
      consentSettings: consentNeeded,
    },
  ]

  return { brand, gtmPublicId, builtInVariables: ['event'], variables, triggers, tags, patches }
}
