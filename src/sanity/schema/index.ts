import { blockTypes } from './blocks'
import { acclaim } from './documents/acclaim'
import { adUnit } from './documents/ad-unit'
import { articlePage } from './documents/article-page'
import { category, region, topic } from './documents/article-taxonomy'
import { author } from './documents/author'
import { awardCategory } from './documents/award-category'
import { awardsProgramme } from './documents/awards-programme'
import { awardsProgrammeGroup } from './documents/awards-programme-group'
import { brand } from './documents/brand'
import { briefSettings } from './documents/brief-settings'
import { company } from './documents/company'
import { conferenceEvent } from './documents/conference-event'
import { clearviewFooter, publicationFooter } from './documents/footer'
import { clearviewHeader, publicationHeader } from './documents/header'
import { infographicSettings } from './documents/infographic-settings'
import { mostRead } from './documents/most-read'
import { newsletterIssue } from './documents/newsletter-issue'
import { page } from './documents/page'
import { person } from './documents/person'
import { post } from './documents/post'
import { resource } from './documents/resource'
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
  infographicSettings,
  briefSettings,
  subscribeModal,
  subscribeFormSettings,
  newsletterIssue,
  awardsProgrammeGroup,
  awardsProgramme,
  conferenceEvent,
  awardCategory,
  company,
  person,
  acclaim,
  resource,
  adUnit,
]

export const schemaTypes = [...documentTypes, ...objectTypes, ...blockTypes]
