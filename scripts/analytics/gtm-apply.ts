/**
 * Applies scripts/analytics/config.ts to the brands' Google Tag Manager containers.
 *
 *   bun scripts/analytics/gtm-apply.ts --dry-run [--brand <key>]   offline: print every intended entity, no sign-in
 *   bun scripts/analytics/gtm-apply.ts --plan    [--brand <key>]   read the container, print what would change
 *   bun scripts/analytics/gtm-apply.ts --apply   [--brand <key>]   write the changes and create a container version
 *
 *   --plan --snapshot <file>  compare with a saved ContainerVersion JSON (API shape) instead of the API, offline
 *   --verbose                 also list unchanged entities
 *   --apply --no-version      write the workspace only, create no version
 *
 * --plan reads the "focusreactive-analytics" workspace when it exists, otherwise the live (published) version.
 * --apply writes only into that workspace, creating it when absent, then creates a container VERSION from it. It never
 * publishes: review the version in GTM Preview and publish it by hand.
 *
 * Entities are matched by name. Entities this config created carry MANAGED_MARKER in their notes and are updated in
 * place; a same-named entity without the marker is reported as a conflict and left alone. The client's existing
 * Google tag and Crazy Egg tag are matched by type and only get the listed parameters and consent added. Nothing is
 * ever deleted, except the workspace this run created when there turned out to be nothing to change.
 *
 * Creating a GA4 event tag for a measurement id makes GTM add a destination tag (dest_ga) and container gtag_config
 * settings by itself. --apply re-reads the workspace after the tags and patches those in a second pass: the
 * destination tags get consent and the blocking trigger, the automatic events and user-provided data are switched off.
 *
 * Requests are throttled (GTM_MIN_INTERVAL_MS, default 4000) to stay inside the GTM API default quota.
 */

import { readFileSync } from 'node:fs'

import type { BrandKey } from '@/brands'

import {
  BRAND_ANALYTICS,
  BRAND_ANALYTICS_KEYS,
  containerPlan,
  MANAGED_MARKER,
  NETWORK,
  WORKSPACE_NAME,
  type ConsentSettings,
  type ContainerPlan,
  type DesiredTag,
  type DesiredTrigger,
  type DesiredVariable,
  type GtagConfigPatch,
  type Param,
  type TagPatch,
} from './config'
import { googleClient, GoogleApiError, type GoogleClient } from './google-auth'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const option = (name: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 ? args[index + 1] : undefined
}

// ─── Live resource shapes ───────────────────────────────────────────────────────────────────────────────────────────

interface Entity {
  path?: string
  name: string
  type: string
  notes?: string
  parameter?: Param[]
  [field: string]: unknown
}

interface LiveTag extends Entity {
  tagId: string
  firingTriggerId?: string[]
  blockingTriggerId?: string[]
  consentSettings?: ConsentSettings
  tagFiringOption?: string
}

interface LiveTrigger extends Entity {
  triggerId: string
}

interface LiveVariable extends Entity {
  variableId: string
}

/** Container-level Google tag setting. Has no name. */
interface LiveGtagConfig {
  path?: string
  gtagConfigId: string
  type: string
  parameter?: Param[]
  [field: string]: unknown
}

/** What `describe` compares: any entity, named or not. */
type Fields = { parameter?: Param[]; [field: string]: unknown }

interface Snapshot {
  source: string
  tags: LiveTag[]
  triggers: LiveTrigger[]
  variables: LiveVariable[]
  builtIns: string[]
  gtagConfigs: LiveGtagConfig[]
}

type Kind = 'builtIn' | 'variable' | 'trigger' | 'tag' | 'gtagConfig'

interface Action {
  op: 'create' | 'update' | 'same' | 'conflict' | 'missing'
  kind: Kind
  label: string
  /** Request body for create/update. */
  body?: Fields
  /** Resource path for update. */
  path?: string
  detail: string[]
}

// ─── Comparison and merge ───────────────────────────────────────────────────────────────────────────────────────────

/** JSON with object keys sorted, for equality. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )
}

/** The key of a settings-table row: its `parameter` (or `name`) entry. */
const rowKey = (row: Param) => row.map?.find((entry) => entry.key === 'parameter' || entry.key === 'name')?.value

const isTable = (param: Param) => param.type === 'list' && (param.list ?? []).every((row) => rowKey(row) !== undefined)

