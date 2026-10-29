import { PortableText, stegaClean, type PortableTextComponents, type PortableTextProps } from 'next-sanity'

import { AdSlot } from '@/components/ui/AdSlot'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Figure } from '@/components/ui/Figure'
import { Media } from '@/components/ui/Media'
import { PullQuote } from '@/components/ui/PullQuote'
import { cx } from '@/components/ui/cx'
import { safeHref } from '@/lib/links'
import { toImage } from '@/sanity/image'

import { Infographic, type InfographicGroup } from './Infographic.client'

// Body images span the text column: 728px from the header breakpoint at the widest, the viewport below it.
const IMAGE_SIZES = '(min-width: 75rem) 864px, 100vw'

type Fact = { _key: string; label?: string; value?: string }
type Group = { _key: string; label?: string; items?: string[] }

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

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="text-base leading-copy text-pretty">{children}</p>,
    h2: ({ children }) => <h2 className="text-title-lg font-medium">{children}</h2>,
    h3: ({ children }) => <h3 className="text-title-md font-medium text-balance">{children}</h3>,
    h4: ({ children }) => <h4 className="text-base leading-title font-medium">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="m-0 border-l-2 border-border pl-4 text-base leading-copy text-grey">{children}</blockquote>
    ),
  },
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

      const className =
        'text-accent underline decoration-accent-subtle underline-offset-3 transition-opacity duration-180 ease-out hover:opacity-60'

      return value?.openInNewTab === true ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      ) : (
        <a href={href} className={className}>
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
    embed: ({ value }: { value: { provider?: string; id?: string; hash?: string; caption?: string } }) => {
      const src = embedSrc(value.provider, value.id, value.hash)

      return src ? (
        <Figure caption={value.caption}>
          <iframe
            src={src}
            title={value.caption || (stegaClean(value.provider) === 'issuu' ? 'Issuu publication' : 'Vimeo video')}
            loading="lazy"
            allow="fullscreen; picture-in-picture"
            className="aspect-video w-full rounded-sm border-0"
          />
        </Figure>
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
    infographic: ({
      value,
    }: {
      value: { eyebrow?: string; title?: string; intro?: string; hub?: string; groups?: Group[]; caption?: string; source?: string }
    }) => {
      const groups: InfographicGroup[] = (value.groups ?? [])
        .map((group) => ({ key: group._key, label: group.label ?? '', items: (group.items ?? []).filter(Boolean) }))
        .filter((group) => group.label && group.items.length > 0)
        .slice(0, 3)

      if (!value.title || !value.hub || groups.length === 0) {
        return null
      }

      return (
        <Infographic
          eyebrow={value.eyebrow ?? ''}
          title={value.title}
          intro={value.intro}
          hub={value.hub}
          groups={groups}
          caption={value.caption}
          source={value.source}
        />
      )
    },
    // The in-content banner. The editor places it; GAM fills the reserved slot.
    adBreak: () => (
      <div data-flow="block" role="complementary" aria-label="Advertisement, in article">
        <AdSlot size="leaderboard" />
      </div>
    ),
  },
}

/** A post's Portable Text body in the article column. Spacing between members comes from `.article-flow`. */
export function ArticleBody({ value }: { value: PortableTextProps['value'] }) {
  return (
    <div className="article-flow min-w-0">
      <PortableText value={value} components={components} />
    </div>
  )
}
