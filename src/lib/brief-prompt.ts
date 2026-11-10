import { type PlainBlock, portableTextToPlain } from './portable-text-plain'

/*
 * The "Generate brief" request and response, used by the Studio button on `post.briefText`
 * (src/sanity/components/brief-text-input.tsx).
 *
 * The prompt is two halves, as for the infographic. The editorial half (the five-sentence structure, facts, style)
 * lives in the shared `brief-settings` document, so editors change it without a deploy. The technical half below is
 * the contract the field holds the output to: plain text, one paragraph, the length cap and the JSON shape.
 */

/** The shared "Brief instructions" document, one for every brand. */
export const BRIEF_SETTINGS_ID = 'brief-settings'

/**
 * How long a brief may be, in characters. News in Brief clamps the brief to three lines; at 1440 its text column is
 * 925px of Onest 16/22.4, which holds about 370 characters of English news text in three lines. The cap is about 95%
 * of that, so a brief within it fits three lines without an ellipsis. The field warns above it.
 */
export const BRIEF_MAX_CHARS = 350
/** The length the generator aims for, so a brief fills the three lines instead of stopping at two. Not validated. */
export const BRIEF_TARGET_MIN_CHARS = 300

/** Shorter articles give the model nothing to summarise. */
export const MIN_BRIEF_ARTICLE_CHARS = 200
/** Longer text is cut: it costs the same credit, and a five-sentence brief rarely needs more. */
const MAX_ARTICLE_CHARS = 20_000

const TEMPERATURE = 0.2

// ---------------------------------------------------------------------------------------------------------------
// Technical contract

const BRIEF_TECHNICAL_CONTRACT = `# Technical rules

- The brief is plain text: one paragraph, no line breaks, no Markdown, no bullet points, no headings, no emoji.
- No quotation marks around the brief and no label before it (no "Brief:").
- Length: between ${BRIEF_TARGET_MIN_CHARS} and ${BRIEF_MAX_CHARS} characters in total, including spaces (about ${Math.round(BRIEF_TARGET_MIN_CHARS / 5)}–${Math.round(BRIEF_MAX_CHARS / 5)} per sentence). The site shows three lines, which this range fills; anything longer is cut.
- Fill the range with facts from the article: names, figures, dates, places, what happens next. Never pad it with filler, repetition or general statements. If the article truly has too little to say, a shorter brief is fine.
- Over the range, shorten sentences rather than drop one.
- Type punctuation as characters (’, –, £, €); no HTML entities.

## Output

Return only one JSON object, no Markdown fences and no text before or after it:

{"brief": "..."}

\`brief\` is the five-sentence brief as one JSON string.

Before answering, check: exactly five sentences in the order of the instructions above, every fact stated in the article, British English, the headline not repeated, between ${BRIEF_TARGET_MIN_CHARS} and ${BRIEF_MAX_CHARS} characters in total. Under ${BRIEF_TARGET_MIN_CHARS}: add a concrete fact from the article, if it has one. Over ${BRIEF_MAX_CHARS}: shorten the sentences. Then check again.`

// ---------------------------------------------------------------------------------------------------------------
// Request

/** The article as the model reads it. */
export type BriefArticle = { title: string; text: string }

/** Title, standfirst and body (the text before and after the banner) of a post, as plain text. */
export function postToBriefArticle(post: {
  title?: string | null
  excerpt?: string | null
  content?: readonly PlainBlock[] | null
  contentAfter?: readonly PlainBlock[] | null
}): BriefArticle {
  return {
    title: post.title?.trim() ?? '',
    text: [post.excerpt?.trim(), portableTextToPlain(post.content), portableTextToPlain(post.contentAfter)]
      .filter(Boolean)
      .join('\n\n'),
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
  'ARTICLE HEADLINE: $title',
  '',
  'ARTICLE TEXT:',
  '$article',
  '---',
  '',
  'Return only the JSON object described above.',
].join('\n')

const constant = (value: string) => ({ type: 'constant' as const, value })

/** The Prompt action request (`client.agent.action.prompt`, apiVersion `vX`). One request, one AI credit. */
export function buildBriefRequest({ instructions, article }: { instructions: string; article: BriefArticle }) {
  return {
    instruction: INSTRUCTION,
    instructionParams: {
      instructions: constant(instructions),
      contract: constant(BRIEF_TECHNICAL_CONTRACT),
      title: constant(article.title),
      article: constant(article.text.slice(0, MAX_ARTICLE_CHARS)),
    },
    format: 'json' as const,
    temperature: TEMPERATURE,
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Response

type BriefParseResult = { ok: true; value: string } | { ok: false; error: string }

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

/** One paragraph of plain text: whitespace collapsed, Markdown emphasis and wrapping quotation marks removed. */
export function cleanBrief(text: string): string {
  const plain = text.replace(/\s+/g, ' ').replace(/\*\*|__|`/g, '').trim()

  // Quotation marks around the whole brief, only as a matched pair ("…", “…”, ‘…’). A lone closing ’ can end a
  // sentence ("the clients’"), so a brief that only ends with one keeps it.
  const wrapped = /^(?:"(.*)"|“(.*)”|‘(.*)’)$/.exec(plain)
  const inner = wrapped?.slice(1).find((group) => group !== undefined)

  return (inner ?? plain).trim()
}

/** The Prompt action's answer, checked: a non-empty brief as one paragraph of plain text. */
export function parseBriefResponse(response: unknown): BriefParseResult {
  const json = toObject(response)

  if (!json) {
    return { ok: false, error: 'The answer was cut off or was not JSON. Try again.' }
  }

  const brief = typeof json.brief === 'string' ? cleanBrief(json.brief) : ''

  if (!brief) {
    return { ok: false, error: 'The answer has no brief. Try again.' }
  }

  return { ok: true, value: brief }
}
