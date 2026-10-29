/**
 * Allowlist sanitiser for AI-generated infographic SVG.
 *
 * The input is parsed with a small XML tokenizer into a tree and a new document
 * is serialised from that tree: only allowlisted elements and attributes, every
 * attribute value checked against its own rule, all text and attribute values
 * re-escaped. Nothing from the input is copied through as raw markup, so a trick
 * the tokenizer does not understand fails the parse instead of reaching the page.
 *
 * What is refused:
 * - the whole document when it is not well-formed XML, is larger than
 *   MAX_INPUT_LENGTH, has a DOCTYPE / ENTITY / CDATA section / processing
 *   instruction (one leading `<?xml ...?>` declaration excepted), uses a named
 *   entity other than the five XML ones, nests too deep, has too many elements,
 *   or its root is not an `<svg>` with a valid viewBox;
 * - an element outside the allowlist, with everything inside it (`script`,
 *   `style`, `foreignObject`, `use`, `image`, `a`, `animate`, `set`, `filter`,
 *   gradients and `defs` among them);
 * - an attribute outside the allowlist (`on*`, `href`, `xlink:href`, `style`,
 *   `class`, `id`, `width` / `height` on the root among them) or one whose value
 *   is longer than MAX_ATTRIBUTE_LENGTH or fails its rule. Colours must be `var(--token)` from SVG_COLOR_TOKENS,
 *   `currentColor` or `none`, so `url(...)` never passes.
 *
 * No DOM APIs: the same code runs in the Studio (browser) and on the server. Lookup tables are Maps and Sets, so
 * a name like `constructor` or `__proto__` never resolves to an Object.prototype member, and sanitizeSvg never
 * throws: anything unexpected refuses the document.
 */

/** Longest input accepted, in UTF-16 code units. A two-variant chart is typically 5–20 KB. */
const MAX_INPUT_LENGTH = 100_000

const MAX_ELEMENTS = 2_000
const MAX_DEPTH = 24

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

/**
 * The site's colour custom properties an SVG may paint with. They resolve per brand inside the brand shell
 * (src/app/globals.css). The `--color-*` ones are Tailwind theme variables in an `@theme static` block, so they are
 * always emitted.
 */
export const SVG_COLOR_TOKENS = [
  // Brand roles
  '--accent',
  '--accent-hover',
  '--accent-subtle',
  '--secondary',
  '--surface-hover',
  // Page text and background
  '--foreground',
  '--background',
  // Shared neutrals
  '--color-dark',
  '--color-grey',
  '--color-border',
  '--color-border-plus',
  '--color-light',
  '--color-dark-blue-grey',
  '--color-light-blue-grey',
  '--color-surface-subtle',
] as const

export type SvgColorToken = (typeof SVG_COLOR_TOKENS)[number]

const COLOR_TOKENS: ReadonlySet<string> = new Set(SVG_COLOR_TOKENS)

// ---------------------------------------------------------------------------------------------------------------
// Value rules

type ValueRule = (value: string) => boolean

/** Longest attribute value accepted. A long chart path is a few hundred characters. */
const MAX_ATTRIBUTE_LENGTH = 2_000

// Every pattern here matches one token and has no nested or adjacent overlapping quantifiers, so a failing value
// never backtracks exponentially. Lists (points, viewBox, transform, path data) are split by the linear scanners
// below and each token is tested on its own; no regex runs a quantifier over a whole list.
const NUMBER = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?'
const NUMBER_RE = new RegExp(`^${NUMBER}$`)
/** Sticky: matches one number at lastIndex, for the path data scanner. */
const NUMBER_AT_RE = new RegExp(NUMBER, 'y')
const LENGTH_RE = new RegExp(`^${NUMBER}(?:px|%)?$`)
const PATH_COMMANDS: ReadonlySet<string> = new Set('MmZzLlHhVvCcSsQqTtAa')
const TRANSFORM_FUNCTIONS: ReadonlySet<string> = new Set(['translate', 'scale', 'rotate', 'matrix', 'skewX', 'skewY'])
const PRESERVE_ASPECT_RATIO_RE = /^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max))(?:\s+(?:meet|slice))?$/

const COLOR_VAR_RE = /^var\(\s*(--[a-z][a-z0-9-]*)\s*\)$/

// XML whitespace only. A form feed is not: it would pass here as a separator and then be dropped as a control
// character on output, so "1\f2" would validate as two numbers and emit as "12".
const isSpace = (character: string | undefined) =>
  character === ' ' || character === '\t' || character === '\n' || character === '\r'

