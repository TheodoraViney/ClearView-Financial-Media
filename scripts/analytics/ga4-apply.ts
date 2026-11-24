/**
 * Applies scripts/analytics/config.ts to the brands' GA4 properties and to the Network property.
 *
 *   bun scripts/analytics/ga4-apply.ts --dry-run [--brand <key>|network]   offline: print the intended settings
 *   bun scripts/analytics/ga4-apply.ts --plan    [--brand <key>|network]   read each property, print what would change
 *   bun scripts/analytics/ga4-apply.ts --apply   [--brand <key>|network]   create what is missing
 *
 * Per property: event-scoped custom dimensions (CUSTOM_DIMENSIONS), key events (KEY_EVENTS), and the web stream's
 * enhanced measurement "Page changes based on browser history events" (pageChangesEnabled), which a client-routed
 * Next.js site needs for page views after the first. --apply turns it on when off and changes nothing else there.
 *
 * Brand properties are found by their web stream's measurement id among the properties this Google account can see.
 * The Network property is NETWORK.propertyId in config.ts. Nothing is ever archived or deleted.
 */

import type { BrandKey } from '@/brands'

import { BRAND_ANALYTICS, BRAND_ANALYTICS_KEYS, CUSTOM_DIMENSIONS, KEY_EVENTS, NETWORK } from './config'
import { googleClient, type GoogleClient } from './google-auth'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const option = (name: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 ? args[index + 1] : undefined
}

const ADMIN = 'https://analyticsadmin.googleapis.com'

interface DataStream {
  name: string
  type: string
  displayName?: string
  webStreamData?: { measurementId: string; defaultUri?: string }
}

interface EnhancedMeasurement {
  name: string
  streamEnabled?: boolean
  pageChangesEnabled?: boolean
  outboundClicksEnabled?: boolean
  fileDownloadsEnabled?: boolean
  siteSearchEnabled?: boolean
}

interface Target {
  label: string
  /** `properties/123`, once known. */
  property?: string
  /** Only this stream's enhanced measurement is checked; all web streams when unset. */
  measurementId?: string
}

let propertyByMeasurementId: Map<string, string> | undefined

/** Every web stream measurement id this account can see, to its property. */
async function findProperty(admin: GoogleClient, measurementId: string): Promise<string | undefined> {
  if (!propertyByMeasurementId) {
    propertyByMeasurementId = new Map()

    const summaries = await admin.list<{ propertySummaries?: { property: string }[] }>('v1beta/accountSummaries', 'accountSummaries', {
      pageSize: '200',
    })

    for (const { property } of summaries.flatMap((s) => s.propertySummaries ?? [])) {
      for (const stream of await admin.list<DataStream>(`v1beta/${property}/dataStreams`, 'dataStreams')) {
        if (stream.webStreamData) {
          propertyByMeasurementId.set(stream.webStreamData.measurementId, property)
        }
      }
    }
  }

  return propertyByMeasurementId.get(measurementId)
}

