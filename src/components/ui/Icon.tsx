import type { SVGProps } from 'react'

import { cx } from './cx'
import { CheckIcon } from './icons/check'
import { CheckSmIcon } from './icons/check-sm'
import { ChevronDownIcon } from './icons/chevron-down'
import { ChevronRightIcon } from './icons/chevron-right'
import { CloseIcon } from './icons/close'
import { CommentIcon } from './icons/comment'
import { DocumentIcon } from './icons/document'
import { DownloadIcon } from './icons/download'
import { GlassesIcon } from './icons/glasses'
import { LinkIcon } from './icons/link'
import { MenuIcon } from './icons/menu'
import { MenuCloseIcon } from './icons/menu-close'
import { PeopleMovesIcon } from './icons/people-moves'
import { PublicIcon } from './icons/public'
import { SearchIcon } from './icons/search'
import { SelectChevronIcon } from './icons/select-chevron'
import { ShareIcon } from './icons/share'
import { StarIcon } from './icons/star'
import { StatArticleIcon } from './icons/stat-article'
import { StatGlobeIcon } from './icons/stat-globe'
import { StatPublicIcon } from './icons/stat-public'
import { StatSearchIcon } from './icons/stat-search'
import { StatStarIcon } from './icons/stat-star'
import { StatUserIcon } from './icons/stat-user'

export const iconMap = {
  'chevron-right': ChevronRightIcon,
  'chevron-down': ChevronDownIcon,
  search: SearchIcon,
  close: CloseIcon,
  menu: MenuIcon,
  'menu-close': MenuCloseIcon,
  download: DownloadIcon,
  check: CheckIcon,
  'check-sm': CheckSmIcon,
  'select-chevron': SelectChevronIcon,
  star: StarIcon,
  public: PublicIcon,
  document: DocumentIcon,
  glasses: GlassesIcon,
  comment: CommentIcon,
  'people-moves': PeopleMovesIcon,
  'stat-article': StatArticleIcon,
  'stat-globe': StatGlobeIcon,
  'stat-star': StatStarIcon,
  'stat-public': StatPublicIcon,
  'stat-search': StatSearchIcon,
  'stat-user': StatUserIcon,
  share: ShareIcon,
  link: LinkIcon,
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
