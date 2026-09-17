#!/usr/bin/env node
/**
 * WordPress wysiwyg HTML -> Portable Text matching the `richText` schema type.
 *
 * The contract requires every migrated record to be "fully editable in the CMS
 * without a developer", so prose cannot land in Sanity as a string of HTML.
 * This module turns one HTML blob into the exact array shape declared by
 * `src/sanity/schema/objects/rich-text.ts`. It writes nothing: the loader is a
 * separate step and is not written yet.
 *
 * Measured over the two extracts on 2026-09-17 (2489 prose blobs, 3 106 832
 * source characters). Every number in these comments came from that run, not
 * from a guess. Re-run with `--report` after any re-extract; the numbers move.
 *
 * ## The five things that would silently break a naive converter
 *
 * 1. Paragraphs are `\n\n`, not `<p>`. This is the WordPress classic editor:
 *    `wpautop()` inserts the `<p>` and `<br />` tags at render time, so the
 *    stored value has none. 1158 of the 2489 blobs are separated only by blank
 *    lines and 1434 carry no tag at all. Feeding those straight to an HTML
 *    deserialiser collapses a whole field into one paragraph. `wpautop()` below
 *    is a port of the WordPress function, applied before parsing. 282 blobs mix
 *    both conventions - blank lines *and* real `<ul>`/`<h2>`/`<p>` - which is
 *    why the port keeps WordPress's block-tag exceptions rather than splitting
 *    on `\n\n` alone.
 *
 * 2. Link schemes must be allowlisted. `richText` enforces
 *    `Rule.uri({scheme: ['http','https','mailto','tel']})`, so any other scheme
 *    fails validation the moment the loader writes it, and a `javascript:` href
 *    stored in CMS prose is the stored XSS described in README section 10. Any
 *    href outside the allowlist loses its annotation and keeps its text, and
 *    every one is counted and listed in the report. Today's corpus has no
 *    `javascript:` href (455 https, 275 mailto, 68 http, 1 scheme-less), but
 *    the corpus is re-exported immediately before cutover, so the check stays.
 *
 * 3. `wp-image-{id}` is the only handle on an inline image. 56 unique
 *    attachment ids appear in `class="... wp-image-1234 ..."` and in no field
 *    anywhere else, so an `<img>` dropped here is an attachment nobody can find
 *    again. Images become an `image` member carrying a `wpImage` sidecar
 *    (attachment id, src, host, and the wrapping link href where there is one)
 *    and no `asset`. The media stage resolves `asset` and deletes the sidecar.
 *    `--report` prints the full id list as JSON because that list is its input.
 *
 * 4. Images point at five hosts, three of which are legacy infrastructure:
 *    clearviewpublishing.com 66, clearviewevents.profundcom.net 33,
 *    wb001.profundcom.net 14, s.w.org 12, plus two singletons. Nothing here
 *    fetches any of them. The 12 on s.w.org are the WordPress emoji sprites;
 *    they are replaced by the emoji character itself (from the `alt`, which
 *    carries it) before parsing, because an emoji is text, not an attachment.
 *
 * 5. `<iframe>` (37 in prose: vimeo 16, issuu 9, photobucket 11, 1 with no
 *    src) has no home in `richText` and no home in the schema at all. It is
 *    removed and reported per record so a decision can be made; it is never
 *    dropped silently. Same treatment for the 50 `<table>` elements in 14
 *    blobs, 48 `<hr>`, and the 4 `<script>`/`<style>` blocks. A further 8
 *    iframes live in the acclaim `issuu_embed_code` field, which is not prose
 *    and is excluded below with its reason.
 *
 * ## Paste noise that is inert, and paste noise that is not
 *
 * Inert, because the deserialiser reads tags and not styles: ChatGPT's
 * `data-start`/`data-end` (2577 attributes in 39 blobs) and Google Docs'
 * `<span style="font-weight: 400">` (4912 in 139 blobs, 5235 spans counting
 * every variant). The ChatGPT pair is stripped anyway, for a stable diff.
 *
 * Not inert:
 *   - `<span style="text-decoration: underline">` (216) carries the only
 *     underline in the blob. Styles are invisible to the deserialiser, so the
 *     span is rewritten to `<u>` first or the underline is lost in silence.
 *   - `<strong><b>` / `<b><strong>` double wrapping (754 in 82 blobs) produces
 *     `marks: ["strong","strong"]`, which is not valid Portable Text. 937 marks
 *     are de-duplicated in post-processing.
 *   - The deserialiser trims whitespace at the inside edge of an inline tag, so
 *     `<strong><a>email</a> </strong>Chloe` lands as "emailChloe". 5652 such
 *     spaces are moved outside the tag before parsing.
 *   - `<div>a</div><div>b</div>` merges into one block. Container elements are
 *     flattened to paragraphs before parsing.
 *   - `aria-level` on `<li>` (154 in 25 blobs) is always `"1"` here, so there
 *     is no flattened Google Docs nesting to rebuild. Checked, not assumed.
 *
 * ## What counts as a prose blob
 *
 * Every record's post body, plus the fields the WordPress field dumps type as
 * `wysiwyg` or `textarea` (19 on Event), plus the Pods `comp_about` on Company,
 * which `company.about` receives as richText. That is 2489 values:
 *
 *     1534  people    content            bios
 *      251  events    content
 *      145  companies comp_about
 *      559  events    19 ACF prose fields, repeater rows included
 *
 * Resources contribute nothing: the block editor returned empty bodies for all
 * 12 records (migration notes section 4), so `resource.body` has no source
 * today. Any other field carrying tags is reported under "HTML found in fields
 * that are not on the prose list" rather than converted quietly; today that is
 * only the 8 acclaim `issuu_embed_code` values.
 *
 * ## Dependencies
 *
 * @portabletext/block-tools (MIT), @portabletext/schema (MIT), jsdom (MIT),
 * all devDependencies. `@sanity/block-tools` is the name most guides give; it
 * is deprecated in favour of `@portabletext/block-tools` and is not used here.
 * The block type is mirrored below rather than imported, because
 * `src/sanity/schema/objects/rich-text.ts` is TypeScript and this is a plain
 * node script; `assertSchemaMirror()` diffs the mirror against the generated
 * `schema.json` and against the scheme allowlist in the .ts file, and the CLI
 * refuses to run on drift.
 *
 * ## Usage
 *
 *   node scripts/html-to-portable-text.mjs .migration-source/wp-events.json --report
 *   node scripts/html-to-portable-text.mjs --report            # both extracts
 *   node scripts/html-to-portable-text.mjs --out blocks.json   # converted JSON
 *   node scripts/html-to-portable-text.mjs --show 46826:acf[field_62d18d74eb2b1]
 *
 * As a module:
 *
 *   import {htmlToPortableText} from './scripts/html-to-portable-text.mjs'
 *   const blocks = htmlToPortableText(html)   // pure, deterministic keys
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { htmlToBlocks } from '@portabletext/block-tools'
import { compileSchema } from '@portabletext/schema'
import { JSDOM } from 'jsdom'

/* -------------------------------------------------------------------------- */
/* Schema mirror                                                              */
/* -------------------------------------------------------------------------- */

