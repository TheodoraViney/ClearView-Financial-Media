import { ConsentEmbed, type EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import { Figure } from '@/components/ui/Figure'
import type { AdUnitView } from '@/lib/gam'

import { ArchiveProse } from './ArchiveProse.client'
import { ArticleBanner } from './ArticleBody'

// The export normaliser rebuilds every kept player as `<iframe src="…" allowfullscreen=""></iframe>` (YouTube, Vimeo,
// libsyn; scripts/archive/normalize.mjs). Each becomes an empty slot that ArchiveProse fills once the reader allows
// functional cookies. The address stays HTML-escaped, as it was in the attribute.
const PLAYER = /<iframe\b[^>]*?\ssrc="([^"]+)"[^>]*>\s*<\/iframe>/gi

const holdPlayers = (html: string) => html.replace(PLAYER, (_, src: string) => `<div data-consent-embed="${src}"></div>`)

/**
 * An archived article's body in the article column: the record's Vimeo video first, as the legacy sites showed it
 * above the text, then the body HTML, then the article banner, as a post with no text after the banner. The HTML went
 * through the export allowlist; `.archive-prose` gives it the typography of a post body. Every player, the video above
 * and those in the HTML, waits for the reader to allow functional cookies.
 */
export function ArchiveBody({
  html,
  videoId,
  title,
  banner,
  embedCopy,
}: {
  html: string
  videoId: string | null
  title: string
  banner: AdUnitView | null
  /** Shown instead of a player until the reader allows it. */
  embedCopy: EmbedConsentCopy
}) {
  const video = videoId && /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null

  return (
    // A container for the article banner, which hides where the column is narrower than 728.
    <div className="article-flow @container min-w-0">
      {video && (
        <Figure>
          <ConsentEmbed src={video} title={`Video: ${title}`} copy={embedCopy} className="aspect-video w-full rounded-sm" />
        </Figure>
      )}
      {html && <ArchiveProse html={holdPlayers(html)} embedCopy={embedCopy} />}
      <ArticleBanner unit={banner} />
    </div>
  )
}