/**
 * The items of a list separated by whitespace or by one comma with optional whitespace around it, or null when a
 * separator is malformed (leading, trailing or doubled comma). One pass, no regex.
 */
function splitList(value: string): string[] | null {
  const items: string[] = []
  let position = 0

  while (position < value.length && isSpace(value[position])) {
    position += 1
  }

  while (position < value.length) {
    const start = position

    while (position < value.length && !isSpace(value[position]) && value[position] !== ',') {
      position += 1
    }

    if (position === start) {
      return null
    }

    items.push(value.slice(start, position))

    while (position < value.length && isSpace(value[position])) {
      position += 1
    }

    if (value[position] === ',') {
      position += 1

      while (position < value.length && isSpace(value[position])) {
        position += 1
      }

      if (position >= value.length) {
        return null
      }
    }
  }

  return items
}

const isNumber: ValueRule = (value) => NUMBER_RE.test(value.trim())
const isLength: ValueRule = (value) => LENGTH_RE.test(value.trim())

const isNumberList: ValueRule = (value) => {
  const items = splitList(value)

  return items !== null && items.length > 0 && items.every((item) => NUMBER_RE.test(item))
}

/** Path data as commands and numbers, scanned left to right; the first command must be a moveto. */
const isPathData: ValueRule = (value) => {
  let position = 0
  let commands = 0

  while (position < value.length) {
    const character = value[position]

    if (isSpace(character) || character === ',') {
      position += 1
      continue
    }

    if (PATH_COMMANDS.has(character)) {
      if (commands === 0 && character !== 'M' && character !== 'm') {
        return false
      }

      commands += 1
      position += 1
      continue
    }

    if (commands === 0) {
      return false
    }

    NUMBER_AT_RE.lastIndex = position

    if (!NUMBER_AT_RE.test(value)) {
      return false
    }

    position = NUMBER_AT_RE.lastIndex
  }

  return commands > 0
}

/** A list of `name(numbers)` functions, optionally comma-separated, each with one to six numbers. */
const isTransform: ValueRule = (value) => {
  let position = 0
  let functions = 0

  for (;;) {
    while (position < value.length && isSpace(value[position])) {
      position += 1
    }

    if (position >= value.length) {
      return functions > 0
    }

    const open = value.indexOf('(', position)
    const close = open === -1 ? -1 : value.indexOf(')', open)

    if (close === -1 || !TRANSFORM_FUNCTIONS.has(value.slice(position, open).trimEnd())) {
      return false
    }

    const numbers = splitList(value.slice(open + 1, close))

    if (numbers === null || numbers.length < 1 || numbers.length > 6 || !numbers.every((item) => NUMBER_RE.test(item))) {
      return false
    }

    functions += 1
    position = close + 1

    while (position < value.length && isSpace(value[position])) {
      position += 1
    }

    if (value[position] === ',') {
      position += 1
    }
  }
}

const isOpacity: ValueRule = (value) => {
  if (!isNumber(value)) {
    return false
  }

  const number = Number(value)

  return number >= 0 && number <= 1
}

const isFontSize: ValueRule = (value) => {
  const match = /^(\d+(?:\.\d+)?)(px)?$/.exec(value.trim())

  return match !== null && Number(match[1]) > 0 && Number(match[1]) <= 200
}

const isColor: ValueRule = (value) => {
  const trimmed = value.trim()

  if (trimmed === 'none' || trimmed === 'currentColor') {
    return true
  }

  const match = COLOR_VAR_RE.exec(trimmed)

  return match !== null && COLOR_TOKENS.has(match[1])
}

const oneOf =
  (...allowed: string[]): ValueRule =>
  (value) =>
    allowed.includes(value.trim())

const isDashArray: ValueRule = (value) => value.trim() === 'none' || isNumberList(value)

// ---------------------------------------------------------------------------------------------------------------
// Allowlists

/** Paint and stroke attributes, allowed on every drawing element and inherited by children. */
const PRESENTATION: Record<string, ValueRule> = {
  fill: isColor,
  stroke: isColor,
  'stroke-width': isLength,
  'stroke-linecap': oneOf('butt', 'round', 'square'),
  'stroke-linejoin': oneOf('miter', 'round', 'bevel'),
  'stroke-dasharray': isDashArray,
  'stroke-dashoffset': isLength,
  'stroke-opacity': isOpacity,
  'fill-opacity': isOpacity,
  'fill-rule': oneOf('nonzero', 'evenodd'),
  opacity: isOpacity,
  'vector-effect': oneOf('none', 'non-scaling-stroke'),
  // Hides purely decorative shapes (connectors, dots) from screen readers.
  'aria-hidden': oneOf('true'),
}