/** Allowlist from `richText`'s link annotation. Anything else loses the link. */
export const LINK_SCHEMES = ['http', 'https', 'mailto', 'tel']

/** Styles declared on the block member of `richText`. No h1, no h5, no h6. */
const STYLES = ['normal', 'h2', 'h3', 'h4', 'blockquote']

/** `richText` declares no `lists`, so Sanity's defaults apply. */
const LISTS = ['bullet', 'number']

/**
 * `richText` declares `marks.annotations` but no `marks.decorators`, so Sanity's
 * defaults apply. Verified by compiling the block with @sanity/schema and
 * deserialising `<code> <del> <s> <u> <strong>`: all five came back as marks.
 */
const DECORATORS = ['strong', 'em', 'code', 'underline', 'strike-through']

const schema = compileSchema({
  styles: STYLES.map((name) => ({ name })),
  lists: LISTS.map((name) => ({ name })),
  decorators: DECORATORS.map((name) => ({ name })),
  annotations: [
    {
      name: 'link',
      fields: [
        { name: 'href', type: 'string' },
        { name: 'openInNewTab', type: 'boolean' },
      ],
    },
  ],
  // `options: {hotspot: true}` is deliberately not mirrored: it changes the
  // Studio cropping UI and nothing about deserialisation.
  blockObjects: [{ name: 'image', fields: [{ name: 'alt', type: 'string' }] }],
  inlineObjects: [],
})

/* -------------------------------------------------------------------------- */
/* Stage 1: string-level clean, before any parsing                            */
/* -------------------------------------------------------------------------- */

/** Elements wpautop treats as blocks, i.e. never wraps in `<p>`. */
const AUTOP_BLOCKS =
  'table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|math|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary|iframe'

const EMOJI_IMG = /<img\b[^>]*>/gi

/**
 * The WordPress emoji shim rewrites a typed emoji into an `<img class="emoji">`
 * pointing at s.w.org. All 12 in this corpus carry the character in `alt`; the
 * filename (`1f4e7.svg`) is the documented fallback and is decoded when `alt`
 * is missing.
 */
function emojiFromImg(tag) {
  const alt = /\balt="([^"]*)"/i.exec(tag)
  if (alt && alt[1].trim()) return alt[1]
  const src = /\bsrc="([^"]*)"/i.exec(tag)
  const file = src && /([0-9a-fA-F]{4,6}(?:-[0-9a-fA-F]{4,6})*)\.svg/.exec(src[1])
  if (!file) return ''
  try {
    return String.fromCodePoint(...file[1].split('-').map((hex) => parseInt(hex, 16)))
  } catch {
    return ''
  }
}

function preClean(html, notes) {
  let out = String(html).replace(/\r\n?/g, '\n')

  // Executable content. Two blobs carry `<script src="player.vimeo.com/api">`
  // and two carry `<style>`. This WordPress was hit by ClickFix malware on
  // 2026-08-20 (README section 4), so anything executable is removed and
  // reported with a sample rather than passed on.
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (m) => {
    notes.stripped.script.push(m.slice(0, 160))
    return ''
  })
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, (m) => {
    notes.stripped.style.push(m.slice(0, 160))
    return ''
  })
  out = out.replace(/<\/?(?:script|style)\b[^>]*>/gi, (m) => {
    notes.stripped.script.push(`unclosed: ${m.slice(0, 120)}`)
    return ''
  })

  // TinyMCE selection bookmarks and the zero-width chars they leave behind.
  out = out.replace(/<span[^>]*data-mce-type="bookmark"[^>]*>[\s\S]*?<\/span>/gi, () => {
    notes.stripped.mceBookmark++
    return ''
  })
  out = out.replace(/﻿/g, '')

  // ChatGPT paste markers. Inert, removed so the output diff is about content.
  out = out.replace(/\s(?:data-start|data-end)="[^"]*"/gi, () => {
    notes.stripped.dataStartEnd++
    return ''
  })

  out = out.replace(EMOJI_IMG, (tag) => {
    if (!/\bclass="[^"]*\bemoji\b[^"]*"/i.test(tag)) return tag
    const char = emojiFromImg(tag)
    if (char) notes.emojiInlined++
    else notes.unmapped.push('emoji img with neither alt nor a codepoint filename')
    return char
  })

  return out
}

/**
 * Port of WordPress `wpautop($pee, $br = true)`.
 *
 * Kept faithful rather than simplified: the block-tag exceptions are the whole
 * point. A plain "split on \n\n" would wrap `<li>`, `<td>` and `<h2>` in `<p>`
 * and put a `<br />` after every `</ul>`, and 279 blobs in this corpus mix
 * blank-line paragraphs with real block markup.
 */
