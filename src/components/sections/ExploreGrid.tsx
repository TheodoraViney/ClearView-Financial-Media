import { DestinationCard, type DestinationCardItem } from '@/components/ui/DestinationCard'
import { type IconName } from '@/components/ui/Icon'
import { type HeadingLevel } from '@/lib/headings'

export type ExploreCard = {
  key: string
  heading: { as: HeadingLevel; text: string } | null
  icon: IconName | null
  items: DestinationCardItem[]
  button: { href: string; label: string } | null
}

/** Desktop columns by the number of visible cards, at most 4 (literal classes so Tailwind generates them). */
const DESKTOP_COLUMNS = ['', 'header:grid-cols-1', 'header:grid-cols-2', 'header:grid-cols-3', 'header:grid-cols-4']

/**
 * Publication home "Explore {publication}" (WB v2.0 `explore-wealthbriefing`): destination cards from 1200 in as many
 * equal columns as there are cards (up to 4), 2 from md (one card: full width), 1 below, 32 apart; no visible heading, the accessible name
 * is `label`. Lower-part padding, 24 below. No cards renders nothing.
 */
export function ExploreGrid({ label, cards }: { label: string; cards: ExploreCard[] }) {
  if (cards.length === 0) {
    return null
  }

  return (
    <section aria-label={label} className="mx-auto w-full max-w-page px-side-lower pb-6">
      <ul className={`grid gap-8 ${cards.length > 1 ? 'md:grid-cols-2' : ''} ${DESKTOP_COLUMNS[Math.min(cards.length, 4)]}`}>
        {cards.map((card) => (
          <li key={card.key} className="flex min-w-0">
            <DestinationCard heading={card.heading} icon={card.icon} items={card.items} button={card.button} />
          </li>
        ))}
      </ul>
    </section>
  )
}
