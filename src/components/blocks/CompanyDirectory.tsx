import { CompanyDirectory as CompanyDirectorySection } from '@/components/sections/company-engagement/CompanyDirectory'
import { toCompanyDirectoryView, type CompanyEngagementContext } from '@/sanity/company-engagement-view'

import type { BlockProps } from './types'

/**
 * The Company Engagement page's company directory. Its companies and URL state come from the Company Engagement route
 * (`companies`), which answers a page past the end with a 404 before rendering.
 */
export function CompanyDirectory({
  block,
  companies,
}: BlockProps<'companyDirectory'> & { companies: CompanyEngagementContext }) {
  return <CompanyDirectorySection view={toCompanyDirectoryView(block, companies)} />
}
