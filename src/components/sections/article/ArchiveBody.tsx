import { Figure } from '@/components/ui/Figure'
import type { AdUnitView } from '@/lib/gam'

import { ArticleBanner } from './ArticleBody'

/**
 * An archived article's body in the article column: the record's Vimeo video first, as the legacy sites showed it
 * above the text, then the body HTML, then the article banner, as a post with no text after the banner. The HTML went
 * through the export allowlist; `.archive-prose` gives it the typography of a post body.
 */
export function ArchiveBody({
  html,
  videoId,
  title,
  banner,
}: {
  html: string
  videoId: string | null
  title: string
  banner: AdUnitView | null
}) {
  const video = videoId && /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null

  return (
    // A container for the article banner, which hides where the column is narrower than 728.
    <div className="article-flow @container min-w-0">
      {video && (
        <Figure>
          <iframe
            src={video}
            title={`Video: ${title}`}
            loading="lazy"
            allow="fullscreen; picture-in-picture"
            className="aspect-video w-full rounded-sm border-0"
          />
        </Figure>
      )}
      {html && <div className="archive-prose" dangerouslySetInnerHTML={{ __html: html }} />}
      <ArticleBanner unit={banner} />
    </div>
  )
}
