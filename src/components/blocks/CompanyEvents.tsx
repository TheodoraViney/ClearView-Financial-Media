import { CompanyEvents as CompanyEventsSection } from '@/components/sections/company-engagement/CompanyEvents'
import { toCompanyEventsView, type CompanyEngagementContext } from '@/sanity/company-engagement-view'

import type { BlockProps } from './types'

/** The Company Engagement page's forum and summit partners, from the route's records (`companies`); hidden by the filters. */
export function CompanyEvents({ block, companies }: BlockProps<'companyEvents'> & { companies: CompanyEngagementContext }) {
  const view = toCompanyEventsView(block, companies)

  return view ? <CompanyEventsSection view={view} /> : null
}
