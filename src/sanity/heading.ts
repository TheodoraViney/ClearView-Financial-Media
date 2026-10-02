import { stegaClean } from 'next-sanity'

import { type HeadingLevel, isHeadingLevel } from '@/lib/headings'

export type HeadingValue = { as: HeadingLevel; text: string }

type HeadingBlocks =
  | {
      style?: string | null
      children?: { text?: string | null }[] | null
    }[]
  | null
  | undefined

// Validation blocks publishing a non-heading style, but a draft in Presentation can still carry Normal (field cleared or text pasted) and the heading must not vanish from the preview.
const FALLBACK_LEVEL: HeadingLevel = 'h2'

/**
 * The first block of a `headingField()` value as a tag and plain text.
 *
 * Only the style is stega-cleaned; the text keeps stega so click-to-edit still
 * works. A missing or non-heading style renders as `FALLBACK_LEVEL`. Returns
 * null when there is no text.
 */
export function toHeading(blocks: HeadingBlocks): HeadingValue | null {
  const block = Array.isArray(blocks) ? blocks[0] : undefined

  if (!block) {
    return null
  }

  const text = (block.children ?? []).map((child) => child.text ?? '').join('')

  if (!stegaClean(text).trim()) {
    return null
  }

  const style = stegaClean(block.style)

  return { as: isHeadingLevel(style) ? style : FALLBACK_LEVEL, text }
}
