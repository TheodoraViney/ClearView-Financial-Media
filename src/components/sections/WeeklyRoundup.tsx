import Link from 'next/link'

import { Button } from '@/components/ui/Button'
import { Meta } from '@/components/ui/Meta'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { type HeadingLevel } from '@/lib/headings'

export type WeeklyRoundupItem = {
  key: string
  href: string | null
  title: string
  meta: string[]
}

export type WeeklyRoundupProps = {
  heading: { as: HeadingLevel; text: string } | null
  label: string | null
  /** The edition date, "30 Oct 2026". */
  date: string | null
  title: string | null
  summary: string | null
  button: { href: string; label: string } | null
  listLabel: string | null
  items: WeeklyRoundupItem[]
}

/**
 * Publication home "Weekly Roundup" (WB v2.0 `weekly-roundup`): the section header, then one bordered edition card.
 * Left: label (accent, 500) | edition date, title 20/24, summary and the filled button (40 high from 1200, 44 below,
 * full width on mobile). Right: "In this edition" and a numbered list of posts. 5fr / 7fr from 1200, stacked below;
 * card padding 32 (24 on mobile). Rule above, 40 / 56 padding (48 below on mobile).
 */
export function WeeklyRoundup({ heading, label, date, title, summary, button, listLabel, items }: WeeklyRoundupProps) {
  const meta = [label && <span className="font-medium">{label}</span>, date].filter(Boolean)

  return (
    <section className="flex flex-col gap-6 border-t border-border px-side pt-10 pb-12 md:pb-14">
      <SectionHeading heading={heading} />
      <article className="grid gap-8 rounded-sm border border-border p-6 md:p-8 header:grid-cols-roundup">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            {meta.length > 0 && <Meta items={meta} accentFirst={Boolean(label)} className="leading-none" />}
            {title && <h3 className="text-title-lg font-medium text-pretty text-foreground">{title}</h3>}
            {summary && <p className="text-base leading-copy text-pretty text-grey">{summary}</p>}
          </div>
          {button && (
            <Button href={button.href} size="compact" motion="out" className="px-4.5 font-medium max-md:self-stretch md:self-start">
              {button.label}
            </Button>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex min-w-0 flex-col gap-4">
            {listLabel && <span className="text-caption leading-none font-medium text-grey">{listLabel}</span>}
            <ol className="border-t border-border">
              {items.map((item, index) => (
                <li key={item.key} className="border-b border-border last:border-b-0">
                  <NumberedRow item={item} number={index + 1} />
                </li>
              ))}
            </ol>
          </div>
        )}
      </article>
    </section>
  )
}

function NumberedRow({ item, number }: { item: WeeklyRoundupItem; number: number }) {
  const content = (
    <>
      <span aria-hidden="true" className="text-caption leading-none font-medium text-grey">
        {number}
      </span>
      <span className="min-w-0 text-base leading-title font-medium text-pretty">{item.title}</span>
      {item.meta.length > 0 && <Meta items={item.meta} className="col-start-2 leading-none" />}
    </>
  )
  const classes = 'grid grid-cols-numbered items-baseline gap-2 py-4 text-foreground'

  return item.href ? (
    <Link href={item.href} className={`${classes} transition-colors duration-180 ease-out hover:text-accent`}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  )
}