const TEXT_STYLE: Record<string, ValueRule> = {
  'font-size': isFontSize,
  'font-weight': oneOf('normal', 'bold', '400', '500', '600', '700'),
  'font-style': oneOf('normal', 'italic'),
  // The site font is inherited from the page; nothing else may be named.
  'font-family': oneOf('inherit'),
  'text-anchor': oneOf('start', 'middle', 'end'),
  'dominant-baseline': oneOf('auto', 'alphabetic', 'middle', 'central', 'hanging'),
  'letter-spacing': isLength,
}

const TRANSFORMABLE = { transform: isTransform }

const XY = { x: isLength, y: isLength }

type ElementRule = {
  /** A Map, so an attribute named like an Object.prototype member (`constructor`, `__proto__`) is just unknown. */
  attributes: ReadonlyMap<string, ValueRule>
  /** Child elements allowed; anything else is dropped with its subtree. */
  children: readonly string[]
  /** Whether character data inside is kept. Whitespace-only text is dropped everywhere else. */
  text: boolean
}

const SHAPE_CHILDREN = ['title'] as const
const CONTAINER_CHILDREN = [
  'g',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'title',
  'desc',
] as const

const rules = (attributes: Record<string, ValueRule>): ReadonlyMap<string, ValueRule> =>
  new Map(Object.entries(attributes))

const ELEMENTS: ReadonlyMap<string, ElementRule> = new Map(
  Object.entries({
    svg: {
      attributes: rules({
        viewBox: (value) => parseViewBox(value) !== null,
        preserveAspectRatio: (value) => PRESERVE_ASPECT_RATIO_RE.test(value.trim()),
        // Paint without aria-hidden: on the root it would hide the whole diagram, title and text, from screen readers.
        ...Object.fromEntries(Object.entries(PRESENTATION).filter(([name]) => name !== 'aria-hidden')),
        ...TEXT_STYLE,
      }),
      children: CONTAINER_CHILDREN,
      text: false,
    },
    g: { attributes: rules({ ...PRESENTATION, ...TEXT_STYLE, ...TRANSFORMABLE }), children: CONTAINER_CHILDREN, text: false },
    rect: {
      attributes: rules({ ...XY, width: isLength, height: isLength, rx: isLength, ry: isLength, ...PRESENTATION, ...TRANSFORMABLE }),
      children: SHAPE_CHILDREN,
      text: false,
    },
    circle: {
      attributes: rules({ cx: isLength, cy: isLength, r: isLength, ...PRESENTATION, ...TRANSFORMABLE }),
      children: SHAPE_CHILDREN,
      text: false,
    },
    ellipse: {
      attributes: rules({ cx: isLength, cy: isLength, rx: isLength, ry: isLength, ...PRESENTATION, ...TRANSFORMABLE }),
      children: SHAPE_CHILDREN,
      text: false,
    },
    line: {
      attributes: rules({ x1: isLength, y1: isLength, x2: isLength, y2: isLength, ...PRESENTATION, ...TRANSFORMABLE }),
      children: SHAPE_CHILDREN,
      text: false,
    },
    polyline: {
      attributes: rules({ points: isNumberList, ...PRESENTATION, ...TRANSFORMABLE }),
      children: SHAPE_CHILDREN,
      text: false,
    },
    polygon: {
      attributes: rules({ points: isNumberList, ...PRESENTATION, ...TRANSFORMABLE }),
      children: SHAPE_CHILDREN,
      text: false,
    },
    path: { attributes: rules({ d: isPathData, ...PRESENTATION, ...TRANSFORMABLE }), children: SHAPE_CHILDREN, text: false },
    text: {
      attributes: rules({ ...XY, dx: isLength, dy: isLength, ...PRESENTATION, ...TEXT_STYLE, ...TRANSFORMABLE }),
      children: ['tspan'],
      text: true,
    },
    tspan: {
      attributes: rules({ ...XY, dx: isLength, dy: isLength, ...PRESENTATION, ...TEXT_STYLE }),
      children: [],
      text: true,
    },
    title: { attributes: rules({}), children: [], text: true },
    desc: { attributes: rules({}), children: [], text: true },
  } satisfies Record<string, ElementRule>),
)

