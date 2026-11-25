import { RichText, type RichTextValue } from '@/components/sections/article/ArticleBody'
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { Container } from '@/components/ui/Container'
import { TableOfContents } from '@/components/ui/TableOfContents'
import type { TocItem } from '@/lib/heading-anchors'

export type LegalTextProps = {
  headingId: string
  breadcrumb: BreadcrumbItem[]
  title: string
  intro: RichTextValue | null
  tocLabel: string
  toc: TocItem[]
  anchors: Record<string, string>
  body: RichTextValue | null
}

/**
 * A legal document page (design wb-g-info: privacy policy, terms and conditions, cookie policy).
 * Padding 32 / 64 on mobile, 40 / 96 from md (top / bottom); sides 16 / 32 / 64 (64 from 1200).
 * The text column is at most 728 wide and centred; header (breadcrumb, H1 + optional introduction, gap 24) 48 above
 * the body.
 * - Below the toc breakpoint (1320): the table of contents is a closed disclosure at the end of the header.
 * - From 1320: three tracks 32 apart, the table of contents a sticky rail (at most 220 wide) in the first, the text
 *   in the 728 middle one.
 */
export function LegalText({ headingId, breadcrumb, title, intro, tocLabel, toc, anchors, body }: LegalTextProps) {
  return (
    <Container className="pt-8 pb-16 md:pt-10 md:pb-24 header:px-16 toc:grid toc:grid-cols-legal toc:gap-x-8">
      {toc.length > 0 && (
        <aside className="sticky top-rail col-start-1 row-start-1 hidden max-h-toc-rail w-full max-w-55 min-w-0 self-start justify-self-start overflow-y-auto toc:block">
          <TableOfContents items={toc} title={tocLabel} layout="rail" />
        </aside>
      )}

      <article
        aria-labelledby={headingId}
        className="mx-auto flex w-full max-w-182 min-w-0 flex-col gap-12 toc:col-start-2 toc:row-start-1"
      >
        <header className="flex flex-col gap-6">
          <Breadcrumb items={breadcrumb} />
          {/* Title and introduction 16 apart; the introduction's paragraphs 16 apart (`.legal-flow`). */}
          <div className="flex flex-col gap-4">
            <h1 id={headingId} className="text-heading-section font-medium text-pretty">
              {title}
            </h1>
            {intro && <RichText value={intro} variant="legal" />}
          </div>
          {toc.length > 0 && <TableOfContents items={toc} title={tocLabel} layout="stacked" className="toc:hidden" />}
        </header>

        {body && <RichText value={body} variant="legal" anchors={anchors} />}
      </article>
    </Container>
  )
}
