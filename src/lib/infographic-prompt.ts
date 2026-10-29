import { portableTextToPlain } from './portable-text-plain'
import { SVG_ALLOWLIST, sanitizeSvgWithReport, type SvgColorToken } from './svg-sanitize'

/*
 * The infographic generator's request and response, shared by the Studio button
 * (src/sanity/components/infographic-input.tsx) and one-off scripts.
 *
 * The prompt is two halves. The editorial half (what to draw, diagram types, facts, labels, tone) lives in the
 * shared `infographic-settings` document, so editors change it without a deploy. The technical half below is the
 * contract the site and the sanitiser hold the output to: canvas sizes, colour tokens, the SVG allowlist and the JSON
 * shape. Its token and allowlist lists are read from src/lib/svg-sanitize.ts, so the prompt never asks for something
 * the sanitiser deletes.
 */

/** The shared "Infographic instructions" document, one for every brand. */
export const INFOGRAPHIC_SETTINGS_ID = 'infographic-settings'

/** Shorter articles give the model nothing to draw. */
export const MIN_ARTICLE_CHARS = 300
/** Longer text is cut: it costs the same credit and adds nothing a diagram can hold. */
const MAX_ARTICLE_CHARS = 20_000

const TEMPERATURE = 0.3

// ---------------------------------------------------------------------------------------------------------------
// Technical contract

const WIDE = { width: 640, minHeight: 240, maxHeight: 480 }
const NARROW = { width: 320, minHeight: 320, maxHeight: 900 }

/** What each colour token is for. Typed by the sanitiser's list, so a token it drops fails the type check here. */
const COLOR_USES: Partial<Record<SvgColorToken, string>> = {
  '--accent': 'The highlighted shape (hub box, the key bar, the current step), accent labels',
  '--accent-subtle': 'Light fills behind secondary shapes',
  '--secondary': 'A second data series',
  '--foreground': 'Main text',
  '--color-grey': 'Secondary text, units, axis labels',
  '--background': 'White: text on an accent fill, box fills',
  '--color-surface-subtle': 'Very light box fill',
  '--surface-hover': 'Light box fill, alternative',
  '--color-border': 'Box borders, gridlines',
  '--color-border-plus': 'Connectors and axis lines',
  '--color-light-blue-grey': 'A third data series or muted shapes',
  '--color-dark-blue-grey': 'A fourth data series',
}

/** Narrower guidance than the sanitiser accepts, for the attributes that need it. */
const TEXT_NOTES: Record<string, string> = {
  'font-size': 'a plain number',
  'font-weight': '`400`, `500`, `600` or `700`',
  'dominant-baseline': '`auto`, `middle`, `central`, `hanging`, `alphabetic`',
  'font-family': 'only `inherit`',
}

const code = (names: readonly string[]) => names.map((name) => `\`${name}\``).join(', ')

const colorRows = Object.entries(COLOR_USES)
  .map(([token, use]) => `| \`var(${token})\` | ${use} |`)
  .join('\n')

const textAttributes = SVG_ALLOWLIST.text
  .map((name) => (TEXT_NOTES[name] ? `\`${name}\` (${TEXT_NOTES[name]})` : `\`${name}\``))
  .join(', ')

/** Elements the prompt names as forbidden, so the model does not reach for the usual ones. None is allowlisted. */
const FORBIDDEN_ELEMENTS = ['defs', 'linearGradient', 'marker', 'use', 'image', 'a', 'style', 'script', 'foreignObject', 'filter', 'clipPath', 'mask', 'pattern', 'symbol', 'animate'].filter(
  (name) => !SVG_ALLOWLIST.elements.includes(name),
)