/**
 * `live` with every `desired` parameter set. Tables are merged row by row, so rows the client added stay; other
 * parameters are replaced. Parameters only on `live` are kept.
 */
function mergeParams(live: Param[] = [], desired: Param[]): Param[] {
  const merged = live.map((param) => structuredClone(param))

  for (const want of desired) {
    const index = merged.findIndex((param) => param.key === want.key)

    if (index < 0) {
      merged.push(structuredClone(want))
      continue
    }

    const have = merged[index]

    if (isTable(want) && have.type === 'list') {
      const rows = [...(have.list ?? [])]

      for (const row of want.list ?? []) {
        const at = rows.findIndex((r) => rowKey(r) === rowKey(row))

        if (at < 0) {
          rows.push(structuredClone(row))
        } else {
          rows[at] = structuredClone(row)
        }
      }

      merged[index] = { ...have, list: rows }
    } else {
      merged[index] = structuredClone(want)
    }
  }

  return merged
}

const consentTypes = (settings?: ConsentSettings) => (settings?.consentType?.list ?? []).map((item) => item.value ?? '')

/** Consent `needed` with the union of live and desired consent types. */
function mergeConsent(live: ConsentSettings | undefined, desired: ConsentSettings): ConsentSettings {
  const types = [...new Set([...consentTypes(live), ...consentTypes(desired)])]

  return {
    consentStatus: desired.consentStatus,
    consentType: { type: 'list', list: types.map((value) => ({ type: 'template', value })) },
  }
}

const showConsent = (settings?: ConsentSettings) =>
  `${settings?.consentStatus ?? 'notSet'}${consentTypes(settings).length ? `[${consentTypes(settings).join(',')}]` : ''}`

const showParam = (param?: Param): string => {
  if (!param) {
    return '(none)'
  }

  if (isTable(param)) {
    return `{${(param.list ?? []).map((row) => `${rowKey(row)}=${row.map?.find((e) => e.key !== 'parameter' && e.key !== 'name')?.value}`).join(', ')}}`
  }

  return param.value ?? canonical(param.list ?? param.map)
}

/** Human-readable differences between a live entity and its intended body. */
function describe(before: Fields | undefined, after: Fields): string[] {
  const lines: string[] = []
  const params = new Set([...(before?.parameter ?? []), ...(after.parameter ?? [])].map((p) => p.key ?? ''))

  for (const key of params) {
    const was = before?.parameter?.find((p) => p.key === key)
    const now = after.parameter?.find((p) => p.key === key)

    if (canonical(was) !== canonical(now)) {
      lines.push(before ? `${key}: ${showParam(was)} -> ${showParam(now)}` : `${key}: ${showParam(now)}`)
    }
  }

  for (const field of ['type', 'firingTriggerId', 'blockingTriggerId', 'tagFiringOption', 'customEventFilter', 'filter', 'notes']) {
    if (after[field] !== undefined && canonical(before?.[field]) !== canonical(after[field])) {
      lines.push(`${field}: ${before ? `${canonical(before[field])} -> ` : ''}${canonical(after[field])}`)
    }
  }

  if (after.consentSettings && canonical(before?.consentSettings) !== canonical(after.consentSettings)) {
    const was = before ? `${showConsent(before.consentSettings as ConsentSettings)} -> ` : ''

    lines.push(`consent: ${was}${showConsent(after.consentSettings as ConsentSettings)}`)
  }

  return lines
}

const isManaged = (entity: Entity) => (entity.notes ?? '').includes(MANAGED_MARKER)

/** Upsert by name: create, update ours, or flag a same-named entity that is not ours. */
function upsert(kind: Kind, live: Entity[], desired: Entity): Action {
  const existing = live.find((entity) => entity.name === desired.name)

  if (!existing) {
    return { op: 'create', kind, label: desired.name, body: desired, detail: [] }
  }

  if (!isManaged(existing)) {
    return { op: 'conflict', kind, label: desired.name, detail: ['exists without the managed marker; left alone'] }
  }

  const body: Entity = { ...existing, ...desired, parameter: mergeParams(existing.parameter, desired.parameter ?? []) }

  if (desired.consentSettings) {
    body.consentSettings = mergeConsent(existing.consentSettings as ConsentSettings, desired.consentSettings as ConsentSettings)
  }

  const detail = describe(existing, body)

  return { op: detail.length ? 'update' : 'same', kind, label: desired.name, body, path: existing.path, detail }
}

