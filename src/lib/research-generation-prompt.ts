import { type PlainBlock, portableTextToPlain } from './portable-text-plain'
import {
  KEY_FINDINGS_MAX,
  RESEARCH_CHART_GAUGES_MAX,
  RESEARCH_CHARTS_MAX,
  RESEARCH_SUMMARY_MAX_CHARS,
} from './research-report'

/*
 * The "Generate from report text" request and response, used by the Studio button on a research report
 * (src/sanity/components/research-generate-input.tsx) and by one-off test scripts.
 *
 * One Prompt request drafts the report page's summary, key findings, charts, insights and methodology, and the
 * Executive Summary page, from the report's `body` ("Report text"). The prompt is two halves, as for the brief. The
 * editorial half lives in the shared `research-generation-settings` document, so editors change it without a deploy.
 * The technical half below is the contract the answer is held to: the JSON shape, counts, lengths and the number rule.
 *
 * Number safety: every number in a key finding, a chart, an insight and a methodology row must occur in the text the
 * model read. The check runs here, after parsing, and drops any item that fails; the Studio lists what was dropped.
 * Numbers in the prose parts (summary, Executive Summary page with its section headings, methodology introduction) are
 * checked too, but only reported, because one wrong number does not make a paragraph worthless. Gauge arcs are computed here from the
 * figure, never taken from the model.
 */

/** The shared "Research generation instructions" document, one for every brand. No dot: the Studio reads it. */
export const RESEARCH_GENERATION_SETTINGS_ID = 'research-generation-settings'

/** Shorter report texts give the model nothing to draft from. */
export const MIN_RESEARCH_SOURCE_CHARS = 300
/** Longer text is cut: a pasted PDF can run to six figures. The number check uses the same cut text. */
export const MAX_RESEARCH_SOURCE_CHARS = 60_000

/** Counts the model may return, each "0 to N": fewer, or none, is correct when the text supports fewer. */
export const RESEARCH_SUMMARY_SECTIONS_MAX = 4
export const RESEARCH_SUMMARY_INTRO_MAX = 2
export const RESEARCH_INSIGHTS_MAX = 4
export const RESEARCH_METHODOLOGY_ROWS_MAX = 5

const TEMPERATURE = 0.2

// ---------------------------------------------------------------------------------------------------------------
// Technical contract