const INFOGRAPHIC_TECHNICAL_CONTRACT = `# Technical rules

You return the diagram as two hand-written inline SVG documents (a wide one and a narrow one) inside a JSON object. A strict sanitiser checks every element, attribute and value against the allowlist below and deletes anything else, so follow the rules exactly.

## Canvas and legibility

Draw two variants of the same diagram, with the same content and the same reading order:

- \`wide\`: landscape, for tablet and desktop. \`viewBox="0 0 ${WIDE.width} H"\` with H between ${WIDE.minHeight} and ${WIDE.maxHeight}. It is shown between about 500 and 660 px wide, so 1 unit is roughly 1 px.
  - Smallest text: font-size 15. Item and label text: 15 to 16. Key numbers: 24 to 40.
- \`narrow\`: portrait, for phones. \`viewBox="0 0 ${NARROW.width} H"\` with H between ${NARROW.minHeight} and ${NARROW.maxHeight}. It is shown between about 290 and 520 px wide.
  - Smallest text: font-size 13. Item and label text: 14 to 15. Key numbers: 22 to 32.
  - Stack things vertically. Do not shrink the wide layout: re-lay it out for a tall, narrow column.
- In \`wide\`, the content spans the full width: for example a horizontal timeline, or items in two or three columns. Never put everything in one left column and leave the right side empty.

Rules for both:

- Do not draw the overall diagram title as visible text inside the SVG. The page prints the title above the diagram. Put it only in \`<title>\`.
- SVG does not wrap text: break longer labels into lines yourself with \`<tspan x="..." dy="...">\`, line height about 1.3 × font-size.
- Estimate text width as 0.55 × font-size per character (0.6 for bold or digits) and leave at least 8 units of space to every edge and to neighbouring shapes. Nothing may overflow the viewBox or overlap other text.
- Align text with \`text-anchor\` and \`dominant-baseline\`; centre text in boxes.
- Keep spacing consistent: sibling cards and boxes get equal gaps between them and equal internal padding, and their sub-labels sit at the same offset from the top of each box.
- Use 2 or 4 unit corner radius (\`rx\`) on boxes, 1 unit strokes for borders and connectors.

## Colours

Paint only with these CSS custom properties, written exactly as \`var(--name)\`, or with \`none\` or \`currentColor\`. They change with the publication's brand, so never write a hex, rgb or named colour.

| Token | Use |
| --- | --- |
${colorRows}

Contrast rules for text:

- Text on \`var(--accent)\` uses only \`fill="var(--background)"\`.
- Text on \`var(--accent-subtle)\` or \`var(--surface-hover)\` uses only \`var(--foreground)\`.
- Do not put text on \`var(--secondary)\`, \`var(--color-light-blue-grey)\` or \`var(--color-dark-blue-grey)\` fills; label those shapes outside them.
- \`var(--color-grey)\` text is allowed only on white (\`var(--background)\` or no fill) or on \`var(--color-surface-subtle)\`.
- Short accent labels in \`var(--accent)\` sit only on white.

## SVG allowlist

Anything not listed here is deleted, together with everything inside it.

- Root: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" font-family="inherit">\`. No \`width\`, \`height\`, \`style\`, \`class\` or \`id\`.
- First children of the root: \`<title>\` (same text as the JSON \`title\`) and \`<desc>\` (same text as the JSON \`description\`).
- Elements: ${code(SVG_ALLOWLIST.elements)}. Nothing else: no ${code(FORBIDDEN_ELEMENTS)}.
- \`text\` may contain only characters and \`tspan\`. \`tspan\` contains only characters.
- Attributes:
  - geometry: ${code(SVG_ALLOWLIST.geometry)}, \`transform\` (only ${code(SVG_ALLOWLIST.transformFunctions)} with numbers)
  - paint: ${code(SVG_ALLOWLIST.paint)}
  - text: ${textAttributes}
  - accessibility: \`aria-hidden="true"\` on purely decorative shapes such as connectors and dots
  - root only: \`viewBox\`, \`preserveAspectRatio\`
- Never use: \`style\`, \`class\`, \`id\`, \`href\`, \`xlink:href\`, any \`on…\` attribute, \`url(...)\`, \`<!DOCTYPE>\`, \`<![CDATA[\`, comments.
- Draw arrowheads as small \`polygon\`s, not markers.
- It is XML: every attribute value in double quotes, every element closed. Escape \`&\` as \`&amp;\`, \`<\` as \`&lt;\`, \`>\` as \`&gt;\` in text. No other named entities (no \`&nbsp;\`, \`&mdash;\`): type the character itself (–, —, ’, €, £).
- Coordinates: plain numbers, at most one decimal place.

## Accessibility

- Every fact in the diagram is real \`<text>\`, never a path outline.

## Output

Return only one JSON object, no Markdown fences and no text before or after it:

{"type": "...", "title": "...", "description": "...", "wide": "<svg ...>...</svg>", "narrow": "<svg ...>...</svg>"}

\`type\` is the diagram type you picked, as named in the instructions above. \`title\` and \`description\` follow the instructions above. \`wide\` and \`narrow\` are complete SVG documents as JSON strings (escape double quotes and newlines as JSON requires).

Before answering, check each SVG against all the rules above: every number has its measure, base and period, timeline steps and qualifiers are complete, viewBox size, full width used in \`wide\`, even spacing, text contrast, minimum font sizes, no overflow, only allowlisted elements, attributes and colour tokens.`

