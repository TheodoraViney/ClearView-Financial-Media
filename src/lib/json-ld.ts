import { stegaClean } from 'next-sanity'

/** One schema.org node. `@type` and `@id` as JSON-LD names them; everything else is the type's properties. */
export type JsonLdNode = { '@type': string; '@id'?: string } & { [property: string]: unknown }

/** A page's structured data: its nodes in one `@graph`. */
export type JsonLdGraph = { '@context': 'https://schema.org'; '@graph': JsonLdNode[] }

/** The nodes in one graph, empty entries dropped. Null when none is left, so the page renders no script. */
export function jsonLdGraph(nodes: (JsonLdNode | null | undefined | false)[]): JsonLdGraph | null {
  const graph = nodes.filter((node): node is JsonLdNode => Boolean(node))

  return graph.length > 0 ? { '@context': 'https://schema.org', '@graph': graph } : null
}

// Characters that could end the script element or start markup, and the two line terminators JavaScript once refused
// in strings: written as JSON escapes, which parse back to the same text.
const UNSAFE = /[<>&\u2028\u2029]/g
const escapeChar = (char: string) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`

/**
 * The script body for structured data: stega characters removed from every string, then JSON with `<`, `>`, `&`,
 * U+2028 and U+2029 escaped, so CMS text such as `</script>` cannot close the element.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(stegaClean(data)).replace(UNSAFE, escapeChar)
}