async function processProperty(admin: GoogleClient, target: Target, apply: boolean) {
  const property = target.property!
  const todo: string[] = []

  const dimensions = await admin.list<{ parameterName: string; scope: string }>(`v1beta/${property}/customDimensions`, 'customDimensions')

  for (const dimension of CUSTOM_DIMENSIONS) {
    const have = dimensions.find((d) => d.parameterName === dimension.parameterName)

    if (have) {
      console.log(`  = custom dimension ${dimension.parameterName}${have.scope === 'EVENT' ? '' : ` (scope ${have.scope}, expected EVENT)`}`)
      continue
    }

    todo.push(`custom dimension ${dimension.parameterName}`)
    console.log(`  + custom dimension ${dimension.parameterName} "${dimension.displayName}" (EVENT)`)

    if (apply) {
      await admin.post(`v1beta/${property}/customDimensions`, { ...dimension, scope: 'EVENT' })
    }
  }

  const keyEvents = await admin.list<{ eventName: string }>(`v1beta/${property}/keyEvents`, 'keyEvents')

  for (const eventName of KEY_EVENTS) {
    if (keyEvents.some((k) => k.eventName === eventName)) {
      console.log(`  = key event ${eventName}`)
      continue
    }

    todo.push(`key event ${eventName}`)
    console.log(`  + key event ${eventName}`)

    if (apply) {
      await admin.post(`v1beta/${property}/keyEvents`, { eventName, countingMethod: 'ONCE_PER_EVENT' })
    }
  }

  const streams = (await admin.list<DataStream>(`v1beta/${property}/dataStreams`, 'dataStreams')).filter(
    (s) => s.webStreamData && (!target.measurementId || s.webStreamData.measurementId === target.measurementId),
  )

  if (!streams.length) {
    console.log(`  ? no web stream${target.measurementId ? ` ${target.measurementId}` : ''} on ${property}`)
  }

  for (const stream of streams) {
    const settings = await admin.get<EnhancedMeasurement>(`v1alpha/${stream.name}/enhancedMeasurementSettings`)
    const id = stream.webStreamData!.measurementId
    const others = `stream ${settings.streamEnabled}, outbound clicks ${settings.outboundClicksEnabled}, file downloads ${settings.fileDownloadsEnabled}, site search ${settings.siteSearchEnabled}`

    if (!settings.streamEnabled) {
      console.log(`  ! ${id}: enhanced measurement is off for the stream; page changes have no effect until it is on`)
    }

    if (settings.pageChangesEnabled) {
      console.log(`  = ${id}: page views on browser history events ON (${others})`)
      continue
    }

    todo.push(`${id} page changes`)
    console.log(`  ~ ${id}: page views on browser history events OFF -> ON (${others})`)

    if (apply) {
      await admin.patch(`v1alpha/${settings.name}`, { pageChangesEnabled: true }, { updateMask: 'page_changes_enabled' })
    }
  }

  console.log(`  ${apply ? 'applied' : 'to apply'}: ${todo.length ? todo.length : 'nothing'}`)
}

function dryRun(target: Target) {
  console.log(`  custom dimensions (EVENT): ${CUSTOM_DIMENSIONS.map((d) => `${d.parameterName} "${d.displayName}"`).join(', ')}`)
  console.log(`  key events (ONCE_PER_EVENT): ${KEY_EVENTS.join(', ')}`)
  console.log(`  enhanced measurement on ${target.measurementId ?? 'every web stream'}: pageChangesEnabled = true`)
}

async function main() {
  const mode = flag('apply') ? 'apply' : flag('plan') ? 'plan' : flag('dry-run') ? 'dry-run' : undefined
  const only = option('brand')

  if (!mode) {
    console.error('Usage: ga4-apply.ts --dry-run | --plan | --apply [--brand <key>|network]')
    process.exit(1)
  }

  if (only && only !== 'network' && !BRAND_ANALYTICS_KEYS.includes(only as BrandKey)) {
    console.error(`Unknown brand "${only}". One of: ${BRAND_ANALYTICS_KEYS.join(', ')}, network`)
    process.exit(1)
  }

  const admin = googleClient(ADMIN, { minIntervalMs: 250 })
  const targets: Target[] = BRAND_ANALYTICS_KEYS.filter((key) => !only || only === key).map((key) => ({
    label: `${key} ${BRAND_ANALYTICS[key].measurementId}`,
    measurementId: BRAND_ANALYTICS[key].measurementId,
  }))

  if (!only || only === 'network') {
    targets.push({ label: 'network', property: `properties/${NETWORK.propertyId}`, measurementId: NETWORK.measurementId })
  }

  console.log(`GA4 ${mode}.`)

  for (const target of targets) {
    console.log(`\n${target.label}${target.property ? ` ${target.property}` : ''}`)

    if (mode === 'dry-run') {
      dryRun(target)
      continue
    }

    target.property ??= await findProperty(admin, target.measurementId!)

    if (!target.property) {
      console.log(`  ? no property with web stream ${target.measurementId} is visible to this Google account`)
      continue
    }

    console.log(`  ${target.property}`)
    await processProperty(admin, target, mode === 'apply')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
