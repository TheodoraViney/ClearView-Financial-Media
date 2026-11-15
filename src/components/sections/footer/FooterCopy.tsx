import { cx } from '@/components/ui/cx'

import { CookieSettingsButton } from './CookieSettingsButton.client'

/**
 * The copyright row of the masters: description, the optional publisher line, the copyright, then the link that reopens
 * the cookie banner.
 */
export function FooterCopy({
  description,
  publisherLine,
  copyright,
  cookieSettingsLabel,
  className,
}: {
  description: string
  publisherLine?: string
  copyright: string
  cookieSettingsLabel: string
  // Gap and max width differ per footer type.
  className?: string
}) {
  return (
    <div className={cx('flex flex-col self-stretch text-sm leading-normal text-grey', className)}>
      {description && <p className="text-pretty">{description}</p>}
      {publisherLine && <p className="font-medium text-foreground">{publisherLine}</p>}
      {copyright && <p>{copyright}</p>}
      {cookieSettingsLabel && <CookieSettingsButton label={cookieSettingsLabel} />}
    </div>
  )
}
