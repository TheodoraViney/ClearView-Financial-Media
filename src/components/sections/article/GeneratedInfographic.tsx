import { stegaClean } from 'next-sanity'

import { cx } from '@/components/ui/cx'
import { sanitizeSvg } from '@/lib/svg-sanitize'

export type GeneratedInfographicProps = {
  eyebrow?: string | null
  /** Visible heading above the diagram, and the SVG's own `<title>`. */
  title?: string | null
  /** Visible text under the title, and the SVG's own `<desc>`. */
  description?: string | null
  /** Landscape SVG for containers from 560px (`@infographic`): tablet and desktop. */
  wide?: string | null
  /** Portrait SVG for narrower containers: mobile. */
  narrow?: string | null
}

/**
 * Article infographic generated as SVG. Both variants are sanitised again here, whatever the Studio already did,
 * because the Content API accepts writes that never ran Studio code. A variant the sanitiser refuses falls back to
 * the other one; with neither, the block renders nothing (as does a block saved before the SVG block existed).
 *
 * Both variants are in the markup and the container width shows one (`display: none` on the other, so screen
 * readers meet the diagram once). The SVG keeps real `<text>`; its `<title>` and `<desc>` are replaced with the
 * block's title and description, so they follow the editor's edits. It scales to the column width with its height
 * from the viewBox, and paints only with the brand's colour custom properties.
 */
export function GeneratedInfographic({ eyebrow, title, description, wide, narrow }: GeneratedInfographicProps) {
  // Visible text keeps its stega for click-to-edit; the copies inside the SVG are cleaned.
  const text = { title: stegaClean(title), description: stegaClean(description) }
  const wideSvg = sanitizeVariant(wide, text)
  const narrowSvg = sanitizeVariant(narrow, text)
  const small = narrowSvg ?? wideSvg
  const large = wideSvg ?? narrowSvg

  if (!small || !large) {
    return null
  }

  const svg = (markup: string, className: string) => (
    // The markup is our own serialisation of an allowlisted tree (src/lib/svg-sanitize.ts), never the input.
    <div className={cx(className, '*:block *:h-auto *:w-full')} dangerouslySetInnerHTML={{ __html: markup }} />
  )

  return (
    <figure data-flow="block" className="@container m-0 min-w-0">
      <div className="flex flex-col gap-8 rounded-sm border border-border bg-white px-4 py-5 @infographic:p-8">
        {(eyebrow || title || description) && (
          <div className="flex min-w-0 flex-col gap-3">
            {eyebrow && <span className="text-caption leading-none font-medium text-grey">{eyebrow}</span>}
            {title && <span className="text-title-lg font-medium break-words text-balance">{title}</span>}
            {description && <span className="text-base leading-copy text-pretty text-grey">{description}</span>}
          </div>
        )}
        {svg(small, '@infographic:hidden')}
        {svg(large, 'hidden @infographic:block')}
      </div>
    </figure>
  )
}

/** One variant's sanitised markup, or null on a refusal or any error: a bad variant never breaks the article. */
function sanitizeVariant(
  value: string | null | undefined,
  text: { title?: string | null; description?: string | null },
): string | null {
  try {
    // In draft mode Visual Editing appends zero-width stega characters to strings, which after `</svg>` would make
    // the sanitiser refuse the whole document. The SVG is not click-to-edit, so it is cleaned before parsing.
    return typeof value === 'string' ? sanitizeSvg(stegaClean(value), text) : null
  } catch {
    return null
  }
}
