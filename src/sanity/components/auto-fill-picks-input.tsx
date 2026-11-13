import { PinIcon } from '@sanity/icons/Pin'
import { Box, Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useMemo, useState } from 'react'
import { type ArrayOfObjectsInputProps, insert, PatchEvent, setIfMissing, useClient, useFormValue } from 'sanity'

import { formatDay, formatMediumDate, ukToday } from '@/lib/dates'
import { type AutoFillItem, type AutoFillResult, autoFillSpec } from '@/sanity/auto-fill'
import { apiVersion, dataset, projectId } from '@/sanity/env'

/**
 * Picks field input for every block that fills its empty places automatically (Top stories, News Analysis, News in
 * Brief, Weekly Roundup, Top Picks, Highlights, Explore cards), and the award category page's awards programmes. Renders the default array input, then a panel
 * "Shown automatically now" with the items the site fills in right now, in site order, computed with the site's own
 * fill queries and counts (src/sanity/auto-fill.ts) against published content.
 *
 * "Pin" / "Pin these" append those items as references (or as pick objects holding one, per the spec) to the picks, so the editor can take them over and reorder
 * them. Nothing is written unless the editor clicks; empty places keep filling automatically as before.
 */

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; items: AutoFillItem[] }
  | { status: 'error' }

type Block = Record<string, unknown> & { _type?: string }
type RefItem = Record<string, unknown> & { _ref?: string }

const DEBOUNCE_MS = 400

// `image-<hash>-<width>x<height>-<ext>` → a small square thumbnail from the Sanity CDN.
const ASSET_REF = /^image-([0-9a-f]+)-(\d+x\d+)-([a-z0-9]+)$/

function thumbnailUrl(ref: string | null | undefined): string | null {
  const match = ref ? ASSET_REF.exec(ref) : null

  return match ? `https://cdn.sanity.io/images/${projectId}/${dataset}/${match[1]}-${match[2]}.${match[3]}?w=66&h=66&fit=crop&auto=format` : null
}

function dateOf(item: AutoFillItem): string | null {
  if (item._type === 'post' || item._type === 'resource') {
    return formatMediumDate(item.publishedAt)
  }

  return formatDay(item.startDate) ?? formatMediumDate(item.publishedAt)
}

const randomKey = () => Math.random().toString(36).slice(2, 14).padEnd(12, '0')

export function AutoFillPicksInput(props: ArrayOfObjectsInputProps) {
  const { path, onChange, value, readOnly } = props
  const block = useFormValue(path.slice(0, -1)) as Block | undefined
  const formBrand = useFormValue(['brand']) as string | undefined
  const field = String(path[path.length - 1])
  const spec = autoFillSpec(block?._type, field)
  const brand = spec?.brand ?? formBrand
  // Published content only, as the live site sees it; no CDN, so a publish shows at once.
  const client = useClient({ apiVersion })
  const published = useMemo(() => client.withConfig({ perspective: 'published', useCdn: false }), [client])
  const [state, setState] = useState<LoadState>({ status: 'idle' })

  // Re-run when anything in the block changes (picks, category, source, count) or the page brand does.
  const blockKey = JSON.stringify(block ?? null)

  useEffect(() => {
    if (!spec || !block || !brand) {
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      setState((current) => (current.status === 'ready' ? current : { status: 'loading' }))
      const today = ukToday()

      published
        .fetch<AutoFillResult>(spec.query, { ...spec.params, block, brand, today })
        .then((result) => {
          if (!cancelled) {
            setState({ status: 'ready', items: spec.select(result, block, brand, today) })
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({ status: 'error' })
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // blockKey stands for block; spec follows block._type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKey, brand, published])

  const current = (value ?? []) as RefItem[]
  const room = spec && block && brand ? Math.max(0, spec.max(block, brand) - current.length) : 0

  // Picks are plain references, or objects holding one in `spec.pin.field`.
  const pinAs = spec?.pin
  const refOf = (item: RefItem) => (pinAs ? (item[pinAs.field] as RefItem | undefined)?._ref : item._ref)

  const pin = (items: AutoFillItem[]) => {
    const taken = new Set(current.map(refOf))
    const refs = items
      .filter((item) => !taken.has(item._id))
      .slice(0, room)
      .map((item) =>
        pinAs
          ? { _type: pinAs.type, _key: randomKey(), [pinAs.field]: { _type: 'reference', _ref: item._id } }
          : { _type: 'reference', _ref: item._id, _key: randomKey() },
      )

    if (refs.length > 0) {
      onChange(PatchEvent.from([setIfMissing([]), insert(refs, 'after', [-1])]))
    }
  }

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      {spec && brand && (
        <Card padding={3} radius={2} border tone="transparent">
          <Stack gap={3}>
            <Flex align="center" gap={2}>
              <Box flex={1}>
                <Stack gap={2}>
                  <Text size={1} weight="medium">
                    Shown automatically now
                  </Text>
                  <Text size={0} muted>
                    {spec.hint ?? 'Fills the empty places on the site. Published posts only.'}
                  </Text>
                </Stack>
              </Box>
              {state.status === 'ready' && state.items.length > 0 && !readOnly && room > 0 && (
                <Button
                  icon={PinIcon}
                  mode="ghost"
                  fontSize={1}
                  padding={2}
                  text={state.items.length > 1 ? 'Pin these' : 'Pin'}
                  onClick={() => pin(state.items)}
                />
              )}
            </Flex>

            {state.status === 'loading' || state.status === 'idle' ? (
              <Text size={1} muted>
                Loading…
              </Text>
            ) : state.status === 'error' ? (
              <Text size={1} muted>
                Could not load the automatic items.
              </Text>
            ) : state.items.length === 0 ? (
              <Text size={1} muted>
                Nothing fills automatically: the picks take every place, or nothing matches.
              </Text>
            ) : (
              <Stack gap={2}>
                {state.items.map((item) => (
                  <AutoFillRow
                    key={item._id}
                    item={item}
                    onPin={!readOnly && room > 0 ? () => pin([item]) : undefined}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}

function AutoFillRow({ item, onPin }: { item: AutoFillItem; onPin?: () => void }) {
  const thumbnail = thumbnailUrl(item.image)
  const date = item.subtitle || dateOf(item)

  return (
    <Flex align="center" gap={3}>
      {thumbnail ? (
        <Box style={{ width: 33, height: 33, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
          {/* Studio, not a site page: a plain CDN thumbnail, as Studio previews do. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail} alt="" width={33} height={33} style={{ display: 'block', objectFit: 'cover' }} />
        </Box>
      ) : null}
      <Box flex={1}>
        <Stack gap={2}>
          <Text size={1} textOverflow="ellipsis">
            {item.title || 'Untitled'}
          </Text>
          {date && (
            <Text size={0} muted>
              {date}
            </Text>
          )}
        </Stack>
      </Box>
      {onPin && <Button mode="bleed" fontSize={1} padding={2} text="Pin" onClick={onPin} />}
    </Flex>
  )
}