/**
 * The allowlist as names, read from the tables above, for the generation prompt (src/lib/infographic-prompt.ts) so
 * the prompt never offers what the sanitiser deletes. Value rules stay here; the prompt words them itself.
 */
export const SVG_ALLOWLIST = (() => {
  const styling = new Set([...Object.keys(PRESENTATION), ...Object.keys(TEXT_STYLE), 'transform'])
  const geometry = new Set<string>()

  for (const [name, rule] of ELEMENTS) {
    for (const attribute of rule.attributes.keys()) {
      if (name !== 'svg' && !styling.has(attribute)) {
        geometry.add(attribute)
      }
    }
  }

  return {
    elements: [...ELEMENTS.keys()].filter((name) => name !== 'svg'),
    geometry: [...geometry],
    transformFunctions: [...TRANSFORM_FUNCTIONS],
    paint: Object.keys(PRESENTATION).filter((name) => name !== 'aria-hidden'),
    text: Object.keys(TEXT_STYLE),
  }
})()

/** A defence in depth on top of the per-attribute rules: no value containing these survives. */
const FORBIDDEN_IN_VALUES = /url\s*\(|javascript\s*:|expression\s*\(|[<>]/i

// ---------------------------------------------------------------------------------------------------------------
// Public API

export type SvgSanitizeReport = {
  /** The sanitised document, or null when the input was refused. */
  svg: string | null
  /** Why the whole input was refused, when it was. */
  error: string | null
  /** What was dropped from an accepted document: elements, attributes, stray text. */
  removed: string[]
}

export type SvgSanitizeOptions = {
  /**
   * Replaces the document's own `<title>` with this text, as the root's first child. The site passes the block's
   * title field, so the accessible name follows the editor's edits. Escaped like all text.
   */
  title?: string | null
  /** Replaces the document's own `<desc>` with this text, right after the title. */
  description?: string | null
}

/** The sanitised SVG markup, or null when the input must not be rendered at all. */
export function sanitizeSvg(input: string | null | undefined, options?: SvgSanitizeOptions): string | null {
  try {
    return input ? sanitizeSvgWithReport(input, options).svg : null
  } catch {
    // Fail closed: whatever goes wrong, nothing renders.
    return null
  }
}

/** As sanitizeSvg, with what was dropped and why a document was refused. For Studio feedback and the prototype. */
export function sanitizeSvgWithReport(input: string, options: SvgSanitizeOptions = {}): SvgSanitizeReport {
  const removed: string[] = []

  try {
    if (typeof input !== 'string') {
      throw new SvgRefused('input is not a string')
    }

    if (input.length > MAX_INPUT_LENGTH) {
      throw new SvgRefused(`input is ${input.length} characters, the limit is ${MAX_INPUT_LENGTH}`)
    }

    const root = parse(input)
    const svg = serializeRoot(root, removed, options)

    return { svg, error: null, removed }
  } catch (error) {
    // Fail closed: an unexpected error refuses the document instead of crashing the render.
    const message = error instanceof SvgRefused ? error.message : `internal error: ${String(error)}`

    return { svg: null, error: message, removed }
  }
}

/** The four numbers of a valid viewBox (positive width and height), or null. */
function parseViewBox(value: string): [number, number, number, number] | null {
  if (value.length > MAX_ATTRIBUTE_LENGTH) {
    return null
  }

  const items = splitList(value)

  if (items === null || !items.every((item) => NUMBER_RE.test(item))) {
    return null
  }

  const numbers = items.map(Number)

  if (numbers.length !== 4 || !numbers.every(Number.isFinite) || numbers[2] <= 0 || numbers[3] <= 0) {
    return null
  }

  return numbers as [number, number, number, number]
}

// ---------------------------------------------------------------------------------------------------------------
// Tokenizer and tree

class SvgRefused extends Error {}

type ElementNode = { kind: 'element'; name: string; attributes: [string, string][]; children: Node[] }
type TextNode = { kind: 'text'; value: string }
type Node = ElementNode | TextNode

const NAME_START = /[A-Za-z_:]/
const NAME_CHAR = /[A-Za-z0-9_:.-]/
const WHITESPACE = /[\t\n\r ]/

// One XML declaration at the very start, nothing else in it.
const XML_DECLARATION =
  /^\s*<\?xml\s+version\s*=\s*(["'])1\.[0-9]\1(?:\s+encoding\s*=\s*(["'])[A-Za-z][A-Za-z0-9._-]*\2)?(?:\s+standalone\s*=\s*(["'])(?:yes|no)\3)?\s*\?>/

// A Map, so `&constructor;` and the like are unknown entities rather than Object.prototype members.
const XML_ENTITIES: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
])

