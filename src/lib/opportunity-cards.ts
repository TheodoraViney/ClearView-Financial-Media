import type { IconName } from '@/components/ui/Icon'

/** Opportunity card icons. The key is also the `ui/icons` name the section renders; `satisfies` keeps the two lists in step. */
export const OPPORTUNITY_CARD_ICONS = [
  { value: 'star', title: 'Star (awards)' },
  { value: 'public', title: 'Globe (events)' },
  { value: 'document', title: 'Document (research)' },
  { value: 'glasses', title: 'Glasses (advertising and editorial)' },
] as const satisfies readonly { value: IconName; title: string }[]

export type OpportunityCardIcon = (typeof OPPORTUNITY_CARD_ICONS)[number]['value']

export const isOpportunityCardIcon = (value: unknown): value is OpportunityCardIcon =>
  OPPORTUNITY_CARD_ICONS.some((icon) => icon.value === value)
