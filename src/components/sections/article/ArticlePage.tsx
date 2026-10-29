import Link from 'next/link'

import { AdSlot } from '@/components/ui/AdSlot'
import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { Figure } from '@/components/ui/Figure'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import type { ArticleView } from '@/lib/article'
import { formatLongDate } from '@/lib/dates'

import { ShareActions, ShareProvider, ShareRail } from './ArticleShare.client'
import { AuthorModule } from './AuthorModule'
import { MostRead } from './MostRead'
import { RecommendedArticles } from './RecommendedArticles'

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the article design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// The hero's rendered width per layout:
// - from 1356px (84.75rem) the column has room for the 728px text column: 728px;
// - 1200–1355: the main column (viewport − 364px rail) minus 2 × 64px padding = 100vw − 492px (30.75rem);
// - 768–1199: viewport minus 2 × 32px padding;
// - below 768: viewport minus 2 × 16px, but the 220px-high box is narrower than 16:9 there and crops the sides,
//   so the image needs at least 220 × 16/9 ≈ 391px (24.4375rem). Above 768 every box is wider than 16:9.
const HERO_SIZES =
  '(min-width: 84.75rem) 728px, (min-width: 75rem) calc(100vw - 30.75rem), (min-width: 48rem) calc(100vw - 4rem), max(100vw - 2rem, 24.4375rem)'

/**
 * The article page: main column with header, hero, body, author and recommended articles, and the right rail
 * (banner and Most read) beside it from the header breakpoint, below it before. The text column centres at 728px
 * with the share rail on its left once the column has room for both (`@article`, 864px).
 */
export function ArticlePage({ article }: { article: ArticleView }) {
  const date = formatLongDate(article.publishedAt)
  const time = date && article.publishedAt ? <time dateTime={article.publishedAt}>{date}</time> : null
  const author = article.author
  const { copy } = article

  const breadcrumb: BreadcrumbItem[] = [
    { label: copy.breadcrumbHomeLabel, href: '/' },
    ...(article.category ? [article.category] : []),
    // As the mockup: the topic closes the trail as plain text (pending the designer's answer on the last item).
    ...(article.topic ? [{ label: article.topic.label }] : []),
  ]

  return (
    <main className="mx-auto w-full max-w-page header:grid header:grid-cols-article">
      <div className="flex min-w-0 flex-col">
        <ShareProvider url={article.shareUrl} title={article.title} linkCopiedLabel={copy.linkCopiedLabel}>
          <div role="complementary" aria-label="Advertisement, top" className={`${PAD} pt-6 md:pt-10`}>
            <AdSlot size="leaderboard" />
          </div>

          <header className={`flex flex-col gap-6 ${PAD} pt-8 md:pt-10`}>
            <Breadcrumb items={breadcrumb} />
            <div className="flex max-w-221 flex-col gap-3">
              {(article.topic || time) && (
                <Meta
                  className="leading-none"
                  items={[
                    ...(article.topic
                      ? [
                          article.topic.href ? (
                            <Link
                              key="topic"
                              href={article.topic.href}
                              className="font-medium text-accent transition-opacity duration-180 ease-out hover:opacity-60"
                            >
                              {article.topic.label}
                            </Link>
                          ) : (
                            <span key="topic" className="font-medium text-accent">
                              {article.topic.label}
                            </span>
                          ),
                        ]
                      : []),
                    ...(time ? [time] : []),
                  ]}
                />
              )}
              <h1 className="text-heading-lg font-medium text-balance">{article.title}</h1>
            </div>
            {article.standfirst && <p className="max-w-182 text-base leading-copy text-pretty text-grey">{article.standfirst}</p>}
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border pt-6">
              {author || time ? (
                <div className="flex min-w-0 items-center gap-3">
                  {author && <Avatar name={author.name} image={author.photo} />}
                  <div className="flex min-w-0 flex-col gap-2">
                    {author && (
                      <Meta
                        className="leading-none"
                        items={[
                          <span key="name" className="text-sm leading-none font-medium text-foreground">
                            {author.name}
                          </span>,
                          ...(author.jobTitle ? [author.jobTitle] : []),
                          ...(author.city ? [author.city] : []),
                        ]}
                      />
                    )}
                    <Meta
                      className="leading-none"
                      items={[
                        ...(time ? [time] : []),
                        ...(article.readingMinutes ? [`${article.readingMinutes} ${copy.readTimeSuffix}`] : []),
                      ]}
                    />
                  </div>
                </div>
              ) : (
                <span />
              )}
              {article.shareUrl && (
                <ShareActions
                  shareLabel={copy.shareLabel}
                  copyLinkLabel={copy.copyLinkLabel}
                  linkCopiedLabel={copy.linkCopiedLabel}
                />
              )}
            </div>
          </header>

          {article.hero && (
            <div className={`@container ${PAD} pt-8 md:pt-10`}>
              <Figure
                caption={article.hero.credit ? `${copy.imageCreditPrefix} ${article.hero.credit}` : null}
                captionClassName="mx-auto w-full header:@article:max-w-182"
              >
                <Media
                  image={article.hero.image}
                  sizes={HERO_SIZES}
                  priority
                  className="mx-auto h-55 w-full md:h-75 header:h-90 header:@article:max-w-182"
                />
              </Figure>
            </div>
          )}

          <div className={`@container ${PAD} pt-10 md:pt-12`}>
            {/* Reserves the share rail's height (label + three 44px buttons, 169px) so a short or empty body never lets it
              hang over the author block or the footer. */}
          <div className="relative flex flex-col items-center @article:min-h-43">
              {article.shareUrl && (
                <ShareRail
                  label={copy.shareRailLabel}
                  className="absolute top-0 left-0 hidden w-11 flex-col items-center gap-1 pt-1 @article:flex"
                />
              )}
              <article className="w-full min-w-0 @article:max-w-182">{article.body}</article>
            </div>
          </div>

          {author && (
            <div className={`@container flex flex-col items-center ${PAD} pt-12 md:pt-14`}>
              <div className="w-full @article:max-w-182">
                <AuthorModule author={author} />
              </div>
            </div>
          )}

          {article.recommended.length > 0 && (
            <div className={`mt-16 border-t border-border ${PAD} pt-10 pb-16 md:pb-20`}>
              <RecommendedArticles heading={copy.recommendedHeading} items={article.recommended} />
            </div>
          )}
        </ShareProvider>
      </div>

      <aside
        aria-label="Sidebar"
        className="border-t border-border px-gutter pt-10 pb-16 header:border-t-0 header:border-l header:p-8"
      >
        {/* The sidebar is already a complementary landmark: its banner gets no landmark of its own. */}
        <div className="flex flex-col gap-8 header:sticky header:top-rail">
          <AdSlot size="mpu" />
          {article.mostRead && <MostRead title={article.mostRead.title} items={article.mostRead.items} />}
        </div>
      </aside>
    </main>
  )
}
