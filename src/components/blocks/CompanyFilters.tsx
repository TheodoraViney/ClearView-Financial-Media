import { CompanyFilters as CompanyFiltersSection } from '@/components/sections/company-engagement/CompanyFilters'
import { toCompanyFiltersView, type CompanyEngagementContext } from '@/sanity/company-engagement-view'

import type { BlockProps } from './types'

/** The Company Engagement page's search and filters. The URL state comes from the Company Engagement route (`companies`). */
export function CompanyFilters({ block, companies }: BlockProps<'companyFilters'> & { companies: CompanyEngagementContext }) {
  return <CompanyFiltersSection view={toCompanyFiltersView(block, companies)} />
}