const TECHNICAL_CONTRACT = `# Technical rules

## Numbers

- Every figure you write must be copied from the report text, digits as the report gives them. Never invent, estimate, round, convert, add up, average or compute a figure, and never write a percentage the report does not state.
- Write numbers as digits, never as words ("7 per cent", not "seven per cent").
- The Studio checks every number in keyFindings, charts, insights and methodology against the report text and deletes any item with a number the text does not contain. Numbers in the prose are checked as well and flagged to the editor.
- If the report has no figure that fits a part, return an empty list for it. Fewer items, or none, is correct.

## Fields

- \`summary\`: one paragraph, at most ${RESEARCH_SUMMARY_MAX_CHARS - 100} characters. What the report is, who produced it, what it covers or finds.
- \`executiveSummary.lead\`: one paragraph, at most 400 characters: the report's main message.
- \`executiveSummary.intro\`: 0 to ${RESEARCH_SUMMARY_INTRO_MAX} paragraphs of scope and context, each at most 600 characters. Do not repeat the lead.
- \`executiveSummary.sections\`: 0 to ${RESEARCH_SUMMARY_SECTIONS_MAX} sections, one per main theme of the report, in the report's order. \`heading\`: one to three words, the report's own name for the theme. \`paragraphs\`: 1 to 3 paragraphs, each at most 600 characters, with that theme's findings or arguments.
- \`keyFindings\`: 0 to ${KEY_FINDINGS_MAX}, the report's headline figures. \`value\`: the figure alone, at most 10 characters, as "72%" for a percentage or "5.3 / 7" for a score on a scale (the scale as stated in the report). \`text\`: what it measures, at most 60 characters, with the comparison in brackets if the report gives one, for example "Average digitisation score (4.7 / 7 in 2023)". \`note\`: optional, one short sentence, at most 60 characters; "" when there is nothing to add.
- \`charts\`: 0 to ${RESEARCH_CHARTS_MAX}. Each is one or ${RESEARCH_CHART_GAUGES_MAX} half-circle gauges. Only a percentage or a score on a stated scale can be a gauge; anything else (money, counts, years) cannot. \`title\`: what the chart shows, at most 60 characters. \`note\`: optional, one sentence explaining the figures, at most 120 characters; "" when there is nothing to add. \`gauges\`: 1 to ${RESEARCH_CHART_GAUGES_MAX}; two only when they compare like with like (for example the previous year and this year, or the lowest and the highest score). Gauge \`label\`: at most 24 characters, for example "2023" or "Best-rated firms". Gauge \`value\`: "70%" or "5.3 / 7", nothing else. Gauge \`current\`: true for the figure to highlight (the latest year), else false.
- \`insights\`: 0 to ${RESEARCH_INSIGHTS_MAX} short statements of what the report finds, concludes or recommends, each one sentence, at most 140 characters.
- \`methodologyIntro\` and \`methodology\`: only when the report text describes a survey or study with its sample or respondents (who was asked, how many, where, when). A post-forum report, event write-up or white paper without such a study has no methodology: never use the report's format, the event or its contributors as methodology. Otherwise \`methodologyIntro\` is "" and \`methodology\` is []. \`methodologyIntro\`: one paragraph, at most 500 characters. \`methodology\`: 0 to ${RESEARCH_METHODOLOGY_ROWS_MAX} rows; \`label\` at most 24 characters (for example "Study format", "Regions"), \`value\` at most 80 characters.

## Text

- Plain text only: no Markdown, no HTML, no bullet characters, no emoji, no quotation marks around a whole value.
- Type punctuation as characters (’, –, £, €); no HTML entities.
- Use "" for an empty string and [] for an empty list; never null, never leave a key out.

## Output

Return only one JSON object, no Markdown fences and no text before or after it:

{"summary": "...", "executiveSummary": {"lead": "...", "intro": ["..."], "sections": [{"heading": "...", "paragraphs": ["..."]}]}, "keyFindings": [{"value": "...", "text": "...", "note": "..."}], "charts": [{"title": "...", "note": "...", "gauges": [{"label": "...", "value": "...", "current": false}]}], "insights": ["..."], "methodologyIntro": "...", "methodology": [{"label": "...", "value": "..."}]}

Before answering, check every number you wrote against the report text: it must be there, with the same meaning. Remove any item you cannot match. Then check the counts and lengths above.`

// ---------------------------------------------------------------------------------------------------------------
// Request

/** The report as the model reads it: the title and the report text, already cut to the length it is sent at. */
export type ResearchSource = { title: string; text: string; truncated: boolean }

/** Title and `body` ("Report text") of a research report, as plain text. */
export function resourceToResearchSource(resource: {
  title?: string | null
  body?: readonly PlainBlock[] | null
}): ResearchSource {
  const text = portableTextToPlain(resource.body)

  return {
    title: resource.title?.trim() ?? '',
    text: text.slice(0, MAX_RESEARCH_SOURCE_CHARS),
    truncated: text.length > MAX_RESEARCH_SOURCE_CHARS,
  }
}

/**
 * The instruction holds only $variables, so a "$" in the instructions or the report ("$44.6bn") is never read as a
 * template variable. Agent Actions requires the word JSON in the instruction when the format is 'json'.
 */
const INSTRUCTION = [
  '$instructions',
  '',
  '$contract',
  '',
  '---',
  'REPORT TITLE: $title',
  '',
  'REPORT TEXT:',
  '$report',
  '---',
  '',
  'Return only the JSON object described above.',
].join('\n')

const constant = (value: string) => ({ type: 'constant' as const, value })

