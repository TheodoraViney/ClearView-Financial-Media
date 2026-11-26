import { Select, Stack, Text } from '@sanity/ui'
import type { ChangeEvent } from 'react'
import { type NumberInputProps, set, unset, useFormValue } from 'sanity'

import { HIGHLIGHTS_DEFAULT_COUNT, HIGHLIGHTS_ITEM_MAX, highlightsSourceOf } from '@/sanity/schema/blocks/shared'

/**
 * Number of items of a Highlights block as a select: "Default (N)", stored as empty, then 1 to the source's maximum.
 * The stored type stays `number` and the field validation is unchanged. A stored value the select does not offer (more
 * than the maximum, or not a whole number) stays shown and marked, so the editor sees what to fix.
 */
export function HighlightsCountInput(props: NumberInputProps) {
  const { value, onChange, readOnly, path, elementProps } = props
  const block = useFormValue(path.slice(0, -1)) as { source?: unknown } | undefined
  const source = highlightsSourceOf(block?.source)

  if (!source) {
    return (
      <Stack gap={2}>
        <Select id={elementProps.id} disabled value="">
          <option value="">Default</option>
        </Select>
        <Text size={1} muted>
          Choose a source first.
        </Text>
      </Stack>
    )
  }

  const max = HIGHLIGHTS_ITEM_MAX[source.value]
  const options = Array.from({ length: max }, (_, index) => index + 1)
  const offered = value === undefined || options.includes(value)
  const invalidLabel =
    typeof value === 'number' && Number.isInteger(value) && value > max ? `${value} (too many)` : `${value} (not valid)`

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.currentTarget.value

    onChange(next === '' ? unset() : set(Number(next)))
  }

  return (
    <Select
      id={elementProps.id}
      onFocus={elementProps.onFocus}
      onBlur={elementProps.onBlur}
      readOnly={readOnly}
      disabled={readOnly}
      value={value === undefined ? '' : String(value)}
      onChange={handleChange}
    >
      <option value="">Default ({HIGHLIGHTS_DEFAULT_COUNT[source.value]})</option>
      {options.map((count) => (
        <option key={count} value={String(count)}>
          {count}
        </option>
      ))}
      {!offered && (
        <option value={String(value)} disabled>
          {invalidLabel}
        </option>
      )}
    </Select>
  )
}
