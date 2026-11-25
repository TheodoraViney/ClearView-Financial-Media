import { stegaClean } from '@sanity/client/stega'

/** One table of contents entry: a heading's anchor id, its text and its level. */
export type TocItem = { id: string; label: string; level: 2 | 3 }

type BodyMember = {
  _key: string
  _type: string
  style?: string | null
  children?: { text?: string | null }[] | null
}

/** "How can I control cookies?" → "how-can-i-control-cookies". Accents are dropped; an empty result is "section". */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

/**
 * Anchor ids for a Portable Text body's H2 and H3 headings, by block key, and the table of contents they make.
 * Ids are slugs of the stega-cleaned heading text, made unique with -2, -3. A heading's trailing colon is left out
 * of its contents label ("Data controller:" → "Data controller"), as the design lists them.
 */
export function headingAnchors(
  body: readonly BodyMember[] | null | undefined,
): {
  ids: Record<string, string>
  items: TocItem[]
} {
  const ids: Record<string, string> = {}
  const items: TocItem[] = []
  const used = new Map<string, number>()
  const taken = new Set<string>()

  for (const member of body ?? []) {
    const style = stegaClean(member.style)

    if (member._type !== 'block' || (style !== 'h2' && style !== 'h3')) {
      continue
    }

    const text = stegaClean((member.children ?? []).map((child) => child.text ?? '').join('')).trim()

    if (!text) {
      continue
    }

    const base = slugify(text)
    let count = used.get(base) ?? 0
    let id = base

    // A literal "Terms 2" heading must not take the id a second "Terms" would get, or the reverse.
    while (count > 0 ? taken.has((id = `${base}-${count + 1}`)) : taken.has(id)) {
      count += 1
    }

    used.set(base, count + 1)
    taken.add(id)
    ids[member._key] = id
    items.push({ id, label: text.replace(/\s*:$/, ''), level: style === 'h2' ? 2 : 3 })
  }

  return { ids, items }
}
