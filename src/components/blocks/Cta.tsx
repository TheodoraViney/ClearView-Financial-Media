import { Cta as CtaSection } from '@/components/sections/Cta'
import { resolveHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

/** Contact panel. Text keeps stega for click-to-edit; the button goes through resolveHref (scheme allowlist). */
export function Cta({ block, brand }: BlockProps<'cta'>) {
  const href = resolveHref(block.link, brand)
  const label = block.link?.label ?? ''

  return (
    <CtaSection
      headingId={`${block._key}-heading`}
      heading={toHeading(block.heading)}
      text={block.text?.length ? block.text : null}
      button={href && label ? { href, label } : null}
    />
  )
}