function wpautop(html, notes, br = true) {
  if (!html || !html.trim()) return ''
  const blocks = AUTOP_BLOCKS
  let pee = `${html}\n`

  pee = pee.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
  pee = pee.replace(new RegExp(`(<(?:${blocks})(?:\\s[^>]*)?/?>)`, 'gi'), '\n\n$1')
  pee = pee.replace(new RegExp(`(</(?:${blocks})>)`, 'gi'), '$1\n\n')
  pee = pee.replace(/\n\n+/g, '\n\n')

  const parts = pee.split(/\n\s*\n/).filter((part) => part.trim() !== '')
  notes.autopParagraphs += parts.length
  pee = parts.map((part) => `<p>${part.replace(/\n+$/, '')}</p>\n`).join('')

  pee = pee.replace(/<p>\s*<\/p>/gi, '')
  pee = pee.replace(new RegExp(`<p>\\s*(</?(?:${blocks})(?:\\s[^>]*)?/?>)\\s*</p>`, 'gi'), '$1')
  pee = pee.replace(/<p>(<li[\s\S]+?)<\/p>/gi, '$1')
  pee = pee.replace(/<p><blockquote([^>]*)>/gi, '<blockquote$1><p>')
  pee = pee.replace(/<\/blockquote><\/p>/gi, '</p></blockquote>')
  pee = pee.replace(new RegExp(`<p>\\s*(</?(?:${blocks})(?:\\s[^>]*)?/?>)`, 'gi'), '$1')
  pee = pee.replace(new RegExp(`(</?(?:${blocks})(?:\\s[^>]*)?/?>)\\s*</p>`, 'gi'), '$1')

  if (br) {
    pee = pee.replace(/(?<!<br \/>)\s*\n/g, '<br />\n')
    pee = pee.replace(new RegExp(`(</?(?:${blocks})(?:\\s[^>]*)?/?>)\\s*<br />`, 'gi'), '$1')
    pee = pee.replace(/<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)>)/gi, '$1')
  }

  return pee.replace(/\n<\/p>$/gi, '</p>')
}

/* -------------------------------------------------------------------------- */
/* Stage 2: DOM surgery, before deserialisation                               */
/* -------------------------------------------------------------------------- */

const CONTAINERS =
  'div,section,article,header,footer,nav,aside,main,figure,figcaption,form,label,center'
const INLINE = 'a,b,strong,i,em,u,s,strike,del,ins,span,code,cite,q,big,small'
const BLOCK_CHILD =
  'p,h1,h2,h3,h4,h5,h6,ul,ol,li,table,blockquote,pre,div,section,article,header,footer,nav,aside,main,figure,figcaption,form,label,center'

/**
 * One jsdom window for the whole process, used only as a source of `DOMParser`.
 *
 * `new JSDOM()` per blob defines a fresh set of DOM classes per window and the
 * heap grows about 1.5 MB per call whether or not the window is closed:
 * measured, 2489 blobs exhausted a 4 GB heap after roughly 2000 of them.
 * Documents made by one window's `DOMParser` are collected normally.
 */
let sharedParser = null
function parseDocument(html) {
  if (!sharedParser) {
    const { DOMParser } = new JSDOM('').window
    sharedParser = new DOMParser()
  }
  return sharedParser.parseFromString(String(html), 'text/html')
}

function hostOf(src) {
  try {
    return new URL(src).host
  } catch {
    return null
  }
}

function rename(doc, el, tag) {
  const next = doc.createElement(tag)
  while (el.firstChild) next.appendChild(el.firstChild)
  for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value)
  el.replaceWith(next)
  return next
}

