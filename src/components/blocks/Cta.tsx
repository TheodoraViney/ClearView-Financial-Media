import { Cta as CtaSection } from '@/components/sections/Cta'
import { safeHref } from '@/lib/links'

import type { BlockProps } from './types'

export function Cta({ block }: BlockProps<'cta'>) {
  const { heading, text, link } = block

  return (
    <CtaSection
      heading={heading ?? undefined}
      text={text ?? undefined}
      href={safeHref(link?.href) ?? undefined}
      label={link?.label ?? undefined}
    />
  )
}
