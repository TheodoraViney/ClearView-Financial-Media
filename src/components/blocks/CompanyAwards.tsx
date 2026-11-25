import { CompanyAwards as CompanyAwardsSection } from '@/components/sections/company-engagement/CompanyAwards'
import { toCompanyAwardsView, type CompanyEngagementContext } from '@/sanity/company-engagement-view'

import type { BlockProps } from './types'

/** The Company Engagement page's winners and awards sponsors, from the route's records (`companies`); hidden while empty. */
export function CompanyAwards({ block, companies }: BlockProps<'companyAwards'> & { companies: CompanyEngagementContext }) {
  const view = toCompanyAwardsView(block, companies)

  return view ? <CompanyAwardsSection view={view} /> : null
}