function domClean(doc, notes) {
  // Iframes: 45 in the corpus, no home in the schema. Recorded, then removed,
  // so the report can name the record that loses an embed.
  for (const el of Array.from(doc.querySelectorAll('iframe'))) {
    const src = el.getAttribute('src') || ''
    notes.iframes.push({ src, host: hostOf(src) || '(no src)' })
    el.remove()
  }

  // Tables: 14 blobs, 50 tables. `richText` has no table member. Every cell
  // becomes its own paragraph so no text is lost and no two cells silently run
  // together, and the record is reported for a human decision.
  for (const table of Array.from(doc.querySelectorAll('table')).reverse()) {
    const frag = doc.createDocumentFragment()
    let cells = 0
    for (const cell of Array.from(table.querySelectorAll('td,th'))) {
      cells++
      if (cell.querySelector(BLOCK_CHILD)) {
        while (cell.firstChild) frag.appendChild(cell.firstChild)
      } else {
        const p = doc.createElement('p')
        while (cell.firstChild) p.appendChild(cell.firstChild)
        frag.appendChild(p)
      }
    }
    notes.tables.push(cells)
    table.replaceWith(frag)
  }

  // Containers. `<div>a</div><div>b</div>` deserialises to one block with the
  // text "ab", which is the silent kind of failure. Deepest first: reversing
  // document order guarantees a child container is handled before its parent.
  for (const el of Array.from(doc.querySelectorAll(CONTAINERS)).reverse()) {
    notes.containersFlattened++
    if (el.querySelector(BLOCK_CHILD)) {
      el.replaceWith(...Array.from(el.childNodes))
    } else {
      rename(doc, el, 'p')
    }
  }

  // Headings the schema does not have. h5 appears 186 times, h1 twice.
  for (const el of Array.from(doc.querySelectorAll('h1,h5,h6'))) {
    const from = el.tagName.toLowerCase()
    notes.headingsRemapped[from] = (notes.headingsRemapped[from] || 0) + 1
    rename(doc, el, from === 'h1' ? 'h2' : 'h4')
  }

  // Inline styles are invisible to the deserialiser, so the two that carry
  // meaning are rewritten into tags it does read.
  for (const el of Array.from(doc.querySelectorAll('span[style]'))) {
    const style = (el.getAttribute('style') || '').toLowerCase()
    if (/text-decoration:\s*underline/.test(style)) {
      notes.underlineSpans++
      rename(doc, el, 'u')
    } else if (/font-weight:\s*(?:bold|[6-9]00)/.test(style)) {
      notes.boldSpans++
      rename(doc, el, 'strong')
    }
  }

  // `<hr>` has no member in `richText`. Counted, then removed.
  for (const el of Array.from(doc.querySelectorAll('hr'))) {
    notes.stripped.hr++
    el.remove()
  }

  // The deserialiser trims whitespace at the inside edge of an inline element,
  // so `<strong><a>email</a> </strong>Chloe` came out as "emailChloe" - a word
  // join, in the middle of a sentence, that reads as a typo rather than as a
  // migration fault. Moving the space outside the element first keeps it.
  // Deepest first, so a space pushed out of `<a>` is seen again by `<strong>`.
  for (const el of Array.from(doc.querySelectorAll(INLINE)).reverse()) {
    const last = el.lastChild
    if (last && last.nodeType === 3 && /\s$/.test(last.textContent)) {
      const space = /\s+$/.exec(last.textContent)[0]
      last.textContent = last.textContent.slice(0, -space.length)
      const next = el.nextSibling
      if (next && next.nodeType === 3) next.textContent = space + next.textContent
      else el.after(doc.createTextNode(space))
      notes.edgeSpacesMoved++
    }
    const first = el.firstChild
    if (first && first.nodeType === 3 && /^\s/.test(first.textContent)) {
      const space = /^\s+/.exec(first.textContent)[0]
      first.textContent = first.textContent.slice(space.length)
      const previous = el.previousSibling
      if (previous && previous.nodeType === 3) previous.textContent += space
      else el.before(doc.createTextNode(space))
      notes.edgeSpacesMoved++
    }
  }

  // An image inside a link loses the link: the `image` member has only `alt`.
  // The href is carried on the element so the placeholder can keep it.
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const anchor = img.closest('a')
    const href = anchor && anchor.getAttribute('href')
    if (href) img.setAttribute('data-wp-link', href)
  }

  // Inline tags with no decorator in the schema. Text is kept, the wrapper is
  // not; counted so the loss is visible.
  for (const el of Array.from(doc.querySelectorAll('sup,sub,small,mark,abbr,font,wbr'))) {
    const tag = el.tagName.toLowerCase()
    notes.inlineUnwrapped[tag] = (notes.inlineUnwrapped[tag] || 0) + 1
    el.replaceWith(...Array.from(el.childNodes))
  }

  return doc
}

/* -------------------------------------------------------------------------- */
/* Stage 3: hrefs                                                             */
/* -------------------------------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * -> {href, status: 'keep' | 'repair' | 'drop', scheme, reason}
 *
 * `drop` means the annotation goes and the text stays. Nothing here invents a
 * host for a relative path: a wrong destination that validates is worse than a
 * missing link, and it is the same failure the redirect baseline is built to
 * avoid (README section 4).
 */
export function normaliseHref(raw) {
  const href = String(raw ?? '').trim()
  if (!href) return { href: '', status: 'drop', scheme: '(empty)', reason: 'empty href' }

  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href)
  if (scheme) {
    const lower = scheme[1].toLowerCase()
    if (!LINK_SCHEMES.includes(lower)) {
      return { href, status: 'drop', scheme: lower, reason: `scheme not in the richText allowlist` }
    }
    // Sanity's uri rule matches the scheme case-sensitively.
    const normalised = lower + href.slice(scheme[1].length)
    return {
      href: normalised,
      status: normalised === href ? 'keep' : 'repair',
      scheme: lower,
      reason: normalised === href ? '' : 'scheme lower-cased',
    }
  }

  if (href.startsWith('//')) {
    return {
      href: `https:${href}`,
      status: 'repair',
      scheme: '(protocol-relative)',
      reason: 'protocol-relative href assumed https',
    }
  }
  if (EMAIL.test(href)) {
    return {
      href: `mailto:${href}`,
      status: 'repair',
      scheme: '(bare email)',
      reason: 'email address typed without a scheme',
    }
  }
  return {
    href,
    status: 'drop',
    scheme: href.startsWith('#') ? '(fragment)' : '(relative)',
    reason: 'no scheme, and no destination this script is allowed to invent',
  }
}

/* -------------------------------------------------------------------------- */
/* Stage 4: post-processing                                                   */
/* -------------------------------------------------------------------------- */

function normaliseText(text) {
  return String(text)
    .replace(/ /g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

/** Recursively drop keys whose value is undefined or null. */
function compact(value) {
  if (Array.isArray(value)) return value.map(compact)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined || val === null) continue
      out[key] = compact(val)
    }
    return out
  }
  return value
}

