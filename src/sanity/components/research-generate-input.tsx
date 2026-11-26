import { SparklesIcon } from '@sanity/icons/Sparkles'
import { Box, Button, Card, Checkbox, Dialog, Flex, Stack, Text } from '@sanity/ui'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type FormPatch, type ObjectInputProps, type RenderFieldCallback, set, unset, useClient } from 'sanity'

import {
  MIN_RESEARCH_SOURCE_CHARS,
  MAX_RESEARCH_SOURCE_CHARS,
  RESEARCH_GENERATION_SETTINGS_ID,
  type ResearchGeneration,
  buildResearchGenerationRequest,
  draftToResourceFields,
  draftToSummaryFields,
  parseResearchResponse,
  resourceToResearchSource,
} from '@/lib/research-generation-prompt'
import { RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT } from '@/lib/research-generation-instructions'
import { hasExecutiveSummary } from '@/lib/research-report'
import { apiVersion } from '@/sanity/env'

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
 * it. Every part, the Executive Summary page included, is a field of this report (the page's are `summaryLead`,
 * `summaryIntro` and `summarySections` in the "Executive summary page" tab), so all of them are written by one
 * `onChange` and published with the report.
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
  summaryLead?: unknown[] | null
  summaryIntro?: unknown[] | null
  summarySections?: { heading?: string | null; body?: unknown[] | null }[] | null
}

type PartKey = 'summary' | 'executiveSummary' | 'keyFindings' | 'charts' | 'insights' | 'methodology'

const PART_LABELS: Record<PartKey, string> = {
  summary: 'Short summary',
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
}

const count = (value: unknown[] | null | undefined) => (Array.isArray(value) ? value.length : 0)

const hasBlockText = (blocks: Block[] | null | undefined) =>
  (blocks ?? []).some((block) => (block.children ?? []).some((child) => child.text?.trim()))

/** What a part holds in the document now, or null when it is empty. */
function currentContent(part: PartKey, resource: Resource): string | null {
  switch (part) {
    case 'summary':
      return hasBlockText(resource.summary) ? 'has text' : null
    case 'executiveSummary':
      return hasExecutiveSummary({
        lead: resource.summaryLead,
        intro: resource.summaryIntro,
        sections: resource.summarySections,
      })
        ? 'has content'
        : null
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

      const report = latest.current

      // Ticked at first: every part the answer fills that is empty now. A part with content waits for a tick.
      setChosen(
        new Set(
          PART_ORDER.filter(
            (part) => generatedLines(result.value, part).length > 0 && currentContent(part, report) === null,
          ),
        ),
      )
      setPreview({ generation: result.value, truncated: source.truncated })
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
  }, [agent, loadSettings])

  const start = useCallback(() => {
    const filled = PART_ORDER.filter((part) => currentContent(part, latest.current) !== null)

    if (filled.length > 0) {
      setAsking(filled.map((part) => PART_LABELS[part]))
    } else {
      void run()
    }
  }, [run])

  const apply = useCallback(() => {
    if (!preview) {
      return
    }

    const { draft } = preview.generation
    const fields = { ...draftToResourceFields(draft), ...draftToSummaryFields(draft) }
    const patches: FormPatch[] = []
    const written: string[] = []
    const field = (name: keyof typeof fields) => patches.push(fields[name] === undefined ? unset([name]) : set(fields[name], [name]))

    for (const part of chosen) {
      if (part === 'executiveSummary') {
        field('summaryLead')
        field('summaryIntro')
        field('summarySections')
      } else if (part === 'methodology') {
        field('methodologyIntro')
        field('methodology')
      } else {
        field(part)
      }

      written.push(PART_LABELS[part])
    }

    setPreview(null)

    if (patches.length > 0) {
      onChange(patches)
    }

    const ordered = PART_ORDER.map((part) => PART_LABELS[part]).filter((label) => written.includes(label))

    setStatus({
      kind: 'done',
      message: ordered.length
        ? `Filled ${ordered.join(', ')}.${written.includes(PART_LABELS.executiveSummary) ? ' The Executive Summary page is in the Executive summary page tab.' : ''} Check every figure and sentence against the report before publishing.`
        : 'Nothing was written.',
    })
  }, [chosen, onChange, preview])

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

  const panel: ReactNode = (
    <Card padding={4} radius={2} border tone="transparent">
      <Stack gap={3}>
        <Box>
          <Button
            icon={SparklesIcon}
            text="Generate from report text"
            tone="primary"
            loading={running}
            disabled={readOnly || running || settings.kind !== 'ready'}
            onClick={start}
          />
        </Box>
        <Text size={1} muted>
          Drafts the short summary, the Executive Summary page, key findings, charts, selected insights and methodology
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
    [props.renderField, firstPageField, settings, status, running, readOnly],
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
              const existing = currentContent(part, resource)

              return (
                <Card key={part} padding={3} radius={2} border tone={chosen.has(part) && existing ? 'caution' : 'default'}>
                  <Stack gap={3}>
                    <Flex gap={3} align="center">
                      <Checkbox
                        id={`research-generate-${part}`}
                        checked={chosen.has(part)}
                        disabled={lines.length === 0}
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
                            : existing
                              ? ` – ${existing} now; ticking replaces it`
                              : ''}
                          {part === 'executiveSummary' && lines.length > 0
                            ? '. Goes into the Executive summary page tab of this report.'
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
