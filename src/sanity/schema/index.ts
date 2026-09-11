import { award } from './documents/award'
import { brand } from './documents/brand'
import { event } from './documents/event'
import { page } from './documents/page'
import { post } from './documents/post'
import { blockTypes } from './blocks'

export const schemaTypes = [brand, page, post, event, award, ...blockTypes]
