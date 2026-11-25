import { PortableText, stegaClean, type PortableTextComponents, type PortableTextProps } from 'next-sanity'

import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { ConsentEmbed, type EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Figure } from '@/components/ui/Figure'
import { Media } from '@/components/ui/Media'
import { PullQuote } from '@/components/ui/PullQuote'
import { cx } from '@/components/ui/cx'
import { adPositionLabel, type AdUnitView } from '@/lib/gam'
import { safeHref } from '@/lib/links'
import { toImage } from '@/sanity/image'

import { GeneratedInfographic } from './GeneratedInfographic'

// Body images span the text column: 728px from the header breakpoint at the widest, the viewport below it.
const IMAGE_SIZES = '(min-width: 75rem) 864px, 100vw'

type Fact = { _key: string; label?: string; value?: string }

const FACT_BOX_SURFACES = {
  surface: 'bg-surface-subtle',
  outline: 'bg-white',
}

// Vimeo: digits, or showcase/digits. Issuu: a 32-character pubId, or {user}/{document}. The same rules as the schema,
// checked again here because the Content API accepts writes that never ran Studio validation.
function embedSrc(provider: string | undefined, id: string | undefined, hash: string | undefined): string | null {
  const value = stegaClean(id) ?? ''

  if (stegaClean(provider) === 'vimeo') {
    const showcase = /^showcase\/(\d+)$/.exec(value)

    if (showcase) {
      return `https://vimeo.com/showcase/${showcase[1]}/embed`
    }

    if (!/^\d+$/.test(value)) {
      return null
    }

    const h = stegaClean(hash)

    return `https://player.vimeo.com/video/${value}${h && /^[0-9a-f]+$/.test(h) ? `?h=${h}` : ''}`
  }

  if (stegaClean(provider) === 'issuu') {
    if (/^[0-9a-f]{32}$/.test(value)) {
      return `https://e.issuu.com/embed.html?pubId=${value}`
    }

    const document = /^([\w.-]+)\/([\w.-]+)$/.exec(value)

    return document ? `https://e.issuu.com/embed.html?u=${document[1]}&d=${document[2]}` : null
  }

  return null
}

// Text links in a body (accent, accent-subtle underline 3px below, fade on hover).
const LINK_CLASS =
  'text-accent underline decoration-accent-subtle underline-offset-3 transition-opacity duration-180 ease-out hover:opacity-60'

const blocks = {
  normal: ({ children }) => <p className="text-base leading-copy text-pretty">{children}</p>,
  h2: ({ children }) => <h2 className="text-title-lg font-medium">{children}</h2>,
  h3: ({ children }) => <h3 className="text-title-md font-medium text-balance">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base leading-title font-medium">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="m-0 border-l-2 border-border pl-4 text-base leading-copy text-grey">{children}</blockquote>
  ),
} satisfies PortableTextComponents['block']

