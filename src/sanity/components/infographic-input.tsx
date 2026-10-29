import { SparklesIcon } from '@sanity/icons/Sparkles'
import { Box, Button, Card, Dialog, Flex, Stack, Tab, TabList, TabPanel, Text } from '@sanity/ui'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type FormPatch, type ObjectInputProps, set, setIfMissing, useClient, useFormValue } from 'sanity'

import { BRANDS, brandColorVars, isEditorialBrandKey } from '@/brands'
import { INFOGRAPHIC_INSTRUCTIONS_DEFAULT } from '@/lib/infographic-instructions'
import {
  INFOGRAPHIC_SETTINGS_ID,
  MIN_ARTICLE_CHARS,
  buildInfographicRequest,
  parseInfographicResponse,
  postToArticle,
} from '@/lib/infographic-prompt'
import { sanitizeSvg } from '@/lib/svg-sanitize'
import { apiVersion } from '@/sanity/env'

/**
 * The infographic block's form, in the editor's order: Eyebrow, the Generate / Regenerate button, Title, Description,
 * then a preview of the diagram with a Desktop / Mobile switch. The fields are the default inputs, rendered in two
 * groups around the button.
 *
 * Generate reads the whole post from the form (title, standfirst, body as plain text) and the published "Infographic
 * instructions" document, and calls the Agent Actions Prompt action as the signed-in user. Both SVGs must pass the
 * sanitiser, or nothing is written. Then the block is patched through the form, so the change lands in the draft like
 * any edit and document history can undo it.
 *
 * Regenerate always replaces both SVGs and the generation metadata. A title or description the editor has changed
 * since the last generation (present and different from `generation.*`) is kept unless the editor agrees to replace
 * it; the dialog asks before the request, so nobody waits 20 seconds for a question.
 */

type TextField = 'title' | 'description'

const TEXT_FIELDS: readonly TextField[] = ['title', 'description']

/** Rendered above the button; every other visible field goes below it. */
const ABOVE_BUTTON = new Set(['eyebrow'])

type Value = Partial<Record<TextField | 'wide' | 'narrow', string>> & {
  generation?: Partial<Record<TextField | 'type' | 'generatedAt', string>>
}

type Post = Parameters<typeof postToArticle>[0] & { brands?: string[] }

type Status =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

type Device = 'desktop' | 'mobile'

/** Changed by the editor since the last generation: present and not what the AI wrote. */
function isEdited(value: Value | undefined, field: TextField): boolean {
  const current = value?.[field]?.trim()

  return Boolean(current) && current !== (value?.generation?.[field] ?? '').trim()
}

/** "title" or "title and description". */
const listOf = (fields: readonly string[]) => fields.join(' and ')

