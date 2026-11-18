import { AddIcon } from '@sanity/icons/Add'
import { SparklesIcon } from '@sanity/icons/Sparkles'
import { Box, Button, Card, Checkbox, Dialog, Flex, Stack, Text } from '@sanity/ui'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type FormPatch,
  type ObjectInputProps,
  type RenderFieldCallback,
  type SanityClient,
  set,
  unset,
  useClient,
} from 'sanity'

import {
  MIN_RESEARCH_SOURCE_CHARS,
  MAX_RESEARCH_SOURCE_CHARS,
  RESEARCH_GENERATION_SETTINGS_ID,
  type ResearchGeneration,
  buildResearchGenerationRequest,
  draftToResourceFields,
  draftToSummaryFields,
  parseResearchResponse,
  randomKey,
  resourceToResearchSource,
} from '@/lib/research-generation-prompt'
import { RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT } from '@/lib/research-generation-instructions'
import { hasExecutiveSummary, publishedId } from '@/lib/research-report'
import { apiVersion } from '@/sanity/env'
import { RESEARCH_SUMMARY_DEFAULT_SLUG } from '@/sanity/schema/documents/research-summary'

/**
 * The research report's form with a "Generate from report text" panel at the top of the Page content group.
 *
 * It is the document's own input, not a field's: the panel writes several report fields at once, and only the
 * document input's `onChange` can patch them, through the form like any edit, so they land in the draft and document
 * history can undo them. The panel is placed by wrapping `renderField`: it renders above the first Page content field
 * shown, under the group tabs, so no placeholder field is stored and reordering the fields moves nothing.
 *
 * Generate reads the report's title and `body` ("Report text") from the form and the published "Research generation
 * instructions" document, and calls the Agent Actions Prompt action as the signed-in user: one request, one AI credit.
 * The answer is checked (src/lib/research-generation-prompt.ts): items with a number the report text lacks are dropped.
 * A preview then lists what each part will get; a part that already has content is filled only when the editor ticks
 * it. The Executive Summary lives in its own document: its draft is patched through the Studio client as the
 * signed-in user, created from the published document first when there is no draft, as the Studio does on a first edit.
 * It is written only when it is a `researchSummary` that no other report points at (a duplicated report shares it).
 *
 * Generate waits for the Executive Summary page: without one (no reference, or a deleted document) the panel offers
 * "Create Executive Summary page", which creates an empty summary draft (title and slug only, no AI) and points the
 * report at it with a weak reference marked to be made strong on publish, the shape the reference input's own
 * "Create new" uses. Publishing the report makes it strong, which needs the summary published first: the
 * `executiveSummaryPage` validation (resource.ts) says so until it is.
 */

const PAGE_GROUP = 'page'

type Block = { _type?: string; children?: { text?: string }[] }

type Resource = {
  _id?: string
  _type?: string
  title?: string | null
  body?: Parameters<typeof resourceToResearchSource>[0]['body']
  summary?: Block[] | null
  keyFindings?: unknown[] | null
  charts?: unknown[] | null
  insights?: unknown[] | null
  methodologyIntro?: Block[] | null
  methodology?: unknown[] | null
  executiveSummaryPage?: { _ref?: string } | null
}

type SummaryDoc = {
  _id: string
  lead?: unknown[] | null
  intro?: unknown[] | null
  sections?: { heading?: string | null; body?: unknown[] | null }[] | null
}

/**
 * The report's Executive Summary page as Generate may use it: `none` (no reference), `missing` (the reference points at
 * no `researchSummary`), `shared` (another report points at it too), or `ready` with its draft, else published, fields.
 */
type SummaryCheck =
  | { kind: 'none' }
  | { kind: 'missing' }
  | { kind: 'shared'; title: string }
  | { kind: 'ready'; doc: SummaryDoc }

type SummaryState = { kind: 'loading' } | { kind: 'failed'; message: string } | SummaryCheck

