import { cx } from './cx'

// A quote between two rules, with who said it underneath. The quotation marks are added here.
export function PullQuote({ quote, cite, className }: { quote: string; cite?: string | null; className?: string }) {
  return (
    <blockquote className={cx('m-0 flex flex-col gap-4 border-y border-border py-8', className)}>
      <p className="text-quote font-medium text-pretty">{`“${quote}”`}</p>
      {cite && <cite className="text-caption leading-none text-grey not-italic">{cite}</cite>}
    </blockquote>
  )
}