// ─── Planning ───────────────────────────────────────────────────────────────────────────────────────────────────────

const variableBody = ({ name, type, parameter, notes }: DesiredVariable): Entity => ({ name, type, parameter, notes })

const triggerBody = ({ name, type, customEventFilter, filter, notes }: DesiredTrigger): Entity => ({
  name,
  type,
  customEventFilter,
  ...(filter && { filter }),
  notes,
})

/** The brand's existing Google tag (or Crazy Egg), by type and parameter, never by name. */
function findPatched(tags: LiveTag[], patch: TagPatch): LiveTag[] {
  return tags.filter(
    (tag) =>
      tag.type === patch.match.type &&
      (!patch.match.param ||
        tag.parameter?.some((p) => p.key === patch.match.param!.key && p.value === patch.match.param!.value)),
  )
}

function tagBody(tag: DesiredTag, snapshot: Snapshot, plan: ContainerPlan): Entity {
  const triggerIds = new Map(snapshot.triggers.map((t) => [t.name, t.triggerId]))
  const googleTagPatch = plan.patches.find((patch) => patch.match.type === 'googtag')
  const brandGoogleTag = googleTagPatch ? findPatched(snapshot.tags, googleTagPatch)[0] : undefined

  const triggerId = (name: string) => triggerIds.get(name) ?? `<new: ${name}>`

  const firingTriggerId = tag.firing.flatMap((ref) => {
    if ('trigger' in ref) {
      return [triggerId(ref.trigger)]
    }

    if ('builtIn' in ref) {
      return [ref.builtIn]
    }

    return brandGoogleTag?.firingTriggerId ?? tag.firingFallback ?? []
  })

  return {
    name: tag.name,
    type: tag.type,
    parameter: tag.parameter,
    firingTriggerId,
    blockingTriggerId: tag.blocking.map(triggerId),
    tagFiringOption: tag.tagFiringOption,
    consentSettings: tag.consentSettings,
    notes: tag.notes,
  }
}

function patchActions(snapshot: Snapshot, patch: TagPatch): Action[] {
  const matches = findPatched(snapshot.tags, patch)

  if (!matches.length) {
    return patch.optional
      ? [{ op: 'same', kind: 'tag', label: patch.label, detail: ['not in the container yet; GTM creates it'] }]
      : [{ op: 'missing', kind: 'tag', label: patch.label, detail: ['no matching tag in the container; not created'] }]
  }

  const triggerIds = new Map(snapshot.triggers.map((t) => [t.name, t.triggerId]))
  const blocking = (patch.blocking ?? []).map((name) => triggerIds.get(name) ?? `<new: ${name}>`)

  return matches.map((tag) => {
    const body: LiveTag = {
      ...tag,
      parameter: mergeParams(tag.parameter, patch.parameter),
      consentSettings: mergeConsent(tag.consentSettings, patch.consentSettings),
      ...(blocking.length && { blockingTriggerId: [...new Set([...(tag.blockingTriggerId ?? []), ...blocking])] }),
    }
    const detail = describe(tag, body)

    return { op: detail.length ? 'update' : 'same', kind: 'tag', label: `${patch.label} "${tag.name}"`, body, path: tag.path, detail }
  })
}

function gtagConfigActions(snapshot: Snapshot, patch: GtagConfigPatch): Action[] {
  const matches = snapshot.gtagConfigs.filter((config) => config.type === patch.match.type)

  if (!matches.length) {
    return [{ op: 'same', kind: 'gtagConfig', label: patch.label, detail: ['not in the container yet; GTM creates it'] }]
  }

  return matches.map((config) => {
    const body: LiveGtagConfig = { ...config, parameter: mergeParams(config.parameter, patch.parameter) }
    const detail = describe(config, body)

    return { op: detail.length ? 'update' : 'same', kind: 'gtagConfig', label: `${patch.label} ${config.gtagConfigId}`, body, path: config.path, detail }
  })
}

function planBefore(plan: ContainerPlan, snapshot: Snapshot): Action[] {
  return [
    ...plan.builtInVariables.map<Action>((type) => ({
      op: snapshot.builtIns.includes(type) ? 'same' : 'create',
      kind: 'builtIn',
      label: type,
      detail: [],
    })),
    ...plan.variables.map((v) => upsert('variable', snapshot.variables, variableBody(v))),
    ...plan.triggers.map((t) => upsert('trigger', snapshot.triggers, triggerBody(t))),
  ]
}

