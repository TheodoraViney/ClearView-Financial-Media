export type HeaderLogo = { src: string; width: number; height: number; alt: string }

export type HeaderLink = { key: string; label: string; href: string }

export type HeaderItem =
  | ({ kind: 'link' } & HeaderLink)
  | { kind: 'group'; key: string; label: string; links: HeaderLink[] }

export type HeaderProps = {
  logo: HeaderLogo | null
  homeHref: string
  items: HeaderItem[]
  searchPlaceholder: string
  searchLabels: SearchLabels
}

/** Visible copy of the search suggestions popup: one heading per section, and the empty state. */
export type SearchLabels = {
  posts: string
  events: string
  awards: string
  resources: string
  empty: string
}