const components: PortableTextComponents = {
  block: blocks,
  list: {
    bullet: ({ children }) => <ul className="flex list-disc flex-col gap-2 pl-6 text-base leading-copy">{children}</ul>,
    number: ({ children }) => <ol className="flex list-decimal flex-col gap-2 pl-6 text-base leading-copy">{children}</ol>,
  },
  marks: {
    // The default link mark renders any stored href, javascript: included. Unsafe hrefs render as plain text.
    link: ({ value, children }) => {
      const href = safeHref(value?.href)

      if (!href) {
        return <>{children}</>
      }

      return value?.openInNewTab === true ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {children}
        </a>
      ) : (
        <a href={href} className={LINK_CLASS}>
          {children}
        </a>
      )
    },
  },
  types: {
    // Full column width at the image's own aspect, nothing cropped.
    image: ({ value }) => {
      const image = toImage(value)

      return image ? (
        <Figure>
          <Media image={image} sizes={IMAGE_SIZES} natural />
        </Figure>
      ) : null
    },
    videoFile: ({ value }: { value: { url?: string | null; title?: string } }) => {
      const src = safeHref(value.url)

      return src ? (
        <video controls preload="metadata" src={src} aria-label={value.title} className="aspect-video w-full rounded-sm bg-dark" />
      ) : null
    },
    pullQuote: ({ value }: { value: { quote?: string; cite?: string } }) =>
      value.quote ? (
        <div data-flow="block">
          <PullQuote quote={value.quote} cite={value.cite} />
        </div>
      ) : null,
    factBox: ({ value }: { value: { title?: string; facts?: Fact[]; source?: string; variant?: string } }) => {
      const facts = (value.facts ?? [])
        .filter((fact) => fact.label && fact.value)
        .map((fact) => ({ key: fact._key, label: fact.label ?? '', value: fact.value ?? '' }))

      if (facts.length === 0) {
        return null
      }

      const variant = stegaClean(value.variant) === 'outline' ? 'outline' : 'surface'

      return (
        <aside
          data-flow="block"
          aria-label={value.title ? `Fact box: ${stegaClean(value.title)}` : 'Fact box'}
          className={cx('flex min-w-0 flex-col gap-4 rounded-sm border border-border p-4 md:p-6', FACT_BOX_SURFACES[variant])}
        >
          {/* A styled title, not a heading: the box sits anywhere in the text, so no level fits every place. */}
          {value.title && <p className="text-base leading-title font-medium break-words text-pretty">{value.title}</p>}
          <DefinitionList items={facts} />
          {value.source && <p className="border-t border-border pt-4 text-caption text-pretty text-grey">{value.source}</p>}
        </aside>
      )
    },
    // Renders nothing until the block has been generated.
    infographic: ({
      value,
    }: {
      value: {
        eyebrow?: string
        title?: string
        description?: string
        wide?: string
        narrow?: string
      }
    }) => (
      <GeneratedInfographic
        eyebrow={value.eyebrow}
        title={value.title}
        description={value.description}
        wide={value.wide}
        narrow={value.narrow}
      />
    ),
  },
}

type Embed = { provider?: string; id?: string; hash?: string; caption?: string }

/** The body components, with the Vimeo and Issuu players held until the reader allows functional cookies. */
function bodyComponents(embedCopy: EmbedConsentCopy): PortableTextComponents {
  return {
    ...components,
    types: {
      ...components.types,
      embed: ({ value }: { value: Embed }) => {
        const src = embedSrc(value.provider, value.id, value.hash)

        return src ? (
          <Figure caption={value.caption}>
            <ConsentEmbed
              src={src}
              title={value.caption || (stegaClean(value.provider) === 'issuu' ? 'Issuu publication' : 'Vimeo video')}
              copy={embedCopy}
              className="aspect-video w-full rounded-sm"
            />
          </Figure>
        ) : null
      },
    },
  }
}

/**
 * The article banner (728 × 90, 468 × 60 in a narrower column) in the text column, a block member of `.article-flow`.
 * Hidden where the column is too narrow even for 468 × 60 (`AD_SLOT_FITS`, inside an `@container`), and on the live
 * site when the brand has no unit for it.
 */
export function ArticleBanner({ unit }: { unit: AdUnitView | null }) {
  return (
    <div
      data-flow="block"
      role="complementary"
      aria-label="Advertisement, in article"
      className={unit ? AD_SLOT_FITS.leaderboard : AD_SLOT_UNSET}
    >
      <AdSlot size="leaderboard" unit={unit} label={adPositionLabel('article')} />
    </div>
  )
}

/**
 * A post's Portable Text body in the article column: the text before the banner, the article banner, then the text
 * after it. With no text after, the banner closes the body. Spacing between members comes from `.article-flow`.
 */
export function ArticleBody({
  value,
  after,
  banner,
  embedCopy,
}: {
  value: PortableTextProps['value'] | null | undefined
  after: PortableTextProps['value'] | null | undefined
  /** The brand's article banner unit; null hides the banner on the live site. */
  banner: AdUnitView | null
  /** Shown instead of an embedded player until the reader allows it. */
  embedCopy: EmbedConsentCopy
}) {
  const bodyMembers = bodyComponents(embedCopy)

  return (
    // A container for the article banner, which hides where the column is narrower than 728.
    <div className="article-flow @container min-w-0">
      {value && <PortableText value={value} components={bodyMembers} />}
      <ArticleBanner unit={banner} />
      {after && <PortableText value={after} components={bodyMembers} />}
    </div>
  )
}

