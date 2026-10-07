import type { SVGProps } from 'react'

import { cx } from './cx'
import { CheckIcon } from './icons/check'
import { ChevronDownIcon } from './icons/chevron-down'
import { ChevronRightIcon } from './icons/chevron-right'
import { CloseIcon } from './icons/close'
import { DocumentIcon } from './icons/document'
import { DownloadIcon } from './icons/download'
import { LinkedinIcon } from './icons/linkedin'
import { MenuIcon } from './icons/menu'
import { MenuCloseIcon } from './icons/menu-close'
import { PublicIcon } from './icons/public'
import { SearchIcon } from './icons/search'
import { StarIcon } from './icons/star'
import { StatArticleIcon } from './icons/stat-article'
import { StatGlobeIcon } from './icons/stat-globe'
import { StatPublicIcon } from './icons/stat-public'
import { StatSearchIcon } from './icons/stat-search'
import { StatStarIcon } from './icons/stat-star'
import { StatUserIcon } from './icons/stat-user'
import { XIcon } from './icons/x'
import { YoutubeIcon } from './icons/youtube'

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
  'stat-article': StatArticleIcon,
  'stat-globe': StatGlobeIcon,
  'stat-star': StatStarIcon,
  'stat-public': StatPublicIcon,
  'stat-search': StatSearchIcon,
  'stat-user': StatUserIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  x: XIcon,
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
