import { SparklesIcon } from '@sanity/icons/Sparkles'
import { Box, Button, Card, Dialog, Flex, Stack, Text } from '@sanity/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type StringInputProps, set, useClient, useFormValue } from 'sanity'

import { BRIEF_INSTRUCTIONS_DEFAULT } from '@/lib/brief-instructions'
import {
  BRIEF_MAX_CHARS,
  BRIEF_SETTINGS_ID,
  MIN_BRIEF_ARTICLE_CHARS,
  buildBriefRequest,
  parseBriefResponse,
  postToBriefArticle,
} from '@/lib/brief-prompt'
import { apiVersion } from '@/sanity/env'

/**
 * The post's Brief field with a "Generate brief" button under it. The editor may type the brief, generate it, or
 * generate and then edit it.
 *
 * Generate reads the whole post from the form (headline, standfirst, body as plain text) and the published "Brief
 * instructions" document, and calls the Agent Actions Prompt action as the signed-in user: one request, one AI credit.
 * The answer is written through the form, so it lands in the draft like any edit and document history can undo it.
 *
 * A brief with text is never overwritten without asking: the dialog asks before the request (so no credit is spent on
 * a brief the editor keeps), and asks again if the editor changed the text while the request ran.
 */

type Post = Parameters<typeof postToBriefArticle>[0]

type Status =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

/** `before`: the field has text, asked before the request. `after`: the text changed during it; `brief` waits. */
type Asking = { kind: 'before' } | { kind: 'after'; brief: string }

const hasText = (value: string | undefined) => Boolean(value?.trim())

export function BriefTextInput(props: StringInputProps) {
  const { onChange, readOnly, renderDefault, value } = props
  const post = useFormValue([]) as Post | undefined
  const client = useClient({ apiVersion })
  const agentClient = useClient({ apiVersion: 'vX' })
  const agent = useMemo(() => agentClient.withConfig({ ignoreWarnings: 'experimental' }), [agentClient])

  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [asking, setAsking] = useState<Asking | null>(null)

  // The field as it is when the answer arrives: the editor may type while the request runs.
  const latest = useRef(value)

  useEffect(() => {
    latest.current = value
  }, [value])

  // One request at a time, whatever is clicked twice (each request is a credit), and no patch once the form is gone:
  // the editor may leave the document during the call.
  const inFlight = useRef(false)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false

    return () => {
      unmounted.current = true
    }
  }, [])

  const running = status.kind === 'running'

  const write = useCallback(
    (brief: string) => {
      setAsking(null)
      onChange(set(brief))

      const over = brief.length > BRIEF_MAX_CHARS
      setStatus({
        kind: 'done',
        message: over
          ? `Wrote the brief, but it is ${brief.length} characters, over the ${BRIEF_MAX_CHARS} limit that fits three lines in News in Brief. Shorten it before publishing.`
          : 'Wrote the brief. Check it against the article before publishing.',
      })
    },
    [onChange],
  )

  const run = useCallback(async () => {
    setAsking(null)

    if (inFlight.current) {
      return
    }

    const article = postToBriefArticle(post ?? {})

    if (article.text.length < MIN_BRIEF_ARTICLE_CHARS) {
      setStatus({ kind: 'error', message: 'Write the article first: the AI needs the standfirst and a few paragraphs.' })
      return
    }

    inFlight.current = true
    setStatus({ kind: 'running' })
    const before = latest.current ?? ''

    try {
      const stored = await client.fetch<string | null>('*[_id == $id][0].instructions', { id: BRIEF_SETTINGS_ID })
      const request = buildBriefRequest({ instructions: stored?.trim() || BRIEF_INSTRUCTIONS_DEFAULT, article })
      const result = parseBriefResponse(await agent.agent.action.prompt(request))

      if (unmounted.current) {
        return
      }

      if (!result.ok) {
        setStatus({ kind: 'error', message: result.error })
        return
      }

      const current = latest.current ?? ''

      if (hasText(current) && current !== before) {
        setStatus({ kind: 'idle' })
        setAsking({ kind: 'after', brief: result.value })
        return
      }

      write(result.value)
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
  }, [agent, client, post, write])

  const start = useCallback(() => {
    if (hasText(value)) {
      setAsking({ kind: 'before' })
    } else {
      void run()
    }
  }, [run, value])

  return (
    <Stack gap={3}>
      {renderDefault(props)}

      <Box>
        <Button
          icon={SparklesIcon}
          text="Generate brief"
          mode="ghost"
          loading={running}
          disabled={readOnly || running}
          onClick={start}
        />
      </Box>
      <Text size={1} muted>
        Writes a five-sentence brief from the article text. Uses one AI credit.
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

      {asking ? (
        <Dialog
          id="brief-replace"
          header="Replace your brief?"
          width={1}
          onClose={() => setAsking(null)}
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button text="Keep my brief" mode="ghost" onClick={() => setAsking(null)} />
              <Button
                text="Replace it"
                tone="primary"
                onClick={() => (asking.kind === 'after' ? write(asking.brief) : void run())}
              />
            </Flex>
          }
        >
          <Box padding={4}>
            <Text size={1}>
              {asking.kind === 'before'
                ? 'The brief already has text. Generating replaces it with a new brief from the article and uses one AI credit.'
                : 'You changed the brief while the new one was being written. Replace your text with the new brief?'}
            </Text>
          </Box>
        </Dialog>
      ) : null}
    </Stack>
  )
}
