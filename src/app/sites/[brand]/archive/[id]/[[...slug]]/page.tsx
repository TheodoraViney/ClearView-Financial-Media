import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { BRANDS, brandOrigin, isBrandKey, type BrandKey } from '@/brands'
import { Container } from '@/components/ui/Container'
import { Meta } from '@/components/ui/Meta'
import {
  archiveArticlePath,
  getArchiveRecord,
  parseArchiveId,
  rewriteArchiveLinks,
  type ArchiveEvent,
  type ArchiveRecord,
} from '@/lib/archive'
import { formatDateRange } from '@/lib/dates'

// Temporary template for legacy archive articles until the archive design lands.

type Params = Promise<{ brand: string; id: string; slug?: string[] }>

// Cache Components needs at least one sample with every param, the optional slug included. Id 0 is never valid,
// so the sample renders the 404 and real articles render on first request.
export function generateStaticParams() {
  return [{ id: '0', slug: ['article'] }]
}

/**
 * The record behind the URL, or a 404: an id that is not a legacy id, an id
 * the archive does not hold, or a brand that does not publish the article
 * (the ClearView host therefore always 404s).
 */
async function loadArticle(params: Params): Promise<{ brand: BrandKey; record: ArchiveRecord; slug?: string[] }> {
  const { brand, id: rawId, slug } = await params

  if (!isBrandKey(brand)) {
    notFound()
  }

  const id = parseArchiveId(rawId)
  const record = id === null ? null : await getArchiveRecord(id)

  if (!record || !record.publications.includes(brand)) {
    notFound()
  }

  return { brand, record, slug }
}

const DESCRIPTION_LENGTH = 160

/** The standfirst, else the start of the body as plain text, cut at a word near 160 characters. */
function describe(record: ArchiveRecord): string | undefined {
  const text = (record.standfirst ?? plainText(record.bodyHtml)).trim()

  if (!text) {
    return undefined
  }

  if (text.length <= DESCRIPTION_LENGTH) {
    return text
  }

  const cut = text.slice(0, DESCRIPTION_LENGTH)
  const boundary = cut.lastIndexOf(' ')

  return `${(boundary > 80 ? cut.slice(0, boundary) : cut).replace(/[\s,.;:]+$/, '')}…`
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' }

/** Body HTML to plain text for a meta description. The body comes from the export allowlist. */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_match, name: string) => ENTITIES[name])
    .replace(/\s+/g, ' ')
}

/** A featured image the page can load: our archive media, or an external image over https. */
function imageSrc(value: string | null | undefined): string | null {
  return value && (value.startsWith('/archive-media/') || value.startsWith('https://')) ? value : null
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { brand, record } = await loadArticle(params)
  const path = archiveArticlePath(record)
  const description = describe(record)
  const image = imageSrc(record.media.image)
  const home = record.publications.find(isBrandKey) ?? brand

  return {
    title: record.title,
    description,
    // An article in several publications renders on each of their domains; the first one is canonical.
    alternates: { canonical: `${brandOrigin(home)}${path}` },
    openGraph: {
      type: 'article',
      title: record.title,
      description,
      url: `${brandOrigin(brand)}${path}`,
      siteName: BRANDS[brand].title,
      images: image ? [{ url: image.startsWith('/') ? `${brandOrigin(brand)}${image}` : image }] : undefined,
    },
  }
}

export default async function ArchiveArticlePage({ params }: { params: Params }) {
  const { brand, record, slug } = await loadArticle(params)

  // The id identifies the article and the slug is cosmetic: any other slug, or none, goes to the canonical URL.
  if (slug?.length !== 1 || slug[0] !== record.slug) {
    permanentRedirect(archiveArticlePath(record))
  }

  const date = formatDateRange(record.date, null)
  const type = record.types[brand]
  const author = record.author?.name
  const image = imageSrc(record.media.image)
  const videoId = record.media.videoId && /^\d+$/.test(record.media.videoId) ? record.media.videoId : null
  const attachment = record.media.attachment?.path?.startsWith('/archive-media/') ? record.media.attachment : null
  const body = record.bodyHtml ? rewriteArchiveLinks(record.bodyHtml, brand) : ''

  return (
    <main className="py-10 md:py-16">
      <Container>
        <article className="mx-auto flex max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-4">
            <Meta
              items={[
                BRANDS[brand].title,
                ...(type ? [type] : []),
                ...(date && record.date ? [<time key="date" dateTime={record.date}>{date}</time>] : []),
              ]}
            />
            <h1 className="text-heading-lg font-medium text-pretty text-foreground">{record.title}</h1>
            {record.standfirst && <p className="text-title-lg text-dark-blue-grey">{record.standfirst}</p>}
            {/* Name only: archive job titles and firms are too sparse to show. */}
            {author && <p className="text-caption text-grey">By {author}</p>}
          </header>

          {videoId ? (
            <div className="aspect-video w-full">
              <iframe
                src={`https://player.vimeo.com/video/${videoId}`}
                title={`Video: ${record.title}`}
                loading="lazy"
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          ) : (
            image && (
              // Archive media is served as is from R2; the Sanity image loader cannot resize it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={record.title} className="h-auto max-w-full self-start" />
            )
          )}

          {body && <div className="archive-prose" dangerouslySetInnerHTML={{ __html: body }} />}

          {attachment && (
            <p>
              <a href={attachment.path ?? undefined} className="font-medium text-accent underline hover:text-accent-hover" download>
                Download {attachment.filetype === 'application/pdf' ? 'PDF' : 'file'}
                {attachment.filename && <span className="sr-only">: {attachment.filename}</span>}
              </a>
            </p>
          )}

          {record.event && <EventDetails event={record.event} start={record.date} brand={brand} />}
        </article>
      </Container>
    </main>
  )
}

const EVENT_SECTIONS = [
  ['agenda', 'Agenda'],
  ['speakers', 'Speakers'],
  ['sponsors', 'Sponsors'],
] as const

function EventDetails({ event, start, brand }: { event: ArchiveEvent; start: string | null; brand: BrandKey }) {
  const dates = formatDateRange(start, event.endDate?.slice(0, 10) ?? null)
  const sections = EVENT_SECTIONS.flatMap(([key, label]) => {
    const html = event[key]

    return html ? [{ key, label, html: rewriteArchiveLinks(html, brand) }] : []
  })

  if (!event.venue && !dates && !event.time && sections.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="event-details" className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 id="event-details" className="text-heading-sm font-medium text-foreground">
        Event details
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {dates && (
          <>
            <dt className="text-grey">Date</dt>
            <dd>{dates}</dd>
          </>
        )}
        {event.time && (
          <>
            <dt className="text-grey">Time</dt>
            <dd>{event.time}</dd>
          </>
        )}
        {event.venue && (
          <>
            <dt className="text-grey">Venue</dt>
            <dd>{event.venue}</dd>
          </>
        )}
      </dl>
      {sections.map(({ key, label, html }) => (
        <div key={key} className="flex flex-col gap-2">
          <h3 className="text-title-lg font-medium text-foreground">{label}</h3>
          <div className="archive-prose" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      ))}
    </section>
  )
}
