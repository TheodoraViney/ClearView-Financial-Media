import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import { type HeadingLevel } from '@/lib/headings'
import { type StatsBarIcon } from '@/lib/stats-bar'

export type StatsBarItem = {
  key: string
  /** Key of a `ui/icons/stat-*` icon, or null when the stored key is unknown. */
  icon: StatsBarIcon | null
  value: string
  label: string
}

export type StatsBarProps = {
  heading: { as: HeadingLevel; text: string } | null
  items: StatsBarItem[]
}

/**
 * Home "At a Glance": a full-bleed dark band with a heading and up to six editorial figures.
 * One column on mobile, two on tablet, auto-fit 380px tracks on desktop.
 * Tiles grow with their text instead of the design's fixed 96px height and label width, which clip longer copy.
 * Tiles are not links; the desktop hover is kept as designed (background and ring, so `transition` rather than `transition-colors`).
 */
export function StatsBar({ heading, items }: StatsBarProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="bg-dark-blue-grey py-section-lg">
      <Container className="flex flex-col gap-7 md:gap-10 lg:gap-12">
        {heading && (
          <Heading as={heading.as} className="text-heading-md font-medium text-white">
            {heading.text}
          </Heading>
        )}

        <ul className="grid gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-stats lg:gap-8">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex min-h-20 rounded-sm text-white inset-ring inset-ring-white/20 transition duration-180 ease-smooth md:min-h-24 lg:hover:bg-white/5 lg:hover:inset-ring-white/40"
            >
              {/* An unknown icon key keeps the empty cell so the tiles stay aligned. */}
              <div className="flex w-20 shrink-0 items-center justify-center border-r border-white/20 md:w-24">
                {item.icon && <Icon name={item.icon} className="size-10 md:size-12" />}
              </div>
              {/* The label always sits beside the number. Tablet tightens padding and gap so "250k+ Subscribers" fits one row at 768. */}
              <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 md:gap-2 md:px-3 lg:gap-4 lg:px-6 lg:py-0">
                <span className="text-display whitespace-nowrap">{item.value}</span>
                {/* Wraps by words; break-words only splits a single word too long for the tile. */}
                <span className="min-w-0 flex-1 text-title-md font-medium text-pretty break-words">{item.label}</span>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
