import { client } from './client'

/** `/resource/{report}/{summary}`: the two segments, else null. */
const SUMMARY_PATH = /^\/resource\/([^/]+)\/([^/]+)$/

const decode = (value: string): string | null => {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/**
 * Whether the proxy should answer 404 for an Executive Summary URL before rendering. The summary route streams after
 * the layout, where its own 404 would go out as a 200. Summaries exist on ClearView only; there the proxy asks the
 * published dataset whether a report has that slug and that summary slug (RESEARCH_REPORT_QUERY's rule). False for
 * any other path, and on a query failure, so the page decides as before.
 */
export async function isMissingExecutiveSummary(pathname: string, isClearView: boolean): Promise<boolean> {
  const match = SUMMARY_PATH.exec(pathname)

  if (match && !isClearView) {
    return true
  }

  const slug = match ? decode(match[1]) : null
  const summary = match ? decode(match[2]) : null

  if (!slug || !summary) {
    return false
  }

  try {
    const found = await client.fetch<boolean>(
      `count(*[_type == "resource" && slug.current == $slug && coalesce(summarySlug.current, "executive-summary") == $summary]) > 0`,
      { slug, summary },
      { perspective: 'published', stega: false, useCdn: true },
    )

    return !found
  } catch {
    return false
  }
}