type PartKey = 'summary' | 'executiveSummary' | 'keyFindings' | 'charts' | 'insights' | 'methodology'

const PART_LABELS: Record<PartKey, string> = {
  summary: 'Executive summary',
  executiveSummary: 'Executive Summary page',
  keyFindings: 'Key findings',
  charts: 'Charts',
  insights: 'Selected insights',
  methodology: 'Methodology',
}

const PART_ORDER: readonly PartKey[] = ['summary', 'executiveSummary', 'keyFindings', 'charts', 'insights', 'methodology']

type Settings = { kind: 'loading' } | { kind: 'ready'; instructions: string }

type Status =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

type Preview = {
  generation: ResearchGeneration
  truncated: boolean
  /** The Executive Summary page as it was when the answer came. */
  summary: SummaryCheck
}

const count = (value: unknown[] | null | undefined) => (Array.isArray(value) ? value.length : 0)

const hasBlockText = (blocks: Block[] | null | undefined) =>
  (blocks ?? []).some((block) => (block.children ?? []).some((child) => child.text?.trim()))

/** What a part holds in the document now, or null when it is empty. */
function currentContent(part: PartKey, resource: Resource, summaryDoc: SummaryDoc | null): string | null {
  switch (part) {
    case 'summary':
      return hasBlockText(resource.summary) ? 'has text' : null
    case 'executiveSummary':
      return hasExecutiveSummary(summaryDoc) ? 'has content' : null
    case 'keyFindings':
    case 'charts':
    case 'insights':
      return count(resource[part]) > 0 ? `has ${count(resource[part])}` : null
    case 'methodology':
      return hasBlockText(resource.methodologyIntro) || count(resource.methodology) > 0 ? 'has content' : null
  }
}

/** One line per item the part will get. Empty when the answer has nothing for it. */
function generatedLines({ draft }: ResearchGeneration, part: PartKey): string[] {
  switch (part) {
    case 'summary':
      return draft.summary ? [draft.summary] : []
    case 'executiveSummary': {
      const { lead, intro, sections } = draft.executiveSummary

      return [
        ...(lead ? [`Lead: ${lead}`] : []),
        ...(intro.length ? [`Introduction: ${intro.length} paragraph${intro.length > 1 ? 's' : ''}`] : []),
        ...sections.map((section) => `Section “${section.heading}”: ${section.paragraphs.length} paragraph${section.paragraphs.length > 1 ? 's' : ''}`),
      ]
    }
    case 'keyFindings':
      return draft.keyFindings.map((item) => `${item.value} – ${item.text}${item.note ? ` (${item.note})` : ''}`)
    case 'charts':
      return draft.charts.map(
        (chart) => `${chart.title}: ${chart.gauges.map((gauge) => `${gauge.label} ${gauge.value} (arc ${gauge.percent}%)`).join(', ')}`,
      )
    case 'insights':
      return draft.insights
    case 'methodology':
      return [
        ...(draft.methodologyIntro ? [`Introduction: ${draft.methodologyIntro}`] : []),
        ...draft.methodology.map((row) => `${row.label}: ${row.value}`),
      ]
  }
}

const clip = (text: string, max = 180) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** The summary's draft and published documents, only when they are Executive Summaries. */
const SUMMARY_DOCS = '*[_id in [$id, $draft] && _type == "researchSummary"]'

/** Reports other than `reportId` (its published, draft or release versions) that point at the summary `id`. */
async function otherReportTitle(client: SanityClient, id: string, reportId: string): Promise<string | null> {
  const users = await client.fetch<{ _id: string; title?: string | null }[]>(
    '*[_type == "resource" && executiveSummaryPage._ref in [$id, $draft]]{ _id, title }',
    { id, draft: `drafts.${id}` },
  )
  const other = users.find((user) => publishedId(user._id) !== reportId)

  return other ? other.title?.trim() || 'another report' : null
}

