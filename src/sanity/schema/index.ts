import { blockTypes } from './blocks'
import { acclaim } from './documents/acclaim'
import { articlePage } from './documents/article-page'
import { category, region, topic } from './documents/article-taxonomy'
import { author } from './documents/author'
import { awardCategory } from './documents/award-category'
import { awardCategoryPage } from './documents/award-category-page'
import { awardsProgramme } from './documents/awards-programme'
import { awardsProgrammePage } from './documents/awards-programme-page'
import { awardsProgrammeGroup } from './documents/awards-programme-group'
import { brand } from './documents/brand'
import { briefSettings } from './documents/brief-settings'
import { company } from './documents/company'
import { conferenceEvent } from './documents/conference-event'
import { eventPage } from './documents/event-page'
import { clearviewFooter, publicationFooter } from './documents/footer'
import { clearviewHeader, publicationHeader } from './documents/header'
import { infographicSettings } from './documents/infographic-settings'
import { mostRead } from './documents/most-read'
import { newsletterIssue } from './documents/newsletter-issue'
import { page } from './documents/page'
import { person } from './documents/person'
import { post } from './documents/post'
import { researchGenerationSettings } from './documents/research-generation-settings'
import { partnerProfilePage } from './documents/partner-profile-page'
import { researchReportPage } from './documents/research-report-page'
import { researchSummary } from './documents/research-summary'
import { resource } from './documents/resource'
import { searchPage } from './documents/search-page'
import { signupNotificationSettings } from './documents/signup-notification-settings'
import { notFoundPage } from './documents/not-found-page'
import { subscribeFormSettings } from './documents/subscribe-form-settings'
import { subscribeModal } from './documents/subscribe-modal'
import { objectTypes } from './objects'

export const documentTypes = [
  brand,
  clearviewHeader,
  publicationHeader,
  clearviewFooter,
  publicationFooter,
  page,
  post,
  category,
  topic,
  region,
  author,
  mostRead,
  articlePage,
  searchPage,
  awardCategoryPage,
  awardsProgrammePage,
  eventPage,
  researchReportPage,
  partnerProfilePage,
  infographicSettings,
  briefSettings,
  researchGenerationSettings,
  subscribeModal,
  subscribeFormSettings,
  notFoundPage,
  signupNotificationSettings,
  newsletterIssue,
  awardsProgrammeGroup,
  awardsProgramme,
  conferenceEvent,
  awardCategory,
  company,
  person,
  acclaim,
  resource,
  researchSummary,
]

export const schemaTypes = [...documentTypes, ...objectTypes, ...blockTypes]
