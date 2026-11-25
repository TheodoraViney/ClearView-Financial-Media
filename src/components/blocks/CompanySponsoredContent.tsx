import {
  CompanySponsoredContent as CompanySponsoredContentSection,
} from '@/components/sections/company-engagement/CompanySponsoredContent'
import { toCompanySponsoredContentView, type CompanyEngagementContext } from '@/sanity/company-engagement-view'

import type { BlockProps } from './types'

/** The Company Engagement page's sponsored and contributed posts, from the route's records (`companies`). */
export function CompanySponsoredContent({
  block,
  companies,
}: BlockProps<'companySponsoredContent'> & { companies: CompanyEngagementContext }) {
  const view = toCompanySponsoredContentView(block, companies)

  return view ? <CompanySponsoredContentSection view={view} /> : null
}