/** The Executive Summary page the report points at, checked: it must be a `researchSummary` no other report uses. */
async function checkSummary(client: SanityClient, id: string | null, reportId: string): Promise<SummaryCheck> {
  if (!id) {
    return { kind: 'none' }
  }

  const docs = await client.fetch<SummaryDoc[]>(`${SUMMARY_DOCS}{ _id, lead, intro, sections }`, {
    id,
    draft: `drafts.${id}`,
  })
  const doc = docs.find((item) => item._id === `drafts.${id}`) ?? docs.find((item) => item._id === id)

  if (!doc) {
    return { kind: 'missing' }
  }

  const other = await otherReportTitle(client, id, reportId)

  return other ? { kind: 'shared', title: other } : { kind: 'ready', doc }
}

const sharedMessage = (title: string) =>
  `the Executive Summary page is also used by “${title}”. Create this report’s own page with Create Executive Summary page, then generate again`

/**
 * Writes lead, introduction and sections to the Executive Summary's draft, as one transaction. Without a draft, the
 * draft is first created from the published document, so the editor sees it as an ordinary unpublished change.
 * Refuses a document that is not a `researchSummary` or that another report points at.
 */
async function writeSummaryDraft(
  client: SanityClient,
  id: string,
  reportId: string,
  fields: ReturnType<typeof draftToSummaryFields>,
) {
  const draftId = `drafts.${id}`
  const docs = await client.fetch<Record<string, unknown>[]>(SUMMARY_DOCS, { id, draft: draftId })
  const draft = docs.find((doc) => doc._id === draftId)
  const published = docs.find((doc) => doc._id === id)

  if (!draft && !published) {
    throw new Error('the Executive Summary page no longer exists')
  }

  const other = await otherReportTitle(client, id, reportId)

  if (other) {
    throw new Error(sharedMessage(other))
  }

  const toSet = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
  const toUnset = Object.keys(fields).filter((key) => fields[key as keyof typeof fields] === undefined)
  const transaction = client.transaction()

  if (!draft && published) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _rev, _updatedAt, _createdAt, ...copy } = published
    transaction.createIfNotExists({ ...copy, _id: draftId, _type: 'researchSummary' })
  }

  transaction.patch(draftId, (patch) => patch.set(toSet).unset(toUnset))
  await transaction.commit()
}

