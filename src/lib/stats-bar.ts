import type { IconName } from '@/components/ui/Icon'

/** The six Stats bar tile icons. The key is also the `ui/icons` name the section renders; `satisfies` keeps the two lists in step. */
export const STATS_BAR_ICONS = [
  { value: 'stat-article', title: 'Article' },
  { value: 'stat-globe', title: 'Globe' },
  { value: 'stat-star', title: 'Star' },
  { value: 'stat-public', title: 'Event' },
  { value: 'stat-search', title: 'Research' },
  { value: 'stat-user', title: 'People' },
] as const satisfies readonly { value: IconName; title: string }[]

export type StatsBarIcon = (typeof STATS_BAR_ICONS)[number]['value']

export const isStatsBarIcon = (value: unknown): value is StatsBarIcon =>
  STATS_BAR_ICONS.some((icon) => icon.value === value)
