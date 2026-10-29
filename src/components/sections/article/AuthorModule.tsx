import { Avatar } from '@/components/ui/Avatar'
import type { ArticleAuthorView } from '@/lib/article'

// "About the author" under the text. No profile link: there is no author page yet. Archive authors may have a name
// only; the name then centres on the 40px avatar.
export function AuthorModule({ author }: { author: ArticleAuthorView }) {
  const nameOnly = !author.jobTitle && !author.bio

  return (
    <section
      aria-label="About the author"
      className={`flex w-full gap-6 border-t border-border pt-8 ${nameOnly ? 'items-center' : 'items-start'}`}
    >
      <Avatar name={author.name} image={author.photo} text="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-base leading-heading font-medium">{author.name}</span>
          {author.jobTitle && <span className="text-caption leading-none text-grey">{author.jobTitle}</span>}
        </div>
        {author.bio && <p className="text-base leading-copy whitespace-pre-line text-pretty text-grey">{author.bio}</p>}
      </div>
    </section>
  )
}
