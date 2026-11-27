import { serializeJsonLd, type JsonLdGraph } from '@/lib/json-ld'

/**
 * Structured data for search engines as a `<script type="application/ld+json">`, rendered in the server HTML. A plain
 * script element, not next/script: it is data, not code to load. Nothing renders without data.
 */
export function JsonLd({ data }: { data: JsonLdGraph | null | undefined }) {
  if (!data) {
    return null
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
