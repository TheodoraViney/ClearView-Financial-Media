import { Figure } from '@/components/ui/Figure'

/**
 * An archived article's body in the article column: the record's Vimeo video first, as the legacy sites showed it
 * above the text, then the body HTML. The HTML went through the export allowlist; `.archive-prose` gives it the
 * typography of a post body.
 */
export function ArchiveBody({ html, videoId, title }: { html: string; videoId: string | null; title: string }) {
  const video = videoId && /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null

  if (!html && !video) {
    return null
  }

  return (
    <div className="article-flow min-w-0">
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
    </div>
  )
}