function postProcess(blocks, notes) {
  const out = []

  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue
    const key = `b${out.length}`

    if (raw._type !== 'block') {
      out.push(compact({ ...raw, _key: key }))
      continue
    }

    const children = Array.isArray(raw.children) ? raw.children : []
    const markDefs = Array.isArray(raw.markDefs) ? raw.markDefs : []
    const defByOldKey = new Map(markDefs.map((def) => [def._key, def]))
    const usedDefs = new Map()
    const spans = []

    for (const child of children) {
      if (child._type !== 'span') {
        // An inline object inside a block: `richText` has no inlineObjects, so
        // this cannot happen. Reported rather than dropped, in case it ever does.
        notes.unmapped.push(`inline object of type ${child._type} inside a block`)
        continue
      }
      const marks = []
      for (const mark of Array.isArray(child.marks) ? child.marks : []) {
        if (DECORATORS.includes(mark)) {
          if (!marks.includes(mark)) marks.push(mark)
          else notes.marksDeduped++
          continue
        }
        const def = defByOldKey.get(mark)
        if (!def) continue
        if (!usedDefs.has(mark)) usedDefs.set(mark, `${key}l${usedDefs.size}`)
        const newKey = usedDefs.get(mark)
        if (!marks.includes(newKey)) marks.push(newKey)
        else notes.marksDeduped++
      }

      const text = normaliseText(child.text ?? '')
      const previous = spans[spans.length - 1]
      if (previous && previous.marks.join('|') === marks.join('|')) {
        previous.text += text
      } else {
        spans.push({ _type: 'span', _key: '', text, marks })
      }
    }

    if (spans.length) {
      spans[0].text = spans[0].text.replace(/^[ \t\n]+/, '')
      spans[spans.length - 1].text = spans[spans.length - 1].text.replace(/[ \t\n]+$/, '')
    }
    const kept = spans.filter((span, index) => span.text !== '' || spans.length === 1 || index === 0)
    const text = kept.map((span) => span.text).join('')
    if (!text.trim()) {
      notes.emptyBlocksDropped++
      continue
    }

    kept.forEach((span, index) => {
      span._key = `${key}s${index}`
    })

    const block = {
      _type: 'block',
      _key: key,
      style: STYLES.includes(raw.style) ? raw.style : 'normal',
      markDefs: [...usedDefs.entries()].map(([oldKey, newKey]) =>
        compact({ ...defByOldKey.get(oldKey), _key: newKey }),
      ),
      children: kept,
    }
    if (raw.listItem) {
      block.listItem = LISTS.includes(raw.listItem) ? raw.listItem : 'bullet'
      block.level = Number.isInteger(raw.level) && raw.level > 0 ? raw.level : 1
    }
    if (!STYLES.includes(raw.style)) notes.unmapped.push(`block style ${raw.style} -> normal`)
    out.push(compact(block))
  }

  return out
}

/* -------------------------------------------------------------------------- */
/* Conversion                                                                 */
/* -------------------------------------------------------------------------- */

function emptyNotes() {
  return {
    charsIn: 0,
    charsOut: 0,
    autopParagraphs: 0,
    emojiInlined: 0,
    marksDeduped: 0,
    emptyBlocksDropped: 0,
    containersFlattened: 0,
    edgeSpacesMoved: 0,
    underlineSpans: 0,
    boldSpans: 0,
    stripped: { script: [], style: [], mceBookmark: 0, dataStartEnd: 0, hr: 0 },
    headingsRemapped: {},
    inlineUnwrapped: {},
    tables: [],
    iframes: [],
    images: [],
    links: { kept: {}, repaired: [], dropped: [] },
    unmapped: [],
  }
}

/**
 * Convert one HTML blob and report everything the conversion could not carry.
 * Pure: no I/O, no randomness, no clock. Keys are positional, so the same
 * input always produces byte-identical output.
 */
export function convert(html) {
  const notes = emptyNotes()
  const source = String(html ?? '')
  notes.charsIn = source.length
  if (!source.trim()) return { blocks: [], notes }

  const prepared = wpautop(preClean(source, notes), notes)

  let counter = 0
  const keyGenerator = () => `t${counter++}`

  const imageMatcher = ({ props, context }) => {
    const src = props.src || ''
    const id = /\bwp-image-(\d+)\b/.exec(props.class || '')
    const host = hostOf(src)
    const record = {
      attachmentId: id ? id[1] : null,
      src,
      host: host || '(invalid src)',
      alt: props.alt || null,
      linkHref: props['data-wp-link'] || null,
    }
    notes.images.push(record)
    if (!host) notes.unmapped.push(`image src is not a URL: ${src.slice(0, 60)}`)
    if (!id) notes.unmapped.push(`image with no wp-image class: ${src.slice(0, 80)}`)
    return compact({
      _type: 'image',
      _key: context.keyGenerator(),
      alt: props.alt && props.alt.trim() ? props.alt.trim() : undefined,
      // No `asset`: the attachments are not in Sanity yet. The media stage
      // resolves this sidecar and removes it. Anything still carrying `wpImage`
      // at load time is an image the loader must refuse, not skip.
      wpImage: record,
    })
  }

  const rules = [
    {
      deserialize(el, next) {
        if (!el.tagName || el.tagName.toLowerCase() !== 'a') return undefined
        const result = normaliseHref(el.getAttribute('href'))
        const text = (el.textContent || '').trim().slice(0, 80)
        if (result.status === 'drop') {
          notes.links.dropped.push({ href: result.href, scheme: result.scheme, reason: result.reason, text })
          return next(el.childNodes)
        }
        if (result.status === 'repair') {
          notes.links.repaired.push({
            from: (el.getAttribute('href') || '').trim(),
            to: result.href,
            reason: result.reason,
            text,
          })
        }
        notes.links.kept[result.scheme] = (notes.links.kept[result.scheme] || 0) + 1
        return {
          _type: '__annotation',
          markDef: compact({
            _key: keyGenerator(),
            _type: 'link',
            href: result.href,
            openInNewTab: (el.getAttribute('target') || '').toLowerCase() === '_blank' || undefined,
          }),
          children: next(el.childNodes),
        }
      },
    },
  ]

  const raw = htmlToBlocks(prepared, schema, {
    keyGenerator,
    rules,
    matchers: { image: imageMatcher, inlineImage: imageMatcher },
    parseHtml: (input) => domClean(parseDocument(input), notes),
  })

  const blocks = postProcess(raw, notes)

  // Belt and braces on the security-relevant rule: if the deserialiser ever
  // stops calling the link rule, a disallowed href must still not survive.
  for (const block of blocks) {
    if (block._type !== 'block') continue
    const dropped = new Set()
    block.markDefs = block.markDefs.filter((def) => {
      if (def._type !== 'link') return true
      const check = normaliseHref(def.href)
      if (check.status === 'drop' || check.href !== def.href) {
        notes.unmapped.push(`link annotation survived the rule and was stripped: ${def.href}`)
        dropped.add(def._key)
        return false
      }
      return true
    })
    if (dropped.size) {
      for (const child of block.children) child.marks = child.marks.filter((m) => !dropped.has(m))
    }
  }

  notes.charsOut = blockText(blocks).length
  return { blocks, notes }
}