// Outside an article an embed renders nothing: its player waits for consent copy, which the article page document holds.
const richTextComponents: PortableTextComponents = { ...components, types: { ...components.types, embed: () => null } }

// `sm`: paragraphs 14/20 (shared-shell speaker-card biography); the rest as the article body.
const smallRichTextComponents: PortableTextComponents = {
  ...richTextComponents,
  block: {
    ...blocks,
    normal: ({ children }) => <p className="text-sm leading-5 text-pretty">{children}</p>,
  },
}

// `lg`: paragraphs 20/28 (research Executive Summary lead); the rest as the article body.
const largeRichTextComponents: PortableTextComponents = {
  ...richTextComponents,
  block: {
    ...blocks,
    normal: ({ children }) => <p className="text-title-lg leading-7 text-pretty">{children}</p>,
  },
}

// `loose`: paragraphs 16/24 (shared-shell speaker-card biography dialog); the rest as the article body.
const looseRichTextComponents: PortableTextComponents = {
  ...richTextComponents,
  block: {
    ...blocks,
    normal: ({ children }) => <p className="text-base leading-6 text-pretty">{children}</p>,
  },
}

// `inherit`: paragraphs take the size, weight and wrapping of the container (a statement quote, PullQuote); the rest as
// the article body.
const inheritRichTextComponents: PortableTextComponents = {
  ...richTextComponents,
  block: {
    ...blocks,
    normal: ({ children }) => <p>{children}</p>,
  },
}

const SIZE_COMPONENTS = {
  base: richTextComponents,
  inherit: inheritRichTextComponents,
  sm: smallRichTextComponents,
  lg: largeRichTextComponents,
  loose: looseRichTextComponents,
}

type Definition = { _key: string; term?: string; text?: string }

type CookieRecord = {
  _key: string
  name?: string
  purpose?: string
  provider?: string
  service?: string
  serviceUrl?: string
  country?: string
  type?: string
  expires?: string
}

type CookieRecords = {
  nameLabel?: string
  purposeLabel?: string
  providerLabel?: string
  serviceLabel?: string
  serviceLinkLabel?: string
  countryLabel?: string
  typeLabel?: string
  expiresLabel?: string
  emptyValueLabel?: string
  records?: CookieRecord[]
}

/** A cookie's service: its name, then the link to its privacy policy (both optional). */
function cookieService(record: CookieRecord, linkLabel: string | undefined) {
  const href = safeHref(record.serviceUrl)

  return (
    <>
      {record.service}
      {record.service && href && linkLabel ? ' ' : null}
      {href && linkLabel ? (
        <a href={href} className={LINK_CLASS}>
          {linkLabel}
        </a>
      ) : null}
    </>
  )
}

/**
 * `legal` (privacy, terms and cookie pages, design wb-g-info): H2 26/32, H3 20/24, H4 16/20.8, H5 14/19.6; lists
 * 20px in with 8px between items; spacing from `.legal-flow`. H2 and H3 take their anchor id from `anchors` (by block
 * key, `headingAnchors()`), the table of contents' targets. Adds the legal members: an editor-placed divider, terms
 * definitions and cookie lists. No images, embeds or ads.
 */