function parse(input: string): ElementNode {
  let source = input

  // A byte order mark is not content.
  if (source.charCodeAt(0) === 0xfeff) {
    source = source.slice(1)
  }

  const declaration = XML_DECLARATION.exec(source)
  let position = declaration ? declaration[0].length : 0

  const stack: ElementNode[] = []
  let root: ElementNode | null = null
  let elementCount = 0

  const fail = (message: string): never => {
    throw new SvgRefused(`${message} at offset ${position}`)
  }

  const appendText = (raw: string) => {
    const value = decodeEntities(raw, fail)
    const parent = stack[stack.length - 1]

    if (parent) {
      parent.children.push({ kind: 'text', value })
    } else if (value.trim() !== '') {
      fail('text outside the root element')
    }
  }

  const readName = (): string => {
    const start = position

    if (!NAME_START.test(source[position] ?? '')) {
      fail('expected a name')
    }

    while (position < source.length && NAME_CHAR.test(source[position])) {
      position += 1
    }

    return source.slice(start, position)
  }

  const skipWhitespace = () => {
    while (position < source.length && WHITESPACE.test(source[position])) {
      position += 1
    }
  }

  while (position < source.length) {
    const next = source.indexOf('<', position)

    if (next === -1) {
      appendText(source.slice(position))
      break
    }

    if (next > position) {
      appendText(source.slice(position, next))
      position = next
    }

    if (source.startsWith('<!--', position)) {
      const end = source.indexOf('-->', position + 4)

      if (end === -1) {
        fail('unclosed comment')
      }

      // Comments are dropped, never serialised.
      position = end + 3
      continue
    }

    if (source.startsWith('<![CDATA[', position)) {
      fail('CDATA sections are not allowed')
    }

    if (source.startsWith('<!', position)) {
      fail('DOCTYPE and other declarations are not allowed')
    }

    if (source.startsWith('<?', position)) {
      fail('processing instructions are not allowed')
    }

    if (source.startsWith('</', position)) {
      position += 2
      const name = readName()
      skipWhitespace()

      if (source[position] !== '>') {
        fail(`malformed closing tag </${name}`)
      }

      position += 1
      const open = stack.pop()

      if (!open || open.name !== name) {
        fail(`closing tag </${name}> does not match <${open?.name ?? 'nothing'}>`)
      }

      continue
    }

    // A start tag.
    position += 1
    const name = readName()
    const attributes: [string, string][] = []
    const seen = new Set<string>()
    let selfClosing = false

    for (;;) {
      const before = position
      skipWhitespace()

      if (source.startsWith('/>', position)) {
        selfClosing = true
        position += 2
        break
      }

      if (source[position] === '>') {
        position += 1
        break
      }

      if (position >= source.length) {
        fail(`unclosed start tag <${name}`)
      }

      if (position === before) {
        fail(`expected whitespace between attributes in <${name}>`)
      }

      const attribute = readName()
      skipWhitespace()

      if (source[position] !== '=') {
        fail(`attribute ${attribute} has no value`)
      }

      position += 1
      skipWhitespace()
      const quote = source[position]

      if (quote !== '"' && quote !== "'") {
        fail(`attribute ${attribute} is not quoted`)
      }

      const end = source.indexOf(quote, position + 1)

      if (end === -1) {
        fail(`unclosed value of attribute ${attribute}`)
      }

      const raw = source.slice(position + 1, end)

      if (raw.includes('<')) {
        fail(`"<" in the value of attribute ${attribute}`)
      }

      if (seen.has(attribute)) {
        fail(`duplicate attribute ${attribute}`)
      }

      seen.add(attribute)
      attributes.push([attribute, decodeEntities(raw, fail)])
      position = end + 1
    }

    elementCount += 1

    if (elementCount > MAX_ELEMENTS) {
      fail(`more than ${MAX_ELEMENTS} elements`)
    }

    const element: ElementNode = { kind: 'element', name, attributes, children: [] }
    const parent = stack[stack.length - 1]

    if (parent) {
      parent.children.push(element)
    } else if (root) {
      fail('more than one root element')
    } else {
      root = element
    }

    if (!selfClosing) {
      stack.push(element)

      if (stack.length > MAX_DEPTH) {
        fail(`elements nested deeper than ${MAX_DEPTH}`)
      }
    }
  }

  if (stack.length > 0) {
    fail(`unclosed element <${stack[stack.length - 1].name}>`)
  }

  if (!root) {
    fail('no root element')
  }

  return root as ElementNode
}

