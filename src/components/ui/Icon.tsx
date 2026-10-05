import type { SVGProps } from 'react'

import { cx } from './cx'
import { CheckIcon } from './icons/check'
import { ChevronDownIcon } from './icons/chevron-down'
import { ChevronRightIcon } from './icons/chevron-right'
import { CloseIcon } from './icons/close'
import { DocumentIcon } from './icons/document'
import { DownloadIcon } from './icons/download'
import { MenuIcon } from './icons/menu'
import { MenuCloseIcon } from './icons/menu-close'
import { PublicIcon } from './icons/public'
import { SearchIcon } from './icons/search'
import { StarIcon } from './icons/star'

export const iconMap = {
  'chevron-right': ChevronRightIcon,
  'chevron-down': ChevronDownIcon,
  search: SearchIcon,
  close: CloseIcon,
  menu: MenuIcon,
  'menu-close': MenuCloseIcon,
  download: DownloadIcon,
  check: CheckIcon,
  star: StarIcon,
  public: PublicIcon,
  document: DocumentIcon,
} as const

export type IconName = keyof typeof iconMap

export type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
}

// Decorative by default. To expose one, pass aria-hidden={false} with role="img" and aria-label.
export function Icon({ name, className, ...props }: IconProps) {
  const Component = iconMap[name]

  return <Component aria-hidden="true" {...props} className={cx('block shrink-0', className)} />
}