export function InfographicInput(props: ObjectInputProps) {
  const { onChange, readOnly, renderDefault } = props
  const value = props.value as Value | undefined
  const post = useFormValue([]) as Post | undefined
  const client = useClient({ apiVersion })
  const agentClient = useClient({ apiVersion: 'vX' })
  const agent = useMemo(() => agentClient.withConfig({ ignoreWarnings: 'experimental' }), [agentClient])

  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  // Fields the editor changed, while the dialog asks whether to replace them.
  const [asking, setAsking] = useState<TextField[] | null>(null)

  // The block as it is when the answer arrives: the editor may type while the request runs.
  const latest = useRef(value)

  useEffect(() => {
    latest.current = value
  }, [value])

  // One request at a time, whatever is clicked twice (each request is a credit), and no patch once the form is gone:
  // the editor may close the block, delete it or leave the document during the call.
  const inFlight = useRef(false)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false

    return () => {
      unmounted.current = true
    }
  }, [])

  const generated = Boolean(value?.wide || value?.narrow)
  const running = status.kind === 'running'

  const run = useCallback(
    async (replace: readonly TextField[]) => {
      setAsking(null)

      if (inFlight.current) {
        return
      }

      const article = postToArticle(post ?? {})

      if (article.text.length < MIN_ARTICLE_CHARS) {
        setStatus({ kind: 'error', message: 'Write the article first: the AI needs at least a few paragraphs to draw from.' })
        return
      }

      inFlight.current = true
      setStatus({ kind: 'running' })

      try {
        const stored = await client.fetch<string | null>('*[_id == $id][0].instructions', { id: INFOGRAPHIC_SETTINGS_ID })
        const request = buildInfographicRequest({
          instructions: stored?.trim() || INFOGRAPHIC_INSTRUCTIONS_DEFAULT,
          article,
        })
        const result = parseInfographicResponse(await agent.agent.action.prompt(request))

        if (!result.ok) {
          setStatus({ kind: 'error', message: result.error })
          return
        }

        const next = result.value
        const current = latest.current

        if (unmounted.current || !current) {
          return
        }
        const kept: TextField[] = []
        const patches: FormPatch[] = [
          setIfMissing({ _type: 'infographic' }),
          set(next.wide, ['wide']),
          set(next.narrow, ['narrow']),
          set(
            { type: next.type, generatedAt: new Date().toISOString(), title: next.title, description: next.description },
            ['generation'],
          ),
        ]

        for (const field of TEXT_FIELDS) {
          if (isEdited(current, field) && !replace.includes(field)) {
            kept.push(field)
          } else {
            patches.push(set(next[field], [field]))
          }
        }

        onChange(patches)
        setStatus({
          kind: 'done',
          message: `Generated a ${next.type} diagram.${kept.length > 0 ? ` Kept your ${listOf(kept)}.` : ''} Check the texts and the previews before publishing.`,
        })
      } catch (error) {
        setStatus({
          kind: 'error',
          message: `The AI request failed: ${error instanceof Error ? error.message : String(error)}. Try again in a minute.`,
        })
      } finally {
        inFlight.current = false
      }
    },
    [agent, client, onChange, post],
  )

  const start = useCallback(() => {
    const edited = TEXT_FIELDS.filter((field) => isEdited(value, field))

    if (generated && edited.length > 0) {
      setAsking(edited)
    } else {
      void run([])
    }
  }, [generated, run, value])

  const [device, setDevice] = useState<Device>('desktop')

  // The post's first brand colours the preview, as on its site.
  const brand = post?.brands?.find(isEditorialBrandKey)
  const previewStyle = useMemo<CSSProperties>(
    () => ({ ...(brand ? brandColorVars(BRANDS[brand].colors) : {}), background: '#ffffff', color: 'var(--foreground)' }),
    [brand],
  )
  const wide = useMemo(() => sanitizeSvg(value?.wide), [value?.wide])
  const narrow = useMemo(() => sanitizeSvg(value?.narrow), [value?.narrow])
  const shown = device === 'desktop' ? wide : narrow

  const fields = (above: boolean) =>
    renderDefault({
      ...props,
      members: props.members.filter((member) => member.kind === 'field' && ABOVE_BUTTON.has(member.name) === above),
    })

  return (
    <Stack gap={5}>
      {fields(true)}

      <Stack gap={3}>
        <Box>
          <Button
            icon={SparklesIcon}
            text={generated ? 'Regenerate' : 'Generate'}
            tone="primary"
            loading={running}
            disabled={readOnly || running}
            onClick={start}
          />
        </Box>
        <Text size={1} muted>
          Generates the title, description and diagram from the article text. Takes about 20 seconds.
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

      {fields(false)}

      {generated ? (
        <Stack gap={3}>
          <TabList gap={2}>
            {(['desktop', 'mobile'] as const).map((key) => (
              <Tab
                key={key}
                id={`infographic-preview-${key}-tab`}
                aria-controls="infographic-preview-panel"
                label={key === 'desktop' ? 'Desktop' : 'Mobile'}
                selected={device === key}
                onClick={() => setDevice(key)}
              />
            ))}
          </TabList>
          <TabPanel id="infographic-preview-panel" aria-labelledby={`infographic-preview-${device}-tab`}>
            {shown ? (
              // Desktop shows the wide variant at its full 640 units; Mobile the narrow one in a phone-width frame.
              <Card padding={3} radius={2} border style={{ maxWidth: device === 'desktop' ? 666 : 360 }}>
                {/* The markup is the sanitiser's own serialisation of an allowlisted tree, never the stored input.
                    The SVG has no width or height, so it fills the box at its viewBox's aspect ratio. */}
                <div data-brand={brand} style={{ ...previewStyle, display: 'grid' }} dangerouslySetInnerHTML={{ __html: shown }} />
              </Card>
            ) : (
              <Card padding={3} radius={2} tone="caution" border>
                <Text size={1}>This diagram fails the SVG check and will not show on the site. Regenerate it.</Text>
              </Card>
            )}
          </TabPanel>
        </Stack>
      ) : null}

      {asking ? (
        <Dialog
          id="infographic-replace-edited"
          header="Replace your edits?"
          width={1}
          onClose={() => setAsking(null)}
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button text="Cancel" mode="bleed" onClick={() => setAsking(null)} />
              <Button text="Keep my edits" mode="ghost" onClick={() => void run([])} />
              <Button text="Replace them" tone="primary" onClick={() => void run(asking)} />
            </Flex>
          }
        >
          <Box padding={4}>
            <Text size={1}>
              You changed the {listOf(asking)} since the last generation. Regenerate always replaces the diagram.
              Should it also replace your {listOf(asking)} with the new suggestions?
            </Text>
          </Box>
        </Dialog>
      ) : null}
    </Stack>
  )
}
