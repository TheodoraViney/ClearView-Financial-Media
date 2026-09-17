import { blockTypes } from './blocks'
import { acclaim } from './documents/acclaim'
import { awardCategory } from './documents/award-category'
import { awardsProgramme } from './documents/awards-programme'
import { awardsProgrammeGroup } from './documents/awards-programme-group'
import { brand } from './documents/brand'
import { company } from './documents/company'
import { conferenceEvent } from './documents/conference-event'
import { page } from './documents/page'
import { person } from './documents/person'
import { post } from './documents/post'
import { resource } from './documents/resource'
import { objectTypes } from './objects'

export const documentTypes = [
  brand,
  page,
  post,
  awardsProgrammeGroup,
  awardsProgramme,
  conferenceEvent,
  awardCategory,
  company,
  person,
  acclaim,
  resource,
]

export const schemaTypes = [...documentTypes, ...objectTypes, ...blockTypes]