/** The public, pure entry point. */
export function htmlToPortableText(html) {
  return convert(html).blocks
}

/** Plain text of a Portable Text array, for loss checks. */
export function blockText(blocks) {
  return blocks
    .map((block) =>
      block._type === 'block'
        ? block.children.map((child) => child.text || '').join('')
        : `[${block._type}]`,
    )
    .join('\n')
}

/* -------------------------------------------------------------------------- */
/* Blob inventory                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Prose fields, by post type. Derived from the field dumps in
 * `.migration-source/` on 2026-09-17: every ACF field typed `wysiwyg` or
 * `textarea` on Events, plus the Pods `comp_about` on Companies, plus the
 * post body on every type.
 *
 * Deliberately excluded, with the reason, because section 8 of the migration
 * notes requires every non-empty source field to have either an address in the
 * schema or a written reason:
 *   - acclaim `acf[field_693aae5141adc]` (issuu_embed_code): an `<iframe>`
 *     embed, not prose. `acclaim.issuuId` holds the document hash instead.
 */
const PROSE_FIELDS = {
  events: [
    'field_62d18981c92b7', // cyph_key_dates
    'field_67d1932b97880', // agenda_text (inside the agenda_itineraries repeater)
    'field_62d19383eb2b8', // cyph_agenda
    'field_62d18be063bd5', // cyph_judges_intro
    'field_62d18d74eb2b1', // cyph_categories
    'field_62d192abeb2b2', // cyph_awards_supplement
    'field_62d192cfeb2b3', // cyph_awardwinners_supplement
    'field_62d19306eb2b4', // cyph_finalists
    'field_62d19318eb2b5', // cyph_winners
    'field_6348171709840', // cyph_categories, the nested textarea, not the top-level one
    'field_62d19340eb2b7', // cyph_previous_winners
    'field_62d199ccef487', // cyph_sponsor_benefits
    'field_62d19a11ef489', // cyph_tickets
    'field_62d19a30ef48a', // cyph_register
    'field_62dace6cfa7b5', // td_description
    'field_62d19bdd00dc0', // cyph_testimonials
    'field_62d19d7b00dc5', // cyph_charity_statement
    'field_62d19e2b00dca', // cyph_faqs
    'field_62d19e8a00dce', // cyph_custom_tab_content
  ],
  companies: ['pods_meta_comp_about'],
  people: [],
  acclaim: [],
  resource: [],
  resources: [],
}

const HAS_TAG = /<\/?[a-zA-Z][^>]*>/

function collectBlobs(files) {
  const blobs = []
  const strays = []

  const walk = (rec, type, path, value, isProse) => {
    if (typeof value === 'string') {
      if (!value.trim()) return
      if (isProse) blobs.push({ type, id: rec.id, path, html: value })
      else if (HAS_TAG.test(value)) strays.push({ type, id: rec.id, path, sample: value.slice(0, 90) })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(rec, type, `${path}[${index}]`, item, isProse))
      return
    }
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) walk(rec, type, `${path}.${key}`, item, isProse)
    }
  }

  for (const file of files) {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    const sets = data.types
      ? Object.entries(data.types).map(([type, block]) => [type, block.records || []])
      : [[data.postType || 'records', data.records || []]]

    for (const [type, records] of sets) {
      const prose = PROSE_FIELDS[type] || []
      for (const rec of records) {
        if (typeof rec.content === 'string' && rec.content.trim()) {
          blobs.push({ type, id: rec.id, path: 'content', html: rec.content })
        }
        for (const [key, value] of Object.entries(rec.fields || {})) {
          const ids = [...key.matchAll(/field_[0-9a-f]+/g)].map((m) => m[0])
          const isProse = prose.includes(key) || ids.some((id) => prose.includes(id))
          walk(rec, type, key, value, isProse)
        }
      }
    }
  }

  return { blobs, strays }
}

/* -------------------------------------------------------------------------- */
/* Schema mirror check                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The mirror above is a copy, and a copy drifts. This diffs it against the
 * generated `schema.json` (styles, list items) and against the scheme
 * allowlist written in the .ts source, and returns the differences.
 */
function assertSchemaMirror(root = '.') {
  const problems = []
  try {
    const extracted = JSON.parse(readFileSync(`${root}/schema.json`, 'utf8'))
    const rich = extracted.find((type) => type.name === 'richText')
    const block = rich?.value?.of?.of?.find((member) =>
      member.attributes?.style && member.attributes?.children,
    )
    const values = (attr) =>
      (block?.attributes?.[attr]?.value?.of || []).map((entry) => entry.value).filter(Boolean)
    const styles = values('style')
    const lists = values('listItem')
    // A check that cannot fail is worse than no check: say so rather than pass.
    if (!block || !styles.length || !lists.length) {
      problems.push('could not find the block member of richText in schema.json')
    } else {
      if (styles.join() !== STYLES.join()) {
        problems.push(`styles drift: schema.json has [${styles}], this script mirrors [${STYLES}]`)
      }
      if (lists.join() !== LISTS.join()) {
        problems.push(`list items drift: schema.json has [${lists}], this script mirrors [${LISTS}]`)
      }
    }
  } catch (err) {
    problems.push(`could not read schema.json (run pnpm typegen): ${err.message}`)
  }

  try {
    const source = readFileSync(`${root}/src/sanity/schema/objects/rich-text.ts`, 'utf8')
    const match = /scheme:\s*\[([^\]]*)\]/.exec(source)
    const schemes = match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
    if (schemes.join() !== LINK_SCHEMES.join()) {
      problems.push(
        `link scheme allowlist drift: rich-text.ts has [${schemes}], this script mirrors [${LINK_SCHEMES}]`,
      )
    }
  } catch (err) {
    problems.push(`could not read rich-text.ts: ${err.message}`)
  }

  return problems
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