/** The Prompt action request (`client.agent.action.prompt`, apiVersion `vX`). One request, one AI credit. */
export function buildResearchGenerationRequest({ instructions, source }: { instructions: string; source: ResearchSource }) {
  return {
    instruction: INSTRUCTION,
    instructionParams: {
      instructions: constant(instructions),
      contract: constant(TECHNICAL_CONTRACT),
      title: constant(source.title),
      report: constant(source.text),
    },
    format: 'json' as const,
    temperature: TEMPERATURE,
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Number check

/*
 * What counts as one number, and when the report text vouches for it:
 * - A token starts at a digit, or at "." before a digit (".5" is 0.5), never right after a letter or a digit, so
 *   "COVID19", "Web3", "H1", "Q3" and "G20" hold no number. A "-" (or "−") right before it is its sign when the "-"
 *   itself follows no letter or digit: "-5%" is minus five, "30-44%" is a range, "COVID-19" is 19.
 * - Thousands separators: commas, and plain, no-break, figure, thin and narrow no-break spaces between groups of three
 *   ("1,200", "1 200"). The grouping must be valid ("1,2345" is 1 and 2345). A grouped number is the same number as
 *   its plain digits ("1,200" = "1200"), except a grouped number that reads as a year (four digits, 1900 to 2099):
 *   "2,023" is a count, not the year 2023, so it matches only another grouped "2,023". European "1.200" stays 1.2:
 *   a dot cannot be told from a decimal point.
 *   In the report text, a number grouped by plain spaces also counts as its separate parts ("30 100" may be 30 and
 *   100), so the report never fails to vouch for a figure because of a space; in the model's answer it is one number.
 * - A percentage is "%", "per cent", "per-cent", "percent" or "pc" after the number. A range "30-44%" makes both ends
 *   percentages.
 * - A score is "x / y" or "x out of y". It is vouched for when the report has x and states y as a scale ("out of y"
 *   or "/ y" somewhere), so "5.3 out of 7 … up from the 4.7 seen in 2023" vouches for "4.7 / 7", while "10 firms"
 *   never makes 10 a scale for "5.3 / 10". The parts of a pair in the report vouch for themselves as numbers.
 * - The sign is part of the number: "fell 5%" does not vouch for "-5%". A negative number in the report vouches for
 *   its absolute value too, because prose carries the sign in words ("fell 5%" from "-5%").
 * Numbers written as words ("seven per cent") are not read: the contract asks the model for digits.
 */

/** Dashes, minus and the spaces a PDF pastes in, made plain, so "30–44" and "5.3 / 7" read the same everywhere. */
function plainText(text: string): string {
  return (
    text
      // A no-break, figure, thin or narrow no-break space between digit groups is a thousands separator. NFKC would
      // turn it into a plain space, so it becomes a comma first.
      .replace(/(\d)[    ](?=\d{3}(?!\d))/g, '$1,')
      .normalize('NFKC')
      .replace(/[‐-―−]/g, '-')
      .replace(/[    ]/g, ' ')
  )
}

const NUMBER = new RegExp(
  [
    String.raw`(?<![\p{L}\p{N}])`,
    String.raw`(?:(?<sign>-)(?=\.?\d))?`,
    String.raw`(?:(?<int>\d{1,3}(?:,\d{3})+(?!\d|,\d)|\d{1,3}(?: \d{3})+(?!\d|,\d)|\d+)(?<dec>\.\d+)?|(?<bare>\.\d+))`,
    String.raw`(?<pct>\s*(?:%|[Pp]er[ -]?[Cc]ent\b|[Pp]ercent\b|pc\b))?`,
  ].join(''),
  'gu',
)

type NumberToken = {
  raw: string
  value: string
  percent: boolean
  /** Plain-space groups of the integer part, when it has more than one ("30 100" → ["30", "100"]). */
  spaceGroups: string[] | null
  start: number
  end: number
}

const YEAR_LIKE = (digits: string) => digits.length === 4 && Number(digits) >= 1900 && Number(digits) <= 2099

function toToken(match: RegExpMatchArray): NumberToken {
  const { sign, int, dec, bare, pct } = match.groups ?? {}
  const grouped = Boolean(int && /[, ]/.test(int))
  const digits = int ? int.replace(/[, ]/g, '') : '0'
  const number = String(Number(`${digits}${dec ?? bare ?? ''}`))
  const value = grouped && !dec && YEAR_LIKE(digits) ? `${digits[0]},${digits.slice(1)}` : number
  const start = match.index ?? 0

  return {
    raw: match[0].trim(),
    value: sign && Number(number) !== 0 ? `-${value}` : value,
    percent: Boolean(pct),
    spaceGroups: int && int.includes(' ') ? int.split(' ') : null,
    start,
    end: start + match[0].length,
  }
}

type Figure = { kind: 'number'; token: NumberToken } | { kind: 'score'; part: NumberToken; scale: NumberToken; raw: string }

const RANGE_BETWEEN = /^ ?- ?$/
const SCORE_BETWEEN = /^\s*(?:\/|out\s+of)\s*$/i

/** The numbers and scores in a text, in order. */
function figuresIn(text: string): Figure[] {
  const plain = plainText(text)
  const tokens = [...plain.matchAll(NUMBER)].map(toToken)
  const figures: Figure[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const next = tokens[i + 1]
    const between = next ? plain.slice(token.end, next.start) : ''

    if (next && !token.percent && next.percent && RANGE_BETWEEN.test(between)) {
      token.percent = true
    }

    if (next && !token.percent && !next.percent && SCORE_BETWEEN.test(between)) {
      figures.push({ kind: 'score', part: token, scale: next, raw: plain.slice(token.start, next.end).trim() })
      i++
      continue
    }

    figures.push({ kind: 'number', token })
  }

  return figures
}

/** Every number of the report text, the ones it states as a percentage, and the ones it uses as a scale ("out of 7"). */
export type NumberIndex = { all: Set<string>; percent: Set<string>; scales: Set<string> }

export function indexNumbers(text: string): NumberIndex {
  const index: NumberIndex = { all: new Set(), percent: new Set(), scales: new Set() }

  const add = (value: string, percent: boolean) => {
    for (const each of value.startsWith('-') ? [value, value.slice(1)] : [value]) {
      index.all.add(each)

      if (percent) {
        index.percent.add(each)
      }
    }
  }

  const addToken = (token: NumberToken) => {
    add(token.value, token.percent)

    // "30 100" in the report may be two numbers: each part counts too, the last one with the percentage.
    token.spaceGroups?.forEach((group, i, groups) => add(String(Number(group)), token.percent && i === groups.length - 1))
  }

  for (const figure of figuresIn(text)) {
    if (figure.kind === 'score') {
      index.scales.add(figure.scale.value)
      addToken(figure.part)
      addToken(figure.scale)
    } else {
      addToken(figure.token)
    }
  }

  return index
}

/**
 * The numbers in `text` the report text does not contain. A percentage must be a percentage in the report too, so
 * "65 years" never vouches for "65%"; a score must be the same pair; any other number matches the same number in any
 * form (see the rules above).
 */
export function missingNumbers(text: string | null | undefined, index: NumberIndex): string[] {
  return figuresIn(text ?? '').flatMap((figure) => {
    if (figure.kind === 'score') {
      return index.all.has(figure.part.value) && index.scales.has(figure.scale.value) ? [] : [figure.raw]
    }

    const { token } = figure

    return (token.percent ? index.percent : index.all).has(token.value) ? [] : [token.raw]
  })
}

/** A figure in the form the page shows: "70 per cent" → "70%", "5.3 out of 7" or "5.3/7" → "5.3 / 7", ".5%" → "0.5%". */
export function normaliseFigure(value: string): string {
  return plainText(value)
    .replace(/\s*(?:per[ -]?cent|percent)\b/gi, '%')
    .replace(/(\d)\s*pc\b/g, '$1%')
    .replace(/\s+%/g, '%')
    .replace(/(^|[^\d])\.(\d)/g, '$10.$2')
    .replace(/\s*(?:out\s+of|\/)\s*/gi, ' / ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * How much of the half circle a gauge fills, from its figure: "70%" → 70, "5.3 / 7" → 75.7 (one decimal). Null for a
 * figure that is neither, or out of range: it cannot be drawn as a gauge.
 */
export function gaugePercent(figure: string): number | null {
  const percent = /^(\d+(?:\.\d+)?)%$/.exec(figure)

  if (percent) {
    const value = Number(percent[1])

    return value <= 100 ? value : null
  }

  const score = /^(\d+(?:\.\d+)?) \/ (\d+(?:\.\d+)?)$/.exec(figure)

  if (score) {
    const [part, scale] = [Number(score[1]), Number(score[2])]

    return scale > 0 && part <= scale ? Math.round((part / scale) * 1000) / 10 : null
  }

  return null
}

// ---------------------------------------------------------------------------------------------------------------
// Response

export type ResearchKeyFinding = { value: string; text: string; note: string | null }
export type ResearchGauge = { label: string; value: string; percent: number; current: boolean }
export type ResearchChartDraft = { title: string; note: string | null; gauges: ResearchGauge[] }
export type ResearchSummarySection = { heading: string; paragraphs: string[] }

/** The checked draft. Prose is plain-text paragraphs; the Studio turns them into blocks when it writes them. */
export type ResearchDraft = {
  summary: string | null
  executiveSummary: { lead: string | null; intro: string[]; sections: ResearchSummarySection[] }
  keyFindings: ResearchKeyFinding[]
  charts: ResearchChartDraft[]
  insights: string[]
  methodologyIntro: string | null
  methodology: { label: string; value: string }[]
}

/** `dropped`: items removed by the checks. `warnings`: kept, but the editor should look (numbers in prose, length). */
export type ResearchGeneration = { draft: ResearchDraft; dropped: string[]; warnings: string[] }

type ParseResult = { ok: true; value: ResearchGeneration } | { ok: false; error: string }

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

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** One line of plain text: whitespace collapsed, Markdown emphasis and wrapping quotation marks removed. */
function line(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const plain = value.replace(/\s+/g, ' ').replace(/\*\*|__|`/g, '').trim()
  const wrapped = /^(?:"(.*)"|“(.*)”)$/.exec(plain)

  return (wrapped?.slice(1).find((group) => group !== undefined) ?? plain).trim()
}

/** Paragraphs from a string or a list of strings; a string with blank lines is several paragraphs. */
function paragraphs(value: unknown): string[] {
  const parts = typeof value === 'string' ? [value] : list(value).filter((item) => typeof item === 'string')

  return parts.flatMap((part) => (part as string).split(/\n\s*\n/)).map(line).filter(Boolean)
}

const quoteShort = (text: string) => `“${text.length > 70 ? `${text.slice(0, 67)}…` : text}”`

/**
 * Hard length limits on the answer, in characters. Where the contract above states a length, these sit above it, so a
 * slightly long answer passes and only a runaway one is cut: prose is shortened at a word boundary (a warning), a figure,
 * label or title over its limit is dropped (it cannot be cut without changing what it says).
 */
export const RESEARCH_LENGTH_LIMITS = {
  summary: RESEARCH_SUMMARY_MAX_CHARS,
  lead: 600,
  paragraph: 1_200,
  sectionHeading: 80,
  insight: 240,
  findingValue: 24,
  findingText: 120,
  findingNote: 160,
  chartTitle: 120,
  chartNote: 200,
  gaugeLabel: 40,
  gaugeValue: 24,
  methodologyLabel: 24,
  methodologyValue: 80,
  methodologyIntro: 500,
} as const

/** `text` cut to at most `max` characters at a word boundary, with an ellipsis. Unchanged when it fits. */
export function clipText(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }

  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')

  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:–-]+$/, '')}…`
}

/**
 * The Prompt action's answer, checked against the contract and the report text the model read (`source`). Items that
 * break the number rule, the shape or a length limit are dropped and listed; prose over its limit is shortened and
 * flagged. An answer with nothing usable is an error.
 */
export function parseResearchResponse(response: unknown, source: ResearchSource): ParseResult {
  const json = toObject(response)

  if (!json) {
    return { ok: false, error: 'The answer was cut off or was not JSON. Try again.' }
  }

  const index = indexNumbers(`${source.title}\n\n${source.text}`)
  const dropped: string[] = []
  const warnings: string[] = []
  const unknown = (...texts: (string | null | undefined)[]) => texts.flatMap((text) => missingNumbers(text, index))
  const notInText = (numbers: string[]) => `${numbers.join(', ')} not in the report text`
  const over = (text: string, max: number) => `${text.length} characters, over the limit of ${max}`

  /** Kept prose with a number the text lacks: flagged, not dropped. */
  const flag = (where: string, ...texts: (string | null | undefined)[]) => {
    const missing = unknown(...texts)

    if (missing.length > 0) {
      warnings.push(`${where}: check ${missing.join(', ')}, not found in the report text.`)
    }
  }

  /** Prose cut to its limit; the cut is flagged. */
  const clip = (where: string, text: string, max: number) => {
    if (text.length > max) {
      warnings.push(`${where}: ${over(text, max)}, shortened. Check the ending.`)
    }

    return clipText(text, max)
  }

  const clipNullable = (where: string, text: string | null, max: number) => (text ? clip(where, text, max) : null)

  // Summary
  const summary = clipNullable('Executive summary', paragraphs(json.summary).join(' ') || null, RESEARCH_LENGTH_LIMITS.summary)
  flag('Executive summary', summary)

  // Executive Summary page
  const executive = record(json.executiveSummary)
  const lead = clipNullable('Executive Summary page lead', paragraphs(executive.lead).join(' ') || null, RESEARCH_LENGTH_LIMITS.lead)
  const intro = paragraphs(executive.intro)
  const sections: ResearchSummarySection[] = []

  for (const raw of list(executive.sections)) {
    const section = record(raw)
    const heading = line(section.heading)
    const body = paragraphs(section.paragraphs ?? section.body)

    if (!heading || body.length === 0) {
      dropped.push(`Executive Summary page: a section without a heading or text.`)
      continue
    }

    if (heading.length > RESEARCH_LENGTH_LIMITS.sectionHeading) {
      dropped.push(`Executive Summary page section ${quoteShort(heading)}: heading ${over(heading, RESEARCH_LENGTH_LIMITS.sectionHeading)}.`)
      continue
    }

    sections.push({
      heading,
      paragraphs: body
        .slice(0, 3)
        .map((text) => clip(`Executive Summary page section ${quoteShort(heading)}`, text, RESEARCH_LENGTH_LIMITS.paragraph)),
    })
  }

  if (intro.length > RESEARCH_SUMMARY_INTRO_MAX) {
    dropped.push(`Executive Summary page: ${intro.length - RESEARCH_SUMMARY_INTRO_MAX} introduction paragraph(s) over the limit of ${RESEARCH_SUMMARY_INTRO_MAX}.`)
  }

  if (sections.length > RESEARCH_SUMMARY_SECTIONS_MAX) {
    dropped.push(
      `Executive Summary page: ${sections
        .slice(RESEARCH_SUMMARY_SECTIONS_MAX)
        .map((section) => quoteShort(section.heading))
        .join(', ')}, over the limit of ${RESEARCH_SUMMARY_SECTIONS_MAX} sections.`,
    )
  }

  const executiveSummary = {
    lead,
    intro: intro
      .slice(0, RESEARCH_SUMMARY_INTRO_MAX)
      .map((text) => clip('Executive Summary page introduction', text, RESEARCH_LENGTH_LIMITS.paragraph)),
    sections: sections.slice(0, RESEARCH_SUMMARY_SECTIONS_MAX),
  }
  flag('Executive Summary page lead', lead)
  flag('Executive Summary page introduction', ...executiveSummary.intro)

  for (const section of executiveSummary.sections) {
    flag(`Executive Summary page section ${quoteShort(section.heading)}`, section.heading, ...section.paragraphs)
  }

  // Key findings
  const keyFindings: ResearchKeyFinding[] = []

  for (const raw of list(json.keyFindings)) {
    const item = record(raw)
    const value = normaliseFigure(line(item.value))
    const text = line(item.text)
    let note = line(item.note) || null
    const label = `Key finding ${quoteShort([value, text].filter(Boolean).join(' – '))}`

    if (note && note.length > RESEARCH_LENGTH_LIMITS.findingNote) {
      dropped.push(`${label}, its note: ${over(note, RESEARCH_LENGTH_LIMITS.findingNote)}.`)
      note = null
    }

    if (!value || !text) {
      dropped.push(`${label}: no figure or no text.`)
    } else if (value.length > RESEARCH_LENGTH_LIMITS.findingValue) {
      dropped.push(`${label}: figure ${over(value, RESEARCH_LENGTH_LIMITS.findingValue)}.`)
    } else if (text.length > RESEARCH_LENGTH_LIMITS.findingText) {
      dropped.push(`${label}: text ${over(text, RESEARCH_LENGTH_LIMITS.findingText)}.`)
    } else if (!/\d/.test(value)) {
      dropped.push(`${label}: the figure has no number.`)
    } else if (unknown(value, text, note).length > 0) {
      dropped.push(`${label}: ${notInText(unknown(value, text, note))}.`)
    } else {
      keyFindings.push({ value, text, note })
    }
  }

  if (keyFindings.length > KEY_FINDINGS_MAX) {
    dropped.push(
      ...keyFindings.slice(KEY_FINDINGS_MAX).map((item) => `Key finding ${quoteShort(`${item.value} – ${item.text}`)}: over the limit of ${KEY_FINDINGS_MAX}.`),
    )
  }

  // Charts
  const charts: ResearchChartDraft[] = []

  for (const raw of list(json.charts)) {
    const chart = record(raw)
    const title = line(chart.title)
    let note = line(chart.note) || null
    const label = `Chart ${quoteShort(title || 'untitled')}`

    if (!title) {
      dropped.push(`${label}: no title.`)
      continue
    }

    if (title.length > RESEARCH_LENGTH_LIMITS.chartTitle) {
      dropped.push(`${label}: title ${over(title, RESEARCH_LENGTH_LIMITS.chartTitle)}.`)
      continue
    }

    if (unknown(title).length > 0) {
      dropped.push(`${label}: ${notInText(unknown(title))}.`)
      continue
    }

    if (note && note.length > RESEARCH_LENGTH_LIMITS.chartNote) {
      dropped.push(`${label}, its note: ${over(note, RESEARCH_LENGTH_LIMITS.chartNote)}.`)
      note = null
    }

    if (note && unknown(note).length > 0) {
      dropped.push(`${label}, its note: ${notInText(unknown(note))}.`)
      note = null
    }

    const gauges: ResearchGauge[] = []

    for (const rawGauge of list(chart.gauges)) {
      const gauge = record(rawGauge)
      const value = normaliseFigure(line(gauge.value))
      const gaugeLabel = line(gauge.label)
      const percent = gaugePercent(value)
      const where = `${label}, gauge ${quoteShort([value, gaugeLabel].filter(Boolean).join(' – '))}`

      if (!value || !gaugeLabel) {
        dropped.push(`${where}: no figure or no label.`)
      } else if (value.length > RESEARCH_LENGTH_LIMITS.gaugeValue) {
        dropped.push(`${where}: figure ${over(value, RESEARCH_LENGTH_LIMITS.gaugeValue)}.`)
      } else if (gaugeLabel.length > RESEARCH_LENGTH_LIMITS.gaugeLabel) {
        dropped.push(`${where}: label ${over(gaugeLabel, RESEARCH_LENGTH_LIMITS.gaugeLabel)}.`)
      } else if (unknown(value, gaugeLabel).length > 0) {
        dropped.push(`${where}: ${notInText(unknown(value, gaugeLabel))}.`)
      } else if (percent === null) {
        dropped.push(`${where}: not a percentage or a score on a scale, so it cannot fill a gauge.`)
      } else {
        gauges.push({ label: gaugeLabel, value, percent, current: gauge.current === true })
      }
    }

    if (gauges.length > RESEARCH_CHART_GAUGES_MAX) {
      dropped.push(`${label}: ${gauges.length - RESEARCH_CHART_GAUGES_MAX} gauge(s) over the limit of ${RESEARCH_CHART_GAUGES_MAX}.`)
    }

    if (gauges.length === 0) {
      dropped.push(`${label}: no gauge left.`)
      continue
    }

    charts.push({ title, note, gauges: gauges.slice(0, RESEARCH_CHART_GAUGES_MAX) })
  }

  if (charts.length > RESEARCH_CHARTS_MAX) {
    dropped.push(...charts.slice(RESEARCH_CHARTS_MAX).map((chart) => `Chart ${quoteShort(chart.title)}: over the limit of ${RESEARCH_CHARTS_MAX}.`))
  }

  // Insights
  const insights: string[] = []

  for (const raw of list(json.insights)) {
    const full = line(raw)

    if (!full) {
      continue
    }

    const text = clip(`Insight ${quoteShort(full)}`, full, RESEARCH_LENGTH_LIMITS.insight)

    if (unknown(text).length > 0) {
      dropped.push(`Insight ${quoteShort(text)}: ${notInText(unknown(text))}.`)
    } else {
      insights.push(text)
    }
  }

  if (insights.length > RESEARCH_INSIGHTS_MAX) {
    dropped.push(...insights.slice(RESEARCH_INSIGHTS_MAX).map((text) => `Insight ${quoteShort(text)}: over the limit of ${RESEARCH_INSIGHTS_MAX}.`))
  }

  // Methodology
  const methodologyIntro = clipNullable(
    'Methodology introduction',
    paragraphs(json.methodologyIntro).join(' ') || null,
    RESEARCH_LENGTH_LIMITS.methodologyIntro,
  )
  flag('Methodology introduction', methodologyIntro)
  const methodology: { label: string; value: string }[] = []

  for (const raw of list(json.methodology)) {
    const row = record(raw)
    const label = line(row.label)
    const value = line(row.value)
    const where = `Methodology row ${quoteShort(`${label}: ${value}`)}`

    if (!label || !value) {
      continue
    }

    if (label.length > RESEARCH_LENGTH_LIMITS.methodologyLabel) {
      dropped.push(`${where}: label ${over(label, RESEARCH_LENGTH_LIMITS.methodologyLabel)}.`)
    } else if (value.length > RESEARCH_LENGTH_LIMITS.methodologyValue) {
      dropped.push(`${where}: value ${over(value, RESEARCH_LENGTH_LIMITS.methodologyValue)}.`)
    } else if (unknown(label, value).length > 0) {
      dropped.push(`${where}: ${notInText(unknown(label, value))}.`)
    } else {
      methodology.push({ label, value })
    }
  }

  if (methodology.length > RESEARCH_METHODOLOGY_ROWS_MAX) {
    dropped.push(
      ...methodology
        .slice(RESEARCH_METHODOLOGY_ROWS_MAX)
        .map((row) => `Methodology row ${quoteShort(`${row.label}: ${row.value}`)}: over the limit of ${RESEARCH_METHODOLOGY_ROWS_MAX}.`),
    )
  }

  const draft: ResearchDraft = {
    summary,
    executiveSummary,
    keyFindings: keyFindings.slice(0, KEY_FINDINGS_MAX),
    charts: charts.slice(0, RESEARCH_CHARTS_MAX),
    insights: insights.slice(0, RESEARCH_INSIGHTS_MAX),
    methodologyIntro,
    methodology: methodology.slice(0, RESEARCH_METHODOLOGY_ROWS_MAX),
  }

  const empty =
    !draft.summary &&
    !draft.executiveSummary.lead &&
    draft.executiveSummary.intro.length === 0 &&
    draft.executiveSummary.sections.length === 0 &&
    draft.keyFindings.length === 0 &&
    draft.charts.length === 0 &&
    draft.insights.length === 0 &&
    !draft.methodologyIntro &&
    draft.methodology.length === 0

  if (empty) {
    return { ok: false, error: 'The answer has nothing usable. Try again.' }
  }

  return { ok: true, value: { draft, dropped, warnings } }
}

// ---------------------------------------------------------------------------------------------------------------
// Sanity values

/** A random `_key`, as Studio makes them. `crypto` is global in the browser, Node and Bun. */
export function randomKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Plain-text paragraphs as `paragraphsBlock` blocks (style normal, no marks). */
export function paragraphsToBlocks(texts: readonly string[]) {
  return texts.map((text) => ({
    _type: 'block' as const,
    _key: randomKey(),
    style: 'normal' as const,
    markDefs: [],
    children: [{ _type: 'span' as const, _key: randomKey(), text, marks: [] }],
  }))
}

/** The report fields the generator writes, as Sanity values. A part the draft leaves empty is absent. */
export function draftToResourceFields(draft: ResearchDraft) {
  return {
    summary: draft.summary ? paragraphsToBlocks([draft.summary]) : undefined,
    keyFindings: draft.keyFindings.length
      ? draft.keyFindings.map((item) => ({
          _type: 'keyFinding' as const,
          _key: randomKey(),
          value: item.value,
          text: item.text,
          ...(item.note ? { note: item.note } : {}),
        }))
      : undefined,
    charts: draft.charts.length
      ? draft.charts.map((chart) => ({
          _type: 'researchChart' as const,
          _key: randomKey(),
          title: chart.title,
          ...(chart.note ? { note: chart.note } : {}),
          gauges: chart.gauges.map((gauge) => ({ _type: 'researchGauge' as const, _key: randomKey(), ...gauge })),
        }))
      : undefined,
    insights: draft.insights.length ? [...draft.insights] : undefined,
    methodologyIntro: draft.methodologyIntro ? paragraphsToBlocks([draft.methodologyIntro]) : undefined,
    methodology: draft.methodology.length
      ? draft.methodology.map((row) => ({ _type: 'methodologyRow' as const, _key: randomKey(), ...row }))
      : undefined,
  }
}

/** The Executive Summary document's fields, as Sanity values. All three are set together; empty ones are absent. */
export function draftToSummaryFields(draft: ResearchDraft) {
  const { lead, intro, sections } = draft.executiveSummary

  return {
    lead: lead ? paragraphsToBlocks([lead]) : undefined,
    intro: intro.length ? paragraphsToBlocks(intro) : undefined,
    sections: sections.length
      ? sections.map((section) => ({
          _type: 'executiveSummarySection' as const,
          _key: randomKey(),
          heading: section.heading,
          body: paragraphsToBlocks(section.paragraphs),
        }))
      : undefined,
  }
}