function planTags(plan: ContainerPlan, snapshot: Snapshot): Action[] {
  return [
    ...plan.tags.map((tag) => upsert('tag', snapshot.tags, tagBody(tag, snapshot, plan))),
    ...plan.patches.filter((patch) => !patch.optional).flatMap((patch) => patchActions(snapshot, patch)),
  ]
}

/** What GTM creates by itself once the tags exist: destination tags and gtag_config settings. */
function planAfter(plan: ContainerPlan, snapshot: Snapshot): Action[] {
  return [
    ...plan.patches.filter((patch) => patch.optional).flatMap((patch) => patchActions(snapshot, patch)),
    ...plan.gtagConfigs.flatMap((patch) => gtagConfigActions(snapshot, patch)),
  ]
}

const planAll = (plan: ContainerPlan, snapshot: Snapshot) => [
  ...planBefore(plan, snapshot),
  ...planTags(plan, snapshot),
  ...planAfter(plan, snapshot),
]

const SYMBOL: Record<Action['op'], string> = { create: '+', update: '~', same: '=', conflict: '!', missing: '?' }

function printActions(actions: Action[], verbose: boolean) {
  for (const action of actions) {
    if (action.op === 'same' && !verbose) {
      continue
    }

    console.log(`  ${SYMBOL[action.op]} ${action.kind} ${action.label}`)

    for (const line of action.detail) {
      console.log(`      ${line}`)
    }
  }

  const count = (op: Action['op']) => actions.filter((a) => a.op === op).length

  console.log(
    `  = ${count('create')} to create, ${count('update')} to update, ${count('same')} unchanged, ${count('conflict')} conflicts, ${count('missing')} missing`,
  )
}

// ─── GTM API ────────────────────────────────────────────────────────────────────────────────────────────────────────

interface Container {
  path: string
  publicId: string
  name: string
}

interface Workspace {
  path: string
  name: string
}

interface ContainerVersion {
  containerVersionId?: string
  tag?: LiveTag[]
  trigger?: LiveTrigger[]
  variable?: LiveVariable[]
  builtInVariable?: { type: string }[]
  gtagConfig?: LiveGtagConfig[]
}

let containers: Container[] | undefined

async function findContainer(gtm: GoogleClient, publicId: string): Promise<Container> {
  if (!containers) {
    const accounts = await gtm.list<{ path: string }>('accounts', 'account')

    containers = []

    for (const account of accounts) {
      containers.push(...(await gtm.list<Container>(`${account.path}/containers`, 'container')))
    }
  }

  const container = containers.find((c) => c.publicId === publicId)

  if (!container) {
    throw new Error(`${publicId} is not visible to this Google account. Ask the client to add it with Publish rights.`)
  }

  return container
}

const findWorkspace = async (gtm: GoogleClient, container: Container) =>
  (await gtm.list<Workspace>(`${container.path}/workspaces`, 'workspace')).find((w) => w.name === WORKSPACE_NAME)

async function readWorkspace(gtm: GoogleClient, workspace: Workspace): Promise<Snapshot> {
  return {
    source: `workspace "${workspace.name}"`,
    tags: await gtm.list<LiveTag>(`${workspace.path}/tags`, 'tag'),
    triggers: await gtm.list<LiveTrigger>(`${workspace.path}/triggers`, 'trigger'),
    variables: await gtm.list<LiveVariable>(`${workspace.path}/variables`, 'variable'),
    builtIns: (await gtm.list<{ type: string }>(`${workspace.path}/built_in_variables`, 'builtInVariable')).map((b) => b.type),
    gtagConfigs: await gtm.list<LiveGtagConfig>(`${workspace.path}/gtag_config`, 'gtagConfig'),
  }
}

async function readLive(gtm: GoogleClient, container: Container): Promise<Snapshot> {
  let version: ContainerVersion = {}

  try {
    version = await gtm.get<ContainerVersion>(`${container.path}/versions:live`)
  } catch (error) {
    if (!(error instanceof GoogleApiError && error.status === 404)) {
      throw error
    }
  }

  return fromVersion(version, `live version ${version.containerVersionId ?? '(none published)'}`)
}

function fromVersion(version: ContainerVersion, source: string): Snapshot {
  return {
    source,
    tags: version.tag ?? [],
    triggers: version.trigger ?? [],
    variables: version.variable ?? [],
    builtIns: (version.builtInVariable ?? []).map((b) => b.type),
    gtagConfigs: version.gtagConfig ?? [],
  }
}