const DEFAULT_FILES = ['.migration-source/wp-events.json', '.migration-source/wp-source.json']

function visibleText(html) {
  const doc = parseDocument(html)
  for (const el of Array.from(doc.querySelectorAll('script,style,iframe'))) el.remove()
  return normaliseText(doc.body.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by
}

/** `--out` and `--show` take a value; everything else bare is an input file. */
function parseArgs(args) {
  const parsed = { files: [], report: false, out: null, show: null }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--report') parsed.report = true
    else if (arg === '--out') parsed.out = args[++index] ?? null
    else if (arg === '--show') parsed.show = args[++index] ?? null
    else if (arg.startsWith('--')) throw new Error(`unknown flag ${arg}`)
    else parsed.files.push(arg)
  }
  return parsed
}

function main(argv) {
  const { files, report: wantReport, out: outPath, show: showTarget } = parseArgs(argv.slice(2))
  const targets = files.length ? files : DEFAULT_FILES

  const drift = assertSchemaMirror()
  if (drift.length) {
    console.error('Schema mirror is out of date. Fix the mirror before trusting the output:')
    for (const line of drift) console.error(`  - ${line}`)
    process.exitCode = 1
    return
  }

  const { blobs, strays } = collectBlobs(targets)

  if (showTarget) {
    const [id, ...rest] = String(showTarget).split(':')
    const path = rest.join(':')
    const found = blobs.filter((blob) => blob.id === id && (!path || blob.path === path))
    for (const blob of found) {
      console.log(`--- ${blob.type} ${blob.id} ${blob.path}`)
      console.log('SOURCE:')
      console.log(blob.html)
      console.log('PORTABLE TEXT:')
      console.log(JSON.stringify(htmlToPortableText(blob.html), null, 2))
    }
    if (!found.length) console.error(`no blob matched ${showTarget}`)
    return
  }

  const totals = {
    blobs: 0,
    charsIn: 0,
    charsOut: 0,
    blocks: 0,
    failures: [],
    invalid: [],
    styles: {},
    listItems: 0,
    linksKept: {},
    linksRepaired: [],
    linksDropped: [],
    images: [],
    iframes: [],
    tables: [],
    scripts: [],
    stripped: { mceBookmark: 0, dataStartEnd: 0, hr: 0 },
    emoji: 0,
    marksDeduped: 0,
    emptyBlocks: 0,
    headings: {},
    inlineUnwrapped: {},
    underline: 0,
    bold: 0,
    edgeSpaces: 0,
    unmapped: {},
    lossy: [],
    byField: {},
  }

  const converted = []

  for (const blob of blobs) {
    let result
    try {
      result = convert(blob.html)
    } catch (err) {
      totals.failures.push({ ...blob, error: err.message })
      continue
    }
    const { blocks, notes } = result
    converted.push({ type: blob.type, id: blob.id, path: blob.path, blocks })

    totals.blobs++
    totals.charsIn += notes.charsIn
    totals.charsOut += notes.charsOut
    totals.blocks += blocks.length
    totals.emoji += notes.emojiInlined
    totals.marksDeduped += notes.marksDeduped
    totals.emptyBlocks += notes.emptyBlocksDropped
    totals.underline += notes.underlineSpans
    totals.edgeSpaces += notes.edgeSpacesMoved
    totals.bold += notes.boldSpans
    totals.stripped.mceBookmark += notes.stripped.mceBookmark
    totals.stripped.dataStartEnd += notes.stripped.dataStartEnd
    totals.stripped.hr += notes.stripped.hr
    bump(totals.byField, `${blob.type} ${blob.path.replace(/\[row-\d+\]/g, '[row]')}`)

    for (const [style, count] of Object.entries(notes.headingsRemapped)) bump(totals.headings, style, count)
    for (const [tag, count] of Object.entries(notes.inlineUnwrapped)) bump(totals.inlineUnwrapped, tag, count)
    for (const [scheme, count] of Object.entries(notes.links.kept)) bump(totals.linksKept, scheme, count)
    for (const item of notes.links.repaired) totals.linksRepaired.push({ ...blob, ...item })
    for (const item of notes.links.dropped) totals.linksDropped.push({ ...blob, ...item })
    for (const item of notes.images) totals.images.push({ type: blob.type, id: blob.id, path: blob.path, ...item })
    for (const item of notes.iframes) totals.iframes.push({ type: blob.type, id: blob.id, path: blob.path, ...item })
    for (const cells of notes.tables) totals.tables.push({ type: blob.type, id: blob.id, path: blob.path, cells })
    for (const sample of [...notes.stripped.script, ...notes.stripped.style])
      totals.scripts.push({ type: blob.type, id: blob.id, path: blob.path, sample })
    for (const note of notes.unmapped) bump(totals.unmapped, note.replace(/: .*/, ''))

    for (const block of blocks) {
      if (block._type === 'block') {
        bump(totals.styles, block.style)
        if (block.listItem) totals.listItems++
      } else {
        bump(totals.styles, `(${block._type})`)
      }
      for (const [path, value] of nullPaths(block)) {
        totals.invalid.push({ ...blob, path: `${blob.path} ${path}`, value: String(value) })
      }
    }

    const before = visibleText(blob.html)
    const after = normaliseText(blockText(blocks)).replace(/\s+/g, ' ').trim()
    if (before.length && after.length < before.length * 0.98) {
      totals.lossy.push({
        type: blob.type,
        id: blob.id,
        path: blob.path,
        before: before.length,
        after: after.length,
        lost: before.length - after.length,
      })
    }
  }

  if (outPath) {
    writeFileSync(outPath, `${JSON.stringify(converted, null, 2)}\n`)
    console.error(`wrote ${converted.length} converted blobs to ${outPath}`)
  }

  if (!wantReport) {
    if (!outPath) process.stdout.write(`${JSON.stringify(converted)}\n`)
    return
  }

  report(totals, blobs, strays, targets)
}

