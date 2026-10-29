/**
 * A Portable Text body as plain text for a model to read: headings marked with `#`, list items bulleted, pull
 * quotes and fact boxes kept as text. Infographics, images, video, embeds and ad breaks are left out, so a model
 * drawing a new infographic reads the article, not the old diagram. No DOM and no Sanity imports: it runs in the
 * Studio and in scripts.
 */

type PlainBlock = {
  _type: string
  style?: string | null
  listItem?: string | null
  children?: ({ text?: string | null } | null)[] | null
  quote?: string | null
  cite?: string | null
  title?: string | null
  facts?: ({ label?: string | null; value?: string | null } | null)[] | null
}

export function portableTextToPlain(blocks: readonly PlainBlock[] | null | undefined): string {
  const parts: string[] = []

  for (const block of blocks ?? []) {
    if (block._type === 'block') {
      const text = (block.children ?? []).map((child) => child?.text ?? '').join('')

      if (!text.trim()) {
        continue
      }

      if (block.style && /^h[1-6]$/.test(block.style)) {
        parts.push(`${'#'.repeat(Number(block.style[1]))} ${text}`)
      } else if (block.listItem) {
        parts.push(`${block.listItem === 'number' ? '1.' : '-'} ${text}`)
      } else if (block.style === 'blockquote') {
        parts.push(`> ${text}`)
      } else {
        parts.push(text)
      }
    } else if (block._type === 'pullQuote' && block.quote) {
      parts.push(`> "${block.quote}"${block.cite ? ` (${block.cite})` : ''}`)
    } else if (block._type === 'factBox' && block.facts?.length) {
      const facts = block.facts.map((fact) => `- ${fact?.label ?? ''}: ${fact?.value ?? ''}`).join('\n')
      parts.push(`Fact box${block.title ? `: ${block.title}` : ''}\n${facts}`)
    }
  }

  return parts.join('\n\n')
}
