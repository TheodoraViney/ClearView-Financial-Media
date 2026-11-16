import { type ReactNode } from 'react'

import { Avatar } from './Avatar'
import { Disclosure } from './Disclosure.client'
import type { MediaImage } from './Media'

/**
 * shared-shell speaker-card (`bio-display="expand"`): a 56px round portrait, or the initials on `surface-thumb`, beside
 * the name (16/20.8 500), role (13/18.2 grey) and organisation (13/18.2 dark), gap 8; then the biography toggle and,
 * once opened, the biography. `nameAs` sets the name's heading level (h3 by default, h4 under a panel heading).
 * `tag` adds a grey 24px tag under the organisation, 12px below it (event page: "Chair").
 */
export function SpeakerCard({
  name,
  nameAs: Name = 'h3',
  role,
  organisation,
  tag,
  photo,
  bio,
  showBioLabel,
  hideBioLabel,
}: {
  name: string
  nameAs?: 'h3' | 'h4'
  role?: string | null
  organisation?: string | null
  tag?: string | null
  photo?: MediaImage | null
} & (
  | {
      /** The biography, already rendered (rich text); no toggle without it. */
      bio: ReactNode
      showBioLabel: string
      hideBioLabel: string
    }
  | { bio?: never; showBioLabel?: never; hideBioLabel?: never }
)) {
  return (
    <article className="flex min-w-0 items-start gap-4">
      <Avatar name={name} image={photo} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Name className="text-base leading-title font-medium wrap-anywhere text-foreground">{name}</Name>
        {role && <p className="text-caption text-pretty text-grey">{role}</p>}
        {organisation && <p className="text-caption text-pretty text-foreground">{organisation}</p>}
        {tag && (
          <p className="mt-1 inline-flex h-6 items-center self-start rounded-sm bg-surface-thumb px-2 text-caption leading-none text-foreground">
            {tag}
          </p>
        )}
        {bio && (
          <Disclosure showLabel={showBioLabel} hideLabel={hideBioLabel}>
            {bio}
          </Disclosure>
        )}
      </div>
    </article>
  )
}