function legalComponents(anchors: Record<string, string>): PortableTextComponents {
  return {
    block: {
      normal: blocks.normal,
      h2: ({ children, value }) => (
        <h2 id={value._key ? anchors[value._key] : undefined} data-toc-target="" className="text-title-xl font-medium text-balance">
          {children}
        </h2>
      ),
      h3: ({ children, value }) => (
        <h3 id={value._key ? anchors[value._key] : undefined} data-toc-target="" className="text-title-lg font-medium text-balance">
          {children}
        </h3>
      ),
      h4: ({ children }) => <h4 className="text-base leading-title font-medium">{children}</h4>,
      h5: ({ children }) => <h5 className="text-sm leading-copy font-medium">{children}</h5>,
    },
    list: {
      bullet: ({ children }) => <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-copy">{children}</ul>,
      number: ({ children }) => <ol className="flex list-decimal flex-col gap-2 pl-5 text-base leading-copy">{children}</ol>,
    },
    listItem: ({ children }) => <li className="pl-1">{children}</li>,
    marks: components.marks,
    types: {
      // The rule and the 40px under it; `.legal-flow` puts 48 above it and nothing between it and the next heading.
      divider: () => <hr data-flow="divider" className="border-border pb-10" />,
      definitions: ({ value }: { value: { rows?: Definition[] } }) => {
        const items = (value.rows ?? [])
          .filter((row) => row.term && row.text)
          .map((row) => ({ key: row._key, label: row.term ?? '', value: row.text ?? '' }))

        return items.length > 0 ? <DefinitionList variant="terms" items={items} /> : null
      },
      // Each cookie a record of seven labelled rows, 24px apart. An empty value keeps its row with the placeholder.
      cookieRecords: ({ value }: { value: CookieRecords }) => {
        const records = (value.records ?? []).filter((record) => record.name)
        // A value the cookie does not have: the CMS placeholder in grey, as the design.
        const orEmpty = (text: string | undefined) => text || <span className="text-grey">{value.emptyValueLabel}</span>

        return records.length > 0 ? (
          <div className="flex flex-col gap-6">
            {records.map((record) => (
              <DefinitionList
                key={record._key}
                variant="record"
                items={[
                  { key: 'name', label: value.nameLabel ?? '', value: <span className="font-medium">{record.name}</span> },
                  { key: 'purpose', label: value.purposeLabel ?? '', value: orEmpty(record.purpose) },
                  { key: 'provider', label: value.providerLabel ?? '', value: orEmpty(record.provider) },
                  { key: 'service', label: value.serviceLabel ?? '', value: record.service || record.serviceUrl ? cookieService(record, value.serviceLinkLabel) : orEmpty(undefined) },
                  { key: 'country', label: value.countryLabel ?? '', value: orEmpty(record.country) },
                  { key: 'type', label: value.typeLabel ?? '', value: orEmpty(record.type) },
                  { key: 'expires', label: value.expiresLabel ?? '', value: orEmpty(record.expires) },
                ]}
              />
            ))}
          </div>
        ) : null
      },
    },
  }
}

/** A Portable Text value for `RichText`. */
export type RichTextValue = PortableTextProps['value']

/**
 * A `richText` field outside an article (a shared record's introduction, a judge's biography): the body members
 * without the article banner. Spacing between members comes from `.article-flow`. Paragraphs take the text colour
 * of the container.
 */
export function RichText({
  value,
  size = 'base',
  spacing = 'default',
  variant = 'default',
  anchors,
  className,
}: {
  value: PortableTextProps['value']
  size?: keyof typeof SIZE_COMPONENTS
  /** Opt-in `tight`: 16px between every member (research Executive Summary, split-editorial-section). */
  spacing?: 'default' | 'tight'
  /** Opt-in `legal`: the legal page body (`legalComponents`, `.legal-flow`); `size` and `spacing` do not apply. */
  variant?: 'default' | 'legal'
  /** `legal` only: H2 and H3 anchor ids by block key. */
  anchors?: Record<string, string>
  className?: string
}) {
  if (variant === 'legal') {
    return (
      <div className={cx('legal-flow min-w-0', className)}>
        <PortableText value={value} components={legalComponents(anchors ?? {})} />
      </div>
    )
  }

  return (
    <div className={cx('article-flow min-w-0', spacing === 'tight' && 'article-flow-tight', className)}>
      <PortableText value={value} components={SIZE_COMPONENTS[size]} />
    </div>
  )
}