async function execute(gtm: GoogleClient, workspace: Workspace, action: Action) {
  const collection = {
    variable: 'variables',
    trigger: 'triggers',
    tag: 'tags',
    builtIn: 'built_in_variables',
    gtagConfig: 'gtag_config',
  }[action.kind]

  if (action.op === 'create' && action.kind === 'builtIn') {
    await gtm.post(`${workspace.path}/built_in_variables`, undefined, { type: action.label })
  } else if (action.op === 'create') {
    await gtm.post(`${workspace.path}/${collection}`, action.body)
  } else if (action.op === 'update' && action.path) {
    await gtm.put(action.path, action.body)
  } else {
    return
  }

  console.log(`  ${SYMBOL[action.op]} ${action.kind} ${action.label}`)
}

async function applyContainer(gtm: GoogleClient, plan: ContainerPlan, noVersion: boolean) {
  const container = await findContainer(gtm, plan.gtmPublicId)
  let workspace = await findWorkspace(gtm, container)
  const created = !workspace

  if (!workspace) {
    workspace = await gtm.post<Workspace>(`${container.path}/workspaces`, {
      name: WORKSPACE_NAME,
      description: 'Analytics configuration from scripts/analytics. Review in Preview, then publish by hand.',
    })
    console.log(`  created workspace "${WORKSPACE_NAME}"`)
  } else {
    const sync = await gtm.post<{ mergeConflict?: unknown[]; syncStatus?: { mergeConflict?: boolean; syncError?: boolean } }>(
      `${workspace.path}:sync`,
    )

    if (sync.syncStatus?.mergeConflict || sync.syncStatus?.syncError || sync.mergeConflict?.length) {
      throw new Error(`Workspace "${WORKSPACE_NAME}" has merge conflicts with the latest version. Resolve them in the GTM UI.`)
    }
  }

  let snapshot = await readWorkspace(gtm, workspace)
  const before = planBefore(plan, snapshot)

  for (const action of before) {
    await execute(gtm, workspace, action)
  }

  if (before.some((a) => a.op === 'create' && a.kind === 'trigger')) {
    snapshot = { ...snapshot, triggers: await gtm.list<LiveTrigger>(`${workspace.path}/triggers`, 'trigger') }
  }

  const tags = planTags(plan, snapshot)

  for (const action of tags) {
    await execute(gtm, workspace, action)
  }

  // GTM adds destination tags and gtag_config settings as a side effect of the GA4 event tags: read them back.
  snapshot = {
    ...snapshot,
    tags: await gtm.list<LiveTag>(`${workspace.path}/tags`, 'tag'),
    gtagConfigs: await gtm.list<LiveGtagConfig>(`${workspace.path}/gtag_config`, 'gtagConfig'),
  }

  const after = planAfter(plan, snapshot)

  for (const action of after) {
    await execute(gtm, workspace, action)
  }

  const actions = [...before, ...tags, ...after]

  for (const action of actions.filter((a) => a.op === 'conflict' || a.op === 'missing')) {
    console.log(`  ${SYMBOL[action.op]} ${action.kind} ${action.label}: ${action.detail.join('; ')}`)
  }

  const status = await gtm.get<{ workspaceChange?: unknown[] }>(`${workspace.path}/status`)

  if (!status.workspaceChange?.length) {
    if (created) {
      await gtm.delete(workspace.path)
      console.log('  nothing to change; removed the empty workspace this run created')
    } else {
      console.log('  nothing to change')
    }

    return
  }

  const preview = await gtm.post<{ compilerError?: boolean }>(`${workspace.path}:quick_preview`)

  console.log(`  quick preview: compilerError ${preview.compilerError ?? false}`)

  if (noVersion) {
    console.log(`  --no-version: workspace "${WORKSPACE_NAME}" updated, no version created`)

    return
  }

  const changed = actions.filter((a) => a.op === 'create' || a.op === 'update')
  const body = {
    name: `Analytics ${new Date().toISOString().slice(0, 10)}`,
    notes: [
      `Created by scripts/analytics/gtm-apply.ts from workspace "${WORKSPACE_NAME}". Not published.`,
      ...changed.map((a) => `${SYMBOL[a.op]} ${a.kind} ${a.label}`),
    ].join('\n'),
  }

  // The API gives no detail on a compiler error, and one has been seen to clear on its own: retry once.
  for (let attempt = 1; ; attempt++) {
    let failure: unknown

    try {
      const version = await gtm.post<{ containerVersion?: { containerVersionId: string }; compilerError?: boolean }>(
        `${workspace.path}:create_version`,
        body,
      )

      if (!version.compilerError) {
        console.log(`  created version ${version.containerVersion?.containerVersionId} (NOT published; publish it in the GTM UI)`)

        return
      }

      failure = version
    } catch (error) {
      failure = error instanceof Error ? error.message : error
    }

    console.error(`  create_version failed (attempt ${attempt}):\n${typeof failure === 'string' ? failure : JSON.stringify(failure, null, 2)}`)

    if (attempt >= 2) {
      throw new Error(`Could not create a version. Workspace "${WORKSPACE_NAME}" is written: create the version in the GTM UI.`)
    }

    await new Promise((done) => setTimeout(done, 5000))
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────────

function dryRun(plan: ContainerPlan) {
  const empty: Snapshot = { source: 'empty', tags: [], triggers: [], variables: [], builtIns: [], gtagConfigs: [] }
  const show = (entity: Entity) => console.log(`    ${canonical(entity)}`)

  console.log(`  built-in variables: ${plan.builtInVariables.join(', ')}`)
  console.log(`  variables (${plan.variables.length}):`)
  plan.variables.map(variableBody).forEach(show)
  console.log(`  triggers (${plan.triggers.length}):`)
  plan.triggers.map(triggerBody).forEach(show)
  console.log(`  tags (${plan.tags.length}):`)
  plan.tags.map((tag) => tagBody(tag, empty, plan)).forEach(show)
  console.log(`  patches to existing tags (${plan.patches.length}):`)

  for (const patch of plan.patches) {
    console.log(
      `    ${patch.label}: match ${canonical(patch.match)}; set ${canonical({ parameter: patch.parameter, consentSettings: patch.consentSettings, blocking: patch.blocking })}`,
    )
  }

  console.log(`  patches to gtag_config settings (${plan.gtagConfigs.length}):`)

  for (const patch of plan.gtagConfigs) {
    console.log(`    ${patch.label}: match ${canonical(patch.match)}; set ${canonical(patch.parameter)}`)
  }
}

async function main() {
  const mode = flag('apply') ? 'apply' : flag('plan') ? 'plan' : flag('dry-run') ? 'dry-run' : undefined
  const brand = option('brand')

  if (!mode) {
    console.error('Usage: gtm-apply.ts --dry-run | --plan | --apply [--no-version] [--brand <key>]')
    process.exit(1)
  }

  if (brand && !BRAND_ANALYTICS_KEYS.includes(brand as BrandKey)) {
    console.error(`Unknown brand "${brand}". One of: ${BRAND_ANALYTICS_KEYS.join(', ')}`)
    process.exit(1)
  }

  const brands = brand ? [brand as BrandKey] : BRAND_ANALYTICS_KEYS
  const gtm = googleClient('https://tagmanager.googleapis.com/tagmanager/v2', {
    minIntervalMs: Number(process.env.GTM_MIN_INTERVAL_MS ?? 4000),
  })

  console.log(`GTM ${mode}. Network measurement id: ${NETWORK.measurementId}`)

  for (const key of brands) {
    const plan = containerPlan(key)

    console.log(`\n${key} ${plan.gtmPublicId} -> ${BRAND_ANALYTICS[key].measurementId}`)

    if (mode === 'dry-run') {
      dryRun(plan)
      continue
    }

    if (mode === 'apply') {
      await applyContainer(gtm, plan, flag('no-version'))
      continue
    }

    const fixture = option('snapshot')

    if (fixture) {
      const version = JSON.parse(readFileSync(fixture, 'utf8')) as ContainerVersion

      console.log(`  compared with ${fixture}`)
      printActions(planAll(plan, fromVersion(version, fixture)), flag('verbose'))
      continue
    }

    const container = await findContainer(gtm, plan.gtmPublicId)
    const workspace = await findWorkspace(gtm, container)
    const snapshot = workspace ? await readWorkspace(gtm, workspace) : await readLive(gtm, container)

    console.log(`  ${container.path} "${container.name}", compared with ${snapshot.source}`)
    printActions(planAll(plan, snapshot), flag('verbose'))
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