// ---------------------------------------------------------------------------------------------------------------
// Request

/** The article as the model reads it. */
export type InfographicArticle = { title: string; text: string }

/** Title, standfirst and body of a post, as plain text. */
export function postToArticle(post: {
  title?: string | null
  excerpt?: string | null
  content?: Parameters<typeof portableTextToPlain>[0]
}): InfographicArticle {
  return {
    title: post.title?.trim() ?? '',
    text: [post.excerpt?.trim(), portableTextToPlain(post.content)].filter(Boolean).join('\n\n'),
  }
}

/**
 * The instruction holds only $variables, so a "$" in the instructions or the article ("$44.6bn") is never read as a
 * template variable. Agent Actions requires the word JSON in the instruction when the format is 'json'.
 */
const INSTRUCTION = [
  '$instructions',
  '',
  '$contract',
  '',
  '---',
  'ARTICLE TITLE: $title',
  '',
  'ARTICLE TEXT:',
  '$article',
  '---',
  '',
  'Return only the JSON object described above.',
].join('\n')

const constant = (value: string) => ({ type: 'constant' as const, value })

/** The Prompt action request (`client.agent.action.prompt`, apiVersion `vX`). One request, one AI credit. */
export function buildInfographicRequest({ instructions, article }: { instructions: string; article: InfographicArticle }) {
  return {
    instruction: INSTRUCTION,
    instructionParams: {
      instructions: constant(instructions),
      contract: constant(INFOGRAPHIC_TECHNICAL_CONTRACT),
      title: constant(article.title),
      article: constant(article.text.slice(0, MAX_ARTICLE_CHARS)),
    },
    format: 'json' as const,
    temperature: TEMPERATURE,
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Response

/** A generation the site can render: both SVGs already sanitised. */
export type InfographicGeneration = {
  type: string
  title: string
  description: string
  wide: string
  narrow: string
}

type InfographicParseResult = { ok: true; value: InfographicGeneration } | { ok: false; error: string }

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)

/** The model sometimes returns the JSON as a string, possibly fenced. */
function toObject(response: unknown): Record<string, unknown> | null {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return response as Record<string, unknown>
  }

  if (typeof response === 'string') {
    const unfenced = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')

    try {
      return toObject(JSON.parse(unfenced))
    } catch {
      return null
    }
  }

  return null
}

/**
 * The Prompt action's answer, checked: every text present and both SVGs accepted by the sanitiser. Nothing partial
 * is returned, so a refused variant never replaces a good one already saved.
 */
export function parseInfographicResponse(response: unknown): InfographicParseResult {
  const json = toObject(response)

  if (!json) {
    return {
      ok: false,
      error:
        'The answer was cut off or was not JSON, most likely because the diagram grew too large. Regenerate; if it keeps failing, the article may hold too much for one diagram.',
    }
  }

  const type = text(json.type)
  const title = text(json.title)
  const description = text(json.description)
  const missing = [!type && 'type', !title && 'title', !description && 'description'].filter(Boolean)

  if (missing.length > 0 || !type || !title || !description) {
    return { ok: false, error: `The answer has no ${missing.join(', ')}. Try again.` }
  }

  const variants: Record<'wide' | 'narrow', string> = { wide: '', narrow: '' }

  for (const name of ['wide', 'narrow'] as const) {
    const raw = text(json[name])
    const report = raw ? sanitizeSvgWithReport(raw) : null

    if (!report?.svg) {
      return {
        ok: false,
        error: `The ${name} diagram did not pass the SVG check${report?.error ? ` (${report.error})` : ' (missing)'}. Try again.`,
      }
    }

    variants[name] = report.svg
  }

  return {
    ok: true,
    value: { type, title, description, ...variants },
  }
}
