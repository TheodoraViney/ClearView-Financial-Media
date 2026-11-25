import type { IconName } from '@/components/ui/Icon'

/** Coverage list item icons. The key is also the `ui/icons` name the section renders; `satisfies` keeps the two lists in step. */
export const COVERAGE_LIST_ICONS = [
  { value: 'pie-chart', title: 'Pie chart (strategy)' },
  { value: 'cpu-chip', title: 'Chip (technology)' },
  { value: 'user', title: 'Person (people)' },
  { value: 'bar-chart', title: 'Bar chart (investment)' },
] as const satisfies readonly { value: IconName; title: string }[]

export type CoverageListIcon = (typeof COVERAGE_LIST_ICONS)[number]['value']

export const isCoverageListIcon = (value: unknown): value is CoverageListIcon =>
  COVERAGE_LIST_ICONS.some((icon) => icon.value === value)