function decodeEntities(raw: string, fail: (message: string) => never): string {
  return raw.replace(/&([^;&\s]*);?/g, (match, body: string) => {
    if (!match.endsWith(';')) {
      return fail('bare "&" (write &amp;)')
    }

    if (body.startsWith('#')) {
      const code = /^#x[0-9a-fA-F]{1,6}$/.test(body)
        ? parseInt(body.slice(2), 16)
        : /^#[0-9]{1,7}$/.test(body)
          ? parseInt(body.slice(1), 10)
          : NaN

      if (!isXmlChar(code)) {
        return fail(`invalid character reference &${body};`)
      }

      return String.fromCodePoint(code)
    }

    const value = XML_ENTITIES.get(body)

    return value ?? fail(`unknown entity &${body};`)
  })
}

function isXmlChar(code: number): boolean {
  return (
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Serialiser

function serializeRoot(root: ElementNode, removed: string[], options: SvgSanitizeOptions): string {
  if (root.name !== 'svg') {
    throw new SvgRefused(`the root element is <${root.name}>, not <svg>`)
  }

  const viewBox = root.attributes.find(([name]) => name === 'viewBox')

  if (!viewBox || parseViewBox(viewBox[1]) === null) {
    throw new SvgRefused('the root <svg> has no valid viewBox')
  }

  for (const [name, value] of root.attributes) {
    // The namespace is written by the serialiser; a different one is a different vocabulary.
    if (name === 'xmlns' && value.trim() !== SVG_NAMESPACE) {
      throw new SvgRefused(`unexpected namespace ${value}`)
    }
  }

  // Replaced children go first, in place of the document's own (dropped, not reported: they are not a fault).
  const replaced = new Set<string>()
  let leading = ''

  for (const [name, text] of [
    ['title', options.title],
    ['desc', options.description],
  ] as const) {
    if (typeof text === 'string' && text.trim() !== '') {
      replaced.add(name)
      leading += `<${name}>${escapeText(text.trim())}</${name}>`
    }
  }

  return serializeElement(root, removed, `<svg xmlns="${SVG_NAMESPACE}"`, { leading, replaced })
}

function serializeElement(
  element: ElementNode,
  removed: string[],
  opening = `<${element.name}`,
  { leading = '', replaced }: { leading?: string; replaced?: ReadonlySet<string> } = {},
): string {
  const rule = ELEMENTS.get(element.name)

  if (!rule) {
    throw new SvgRefused(`no rule for <${element.name}>`)
  }

  let markup = opening

  for (const [name, value] of element.attributes) {
    if (element.name === 'svg' && name === 'xmlns') {
      continue
    }

    const check = rule.attributes.get(name)

    if (!check) {
      removed.push(`attribute ${name} on <${element.name}>`)
      continue
    }

    if (value.length > MAX_ATTRIBUTE_LENGTH) {
      removed.push(`attribute ${name} on <${element.name}>: ${value.length} characters, the limit is ${MAX_ATTRIBUTE_LENGTH}`)
      continue
    }

    if (FORBIDDEN_IN_VALUES.test(value) || !check(value)) {
      removed.push(`attribute ${name}="${truncate(value)}" on <${element.name}>`)
      continue
    }

    markup += ` ${name}="${escapeAttribute(value.trim())}"`
  }

  let content = leading

  for (const child of element.children) {
    if (child.kind === 'text') {
      if (rule.text) {
        content += escapeText(child.value)
      } else if (child.value.trim() !== '') {
        removed.push(`text "${truncate(child.value.trim())}" in <${element.name}>`)
      }

      continue
    }

    if (replaced?.has(child.name)) {
      continue
    }

    if (!ELEMENTS.has(child.name) || !rule.children.includes(child.name)) {
      removed.push(`element <${child.name}> in <${element.name}>`)
      continue
    }

    content += serializeElement(child, removed)
  }

  return content === '' ? `${markup}/>` : `${markup}>${content}</${element.name}>`
}

// Control characters XML forbids in raw text; a character reference already refused them.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

function escapeText(value: string): string {
  return value.replace(CONTROL_CHARACTERS, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

function truncate(value: string): string {
  return value.length > 60 ? `${value.slice(0, 57)}...` : value
}