export function ResearchGenerateInput(props: ObjectInputProps) {
  const { onChange, readOnly, renderDefault, members, schemaType } = props
  const resource = useMemo(() => (props.value ?? {}) as Resource, [props.value])
  const studioClient = useClient({ apiVersion })
  // Raw: drafts and published documents by their own ids (the Studio client's default, made explicit).
  const client = useMemo(() => studioClient.withConfig({ perspective: 'raw' }), [studioClient])
  const agentClient = useClient({ apiVersion: 'vX' })
  const agent = useMemo(() => agentClient.withConfig({ ignoreWarnings: 'experimental' }), [agentClient])

  const [settings, setSettings] = useState<Settings>({ kind: 'loading' })
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [asking, setAsking] = useState<string[] | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [chosen, setChosen] = useState<Set<PartKey>>(new Set())
  const [creating, setCreating] = useState(false)
  const [recheck, setRecheck] = useState(0)

  const summaryId = resource.executiveSummaryPage?._ref ? publishedId(resource.executiveSummaryPage._ref) : null
  const reportId = resource._id ? publishedId(resource._id) : ''

  // The last check of the Executive Summary page, for the reference it was made for: a new reference reads as loading.
  const checkKey = `${summaryId ?? ''}|${reportId}|${recheck}`
  const [summaryResult, setSummaryResult] = useState<{ key: string; state: SummaryState } | null>(null)
  const summaryState: SummaryState = summaryResult?.key === checkKey ? summaryResult.state : { kind: 'loading' }
  const setSummaryState = useCallback((state: SummaryState) => setSummaryResult({ key: checkKey, state }), [checkKey])

  // The report as it is when the answer arrives: the editor may type while the request runs.
  const latest = useRef(resource)

  useEffect(() => {
    latest.current = resource
  }, [resource])

  // One request at a time (each is a credit), and no state change once the form is gone.
  const inFlight = useRef(false)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false

    return () => {
      unmounted.current = true
    }
  }, [])

  const loadSettings = useCallback(async (): Promise<Settings> => {
    // The published document only: `_id ==` never matches its draft, so unpublished edits are not used. Without the
    // document (or with empty instructions) the default instructions apply, as for the brief.
    const instructions = await client.fetch<string | null>('*[_id == $id][0].instructions', {
      id: RESEARCH_GENERATION_SETTINGS_ID,
    })
    const next: Settings = { kind: 'ready', instructions: instructions?.trim() || RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT }

    if (!unmounted.current) {
      setSettings(next)
    }

    return next
  }, [client])

  useEffect(() => {
    loadSettings().catch(() => setSettings({ kind: 'ready', instructions: RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT }))
  }, [loadSettings])

  // The Executive Summary page, checked again whenever the reference changes.
  useEffect(() => {
    let current = true

    checkSummary(client, summaryId, reportId)
      .then((check) => current && setSummaryState(check))
      .catch((error) => {
        if (current) {
          setSummaryState({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
        }
      })

    return () => {
      current = false
    }
  }, [client, summaryId, reportId, setSummaryState])

  /**
   * Creates an empty Executive Summary draft for this report and points the report at it. A draft, so the editor
   * publishes it; a weak reference with `_strengthenOnPublish`, because a strong one cannot point at an unpublished
   * document; the report's own publish turns it strong.
   */
  const createSummary = useCallback(async () => {
    if (creating) {
      return
    }

    setCreating(true)
    setStatus({ kind: 'idle' })

    try {
      // The migrated naming (research-summary-wp-{n}) when the report has a WordPress id and that id is free.
      const wp = /^resource-(wp-\d+)$/.exec(reportId)?.[1]
      const wpId = wp ? `research-summary-${wp}` : null
      const wpFree =
        wpId !== null &&
        !(await client.fetch<boolean>('count(*[_id in [$id, $draft]]) > 0', { id: wpId, draft: `drafts.${wpId}` }))
      const id = wpFree && wpId ? wpId : `research-summary-${randomKey()}`

      await client.create({
        _id: `drafts.${id}`,
        _type: 'researchSummary',
        ...(latest.current.title?.trim() ? { title: latest.current.title.trim() } : {}),
        slug: { _type: 'slug', current: RESEARCH_SUMMARY_DEFAULT_SLUG },
      })

      if (unmounted.current) {
        return
      }

      onChange(
        set(
          { _type: 'reference', _ref: id, _weak: true, _strengthenOnPublish: { type: 'researchSummary' } },
          ['executiveSummaryPage'],
        ),
      )
      setStatus({
        kind: 'done',
        message:
          'Created the Executive Summary page as a draft. Publish it from the Executive Summary tab before you publish the report.',
      })
    } catch (error) {
      if (!unmounted.current) {
        setStatus({
          kind: 'error',
          message: `The Executive Summary page was not created: ${error instanceof Error ? error.message : String(error)}.`,
        })
      }
    } finally {
      if (!unmounted.current) {
        setCreating(false)
      }
    }
  }, [client, creating, onChange, reportId])

  const running = status.kind === 'running'

  const run = useCallback(async () => {
    setAsking(null)

    if (inFlight.current) {
      return
    }

    const source = resourceToResearchSource(latest.current)

    if (source.text.length < MIN_RESEARCH_SOURCE_CHARS) {
      setStatus({ kind: 'error', message: 'Paste the report’s text into Report text (Details tab) first: the AI drafts from it.' })
      return
    }

    inFlight.current = true
    setStatus({ kind: 'running' })

    try {
      const current = await loadSettings()

      if (current.kind !== 'ready') {
        setStatus({ kind: 'idle' })
        return
      }

      const request = buildResearchGenerationRequest({ instructions: current.instructions, source })
      const result = parseResearchResponse(await agent.agent.action.prompt(request), source)

      if (unmounted.current) {
        return
      }

      if (!result.ok) {
        setStatus({ kind: 'error', message: result.error })
        return
      }

      const summary = await checkSummary(client, summaryId, reportId)
      const summaryDoc = summary.kind === 'ready' ? summary.doc : null
      const report = latest.current

      if (unmounted.current) {
        return
      }

      // Ticked at first: every part the answer fills that is empty now. A part with content waits for a tick.
      setChosen(
        new Set(
          PART_ORDER.filter(
            (part) =>
              generatedLines(result.value, part).length > 0 &&
              currentContent(part, report, summaryDoc) === null &&
              (part !== 'executiveSummary' || summaryDoc !== null),
          ),
        ),
      )
      setSummaryState(summary)
      setPreview({ generation: result.value, truncated: source.truncated, summary })
      setStatus({ kind: 'idle' })
    } catch (error) {
      if (!unmounted.current) {
        setStatus({
          kind: 'error',
          message: `The AI request failed: ${error instanceof Error ? error.message : String(error)}. Try again in a minute.`,
        })
      }
    } finally {
      inFlight.current = false
    }
  }, [agent, client, loadSettings, reportId, setSummaryState, summaryId])

  const start = useCallback(async () => {
    try {
      const summary = await checkSummary(client, summaryId, reportId)
      setSummaryState(summary)

      if (summary.kind === 'none' || summary.kind === 'missing') {
        return
      }

      const summaryDoc = summary.kind === 'ready' ? summary.doc : null
      const filled = PART_ORDER.filter((part) => currentContent(part, latest.current, summaryDoc) !== null)

      if (filled.length > 0) {
        setAsking(filled.map((part) => PART_LABELS[part]))
      } else {
        void run()
      }
    } catch (error) {
      setStatus({ kind: 'error', message: `Could not read the Executive Summary: ${error instanceof Error ? error.message : String(error)}.` })
    }
  }, [client, reportId, run, setSummaryState, summaryId])

  const apply = useCallback(async () => {
    if (!preview) {
      return
    }

    const { draft } = preview.generation
    const fields = draftToResourceFields(draft)
    const patches: FormPatch[] = []
    const written: string[] = []
    const field = (name: keyof typeof fields) => patches.push(fields[name] === undefined ? unset([name]) : set(fields[name], [name]))

    for (const part of chosen) {
      if (part === 'executiveSummary') {
        continue
      }

      if (part === 'methodology') {
        field('methodologyIntro')
        field('methodology')
      } else {
        field(part)
      }

      written.push(PART_LABELS[part])
    }

    setPreview(null)
    let summaryError: string | null = null

    if (chosen.has('executiveSummary') && summaryId) {
      try {
        await writeSummaryDraft(client, summaryId, reportId, draftToSummaryFields(draft))
        written.push(PART_LABELS.executiveSummary)
      } catch (error) {
        summaryError = error instanceof Error ? error.message : String(error)
      }
    }

    if (unmounted.current) {
      return
    }

    if (patches.length > 0) {
      onChange(patches)
    }

    const ordered = PART_ORDER.map((part) => PART_LABELS[part]).filter((label) => written.includes(label))

    setStatus(
      summaryError
        ? {
            kind: 'error',
            message: `${ordered.length ? `Filled ${ordered.join(', ')}. ` : ''}The Executive Summary page was not written: ${summaryError}.`,
          }
        : {
            kind: 'done',
            message: ordered.length
              ? `Filled ${ordered.join(', ')}.${written.includes(PART_LABELS.executiveSummary) ? ' The Executive Summary page change is in its draft: open it from the Executive Summary tab and publish it with the report.' : ''} Check every figure and sentence against the report before publishing.`
              : 'Nothing was written.',
          },
    )
  }, [chosen, client, onChange, preview, reportId, summaryId])

  // The first Page content field the form shows: the panel renders above it.
  const firstPageField = useMemo(() => {
    const inGroup = new Set(
      schemaType.fields
        .filter((item) => {
          const group = (item as { group?: string | string[] }).group

          return Array.isArray(group) ? group.includes(PAGE_GROUP) : group === PAGE_GROUP
        })
        .map((item) => item.name),
    )

    for (const member of members) {
      if (member.kind === 'field' && inGroup.has(member.name)) {
        return member.name
      }
    }

    return null
  }, [members, schemaType.fields])

  const needsSummary = summaryState.kind === 'none' || summaryState.kind === 'missing' || summaryState.kind === 'shared'
  const summaryReady = summaryState.kind === 'ready' || summaryState.kind === 'shared'

  const panel: ReactNode = (
    <Card padding={4} radius={2} border tone="transparent">
      <Stack gap={3}>
        {needsSummary ? (
          <Card padding={3} radius={2} tone="caution" border>
            <Stack gap={3}>
              <Text size={1}>
                {summaryState.kind === 'shared'
                  ? `The Executive Summary page is also used by “${summaryState.title}”, so Generate will not write it. Create this report’s own page.`
                  : summaryState.kind === 'missing'
                    ? 'The Executive Summary page this report pointed at no longer exists. Create the Executive Summary page first.'
                    : 'Create the Executive Summary page first.'}{' '}
                It is created as an empty draft and published separately: publish it before the report.
              </Text>
              <Box>
                <Button
                  icon={AddIcon}
                  text="Create Executive Summary page"
                  mode="ghost"
                  loading={creating}
                  disabled={readOnly || creating || running}
                  onClick={() => void createSummary()}
                />
              </Box>
            </Stack>
          </Card>
        ) : null}

        {summaryState.kind === 'failed' ? (
          <Card padding={3} radius={2} tone="critical" border role="alert">
            <Stack gap={3}>
              <Text size={1}>Could not check the Executive Summary page: {summaryState.message}.</Text>
              <Box>
                <Button text="Check again" mode="ghost" onClick={() => setRecheck((count) => count + 1)} />
              </Box>
            </Stack>
          </Card>
        ) : null}

        <Box>
          <Button
            icon={SparklesIcon}
            text="Generate from report text"
            tone="primary"
            loading={running}
            disabled={readOnly || running || creating || settings.kind !== 'ready' || !summaryReady}
            onClick={() => void start()}
          />
        </Box>
        <Text size={1} muted>
          Drafts the executive summary, the Executive Summary page, key findings, charts, selected insights and methodology
          from the Report text in Details. You choose what to fill before anything is written. Uses one AI credit and can
          take a minute.
        </Text>


        {status.kind === 'error' ? (
          <Card padding={3} radius={2} tone="critical" border role="alert">
            <Text size={1}>{status.message}</Text>
          </Card>
        ) : null}

        {status.kind === 'done' ? (
          <Card padding={3} radius={2} tone="positive" border role="status" aria-live="polite">
            <Text size={1}>{status.message}</Text>
          </Card>
        ) : null}
      </Stack>
    </Card>
  )

  const renderField = useCallback<RenderFieldCallback>(
    (fieldProps) => {
      const rendered = props.renderField(fieldProps)

      return fieldProps.path.length === 1 && fieldProps.name === firstPageField ? (
        <Stack gap={5}>
          {panel}
          {rendered}
        </Stack>
      ) : (
        rendered
      )
    },
    // `panel` is rebuilt with the state it shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.renderField, firstPageField, settings, status, running, readOnly, summaryState, creating],
  )

  return (
    <>
      {renderDefault({ ...props, renderField })}

      {asking ? (
        <Dialog
          id="research-generate-confirm"
          header="Generate from report text?"
          width={1}
          onClose={() => setAsking(null)}
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button text="Cancel" mode="ghost" onClick={() => setAsking(null)} />
              <Button text="Generate" tone="primary" onClick={() => void run()} />
            </Flex>
          }
        >
          <Box padding={4}>
            <Text size={1}>
              {asking.join(', ')} already {asking.length > 1 ? 'have' : 'has'} content. Generating uses one AI credit and
              replaces nothing by itself: you tick each part to replace in the next step.
            </Text>
          </Box>
        </Dialog>
      ) : null}

      {preview ? (
        <Dialog
          id="research-generate-preview"
          header="Fill the report from the draft?"
          width={2}
          onClose={() => setPreview(null)}
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button text="Cancel" mode="ghost" onClick={() => setPreview(null)} />
              <Button
                text={chosen.size ? `Fill ${chosen.size} part${chosen.size > 1 ? 's' : ''}` : 'Fill'}
                tone="primary"
                disabled={chosen.size === 0}
                onClick={() => void apply()}
              />
            </Flex>
          }
        >
          <Stack gap={4} padding={4}>
            <Text size={1} muted>
              Tick the parts to fill. A ticked part is replaced as a whole. Parts the report text gives nothing for are left
              as they are.
              {preview.truncated
                ? ` Only the first ${MAX_RESEARCH_SOURCE_CHARS.toLocaleString('en-GB')} characters of the report text were read.`
                : ''}
            </Text>

            {PART_ORDER.map((part) => {
              const lines = generatedLines(preview.generation, part)
              const summaryDoc = preview.summary.kind === 'ready' ? preview.summary.doc : null
              const existing = currentContent(part, resource, summaryDoc)
              const noSummaryDoc = part === 'executiveSummary' && !summaryDoc

              return (
                <Card key={part} padding={3} radius={2} border tone={chosen.has(part) && existing ? 'caution' : 'default'}>
                  <Stack gap={3}>
                    <Flex gap={3} align="center">
                      <Checkbox
                        id={`research-generate-${part}`}
                        checked={chosen.has(part)}
                        disabled={lines.length === 0 || noSummaryDoc}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked
                          setChosen((previous) => {
                            const next = new Set(previous)

                            if (checked) {
                              next.add(part)
                            } else {
                              next.delete(part)
                            }

                            return next
                          })
                        }}
                      />
                      <Text size={1} weight="semibold">
                        <label htmlFor={`research-generate-${part}`}>
                          {PART_LABELS[part]}
                          {lines.length === 0
                            ? ' – nothing in the report text for it, left as it is'
                            : noSummaryDoc
                              ? preview.summary.kind === 'shared'
                                ? ` – the page is also used by “${preview.summary.title}”, so it is not written here`
                                : ' – create the Executive Summary page first'
                              : existing
                                ? ` – ${existing} now; ticking replaces it`
                                : ''}
                          {part === 'executiveSummary' && lines.length > 0 && !noSummaryDoc
                            ? '. Saved as a draft of the Executive Summary page: publish that page separately.'
                            : ''}
                        </label>
                      </Text>
                    </Flex>
                    {lines.map((text, index) => (
                      <Text key={index} size={1} muted>
                        {clip(text)}
                      </Text>
                    ))}
                  </Stack>
                </Card>
              )
            })}

            {preview.generation.dropped.length > 0 ? (
              <Card padding={3} radius={2} tone="caution" border>
                <Stack gap={3}>
                  <Text size={1} weight="semibold">
                    Left out by the checks ({preview.generation.dropped.length})
                  </Text>
                  {preview.generation.dropped.map((text, index) => (
                    <Text key={index} size={1}>
                      {text}
                    </Text>
                  ))}
                </Stack>
              </Card>
            ) : null}

            {preview.generation.warnings.length > 0 ? (
              <Card padding={3} radius={2} tone="caution" border>
                <Stack gap={3}>
                  <Text size={1} weight="semibold">
                    Check before publishing
                  </Text>
                  {preview.generation.warnings.map((text, index) => (
                    <Text key={index} size={1}>
                      {text}
                    </Text>
                  ))}
                </Stack>
              </Card>
            ) : null}
          </Stack>
        </Dialog>
      ) : null}
    </>
  )
}