/** Every path inside a block whose value is null or undefined. */
function nullPaths(value, path = '') {
  const out = []
  if (value === null || value === undefined) {
    out.push([path, value])
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => out.push(...nullPaths(item, `${path}[${index}]`)))
    return out
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) out.push(...nullPaths(item, `${path}.${key}`))
  }
  return out
}

function table(map) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `    ${String(count).padStart(6)}  ${key}`)
    .join('\n')
}

function report(totals, blobs, strays, targets) {
  const out = []
  const p = (line = '') => out.push(line)

  p('HTML -> Portable Text')
  p(`  sources                 ${targets.join(', ')}`)
  p(`  prose blobs found       ${blobs.length}`)
  p(`  converted               ${totals.blobs}`)
  p(`  threw                   ${totals.failures.length}`)
  p(`  null/undefined in output${String(totals.invalid.length).padStart(9)}`)
  p(`  characters in           ${totals.charsIn}`)
  p(`  characters out          ${totals.charsOut}`)
  p(`  blocks out              ${totals.blocks}`)
  p(`  list item blocks        ${totals.listItems}`)
  p(`  empty blocks dropped    ${totals.emptyBlocks}`)
  p()
  p('  blobs by field')
  p(table(totals.byField))
  p()
  p('  block styles')
  p(table(totals.styles))
  p()

  p('Links')
  p('  kept, by scheme')
  p(table(totals.linksKept))
  p(`  repaired ${totals.linksRepaired.length}`)
  for (const item of totals.linksRepaired) {
    p(`    ${item.type} ${item.id} ${item.path}: ${item.from} -> ${item.to}  (${item.reason})`)
  }
  p(`  dropped ${totals.linksDropped.length}  (annotation removed, text kept)`)
  for (const item of totals.linksDropped) {
    p(`    ${item.type} ${item.id} ${item.path}: [${item.scheme}] ${item.href}  text="${item.text}"  ${item.reason}`)
  }
  p()

  const ids = [...new Set(totals.images.map((img) => img.attachmentId).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b),
  )
  const hosts = {}
  for (const img of totals.images) bump(hosts, img.host)
  p('Images')
  p(`  image members emitted   ${totals.images.length}`)
  p(`  with a wp-image id      ${totals.images.filter((img) => img.attachmentId).length}`)
  p(`  unique attachment ids   ${ids.length}`)
  p(`  wrapped in a link       ${totals.images.filter((img) => img.linkHref).length}`)
  p(`  emoji inlined as text   ${totals.emoji}`)
  p('  hosts')
  p(table(hosts))
  p('  wp-image ids, for the media stage:')
  p(`    ${JSON.stringify(ids)}`)
  const noId = totals.images.filter((img) => !img.attachmentId)
  p(`  ${noId.length} image members carry no wp-image id, so they can only be fetched by src:`)
  for (const img of noId) p(`    ${img.type} ${img.id} ${img.path}: ${img.src.slice(0, 110)}`)
  p()

  p('Unmapped constructs, by record')
  p(`  iframes removed ${totals.iframes.length} - no member in richText, decision needed`)
  for (const item of totals.iframes) {
    p(`    ${item.type} ${item.id} ${item.path}: ${item.host}  ${item.src.slice(0, 90)}`)
  }
  p(`  tables flattened to paragraphs ${totals.tables.length}`)
  for (const item of totals.tables) p(`    ${item.type} ${item.id} ${item.path}: ${item.cells} cells`)
  p(`  script/style removed ${totals.scripts.length}`)
  for (const item of totals.scripts) {
    p(`    ${item.type} ${item.id} ${item.path}: ${JSON.stringify(item.sample.slice(0, 90))}`)
  }
  p(`  horizontal rules removed ${totals.stripped.hr}`)
  p('  headings remapped (no h1/h5/h6 in richText)')
  p(table(totals.headings) || '         0')
  p('  inline tags unwrapped (no decorator in richText)')
  p(table(totals.inlineUnwrapped) || '         0')
  p(`  underline spans rewritten to <u>  ${totals.underline}`)
  p(`  bold spans rewritten to <strong>  ${totals.bold}`)
  p(`  duplicate marks removed           ${totals.marksDeduped}`)
  p(`  edge spaces moved out of inline tags ${totals.edgeSpaces}`)
  p(`  TinyMCE bookmarks removed         ${totals.stripped.mceBookmark}`)
  p(`  ChatGPT data-start/end removed    ${totals.stripped.dataStartEnd}`)
  p('  other notes')
  p(table(totals.unmapped) || '         0')
  p()

  p('Text-loss check (visible source text vs. converted text, >2% lost)')
  p(`  blobs flagged ${totals.lossy.length}`)
  for (const item of totals.lossy.sort((a, b) => b.lost - a.lost).slice(0, 20)) {
    p(`    ${item.type} ${item.id} ${item.path}: ${item.before} -> ${item.after} chars (-${item.lost})`)
  }
  p()

  p('HTML found in fields that are not on the prose list')
  p(`  ${strays.length} values; these have no richText destination today`)
  const strayFields = {}
  for (const stray of strays) bump(strayFields, `${stray.type} ${stray.path.replace(/\[row-\d+\]/g, '[row]')}`)
  p(table(strayFields) || '         0')
  p()

  if (totals.failures.length) {
    p('Failures')
    for (const item of totals.failures) p(`    ${item.type} ${item.id} ${item.path}: ${item.error}`)
    p()
  }
  if (totals.invalid.length) {
    p('null/undefined found inside blocks')
    for (const item of totals.invalid.slice(0, 40)) p(`    ${item.type} ${item.id} ${item.path}`)
    p()
  }

  console.log(out.join('\n'))
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('html-to-portable-text.mjs')
if (invokedDirectly) main(process.argv)
