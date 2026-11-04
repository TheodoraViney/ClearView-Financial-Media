import { useMemo } from 'react'
import { type ArrayOfObjectsInputProps, type ArraySchemaType, useFormValue } from 'sanity'

import { blockAllowedOnBrand } from '@/sanity/schema/blocks/shared'

/**
 * The page's Blocks input: the default array input, with the blocks the page brand cannot use left out of the
 * "Add item" menu and the insert before/after menus. A block already on the page still renders, and its own
 * validation reports it, so a pasted or duplicated one is caught too.
 */
export function PageBlocksInput(props: ArrayOfObjectsInputProps) {
  const brand = useFormValue(['brand'])
  const { schemaType, members, renderDefault } = props

  const filtered = useMemo(() => {
    const of = schemaType.of.filter((type) => blockAllowedOnBrand(type.name, brand))

    if (of.length === schemaType.of.length) {
      return null
    }

    const type: ArraySchemaType = { ...schemaType, of }

    return {
      schemaType: type,
      members: members.map((member) => (member.kind === 'item' ? { ...member, parentSchemaType: type } : member)),
    }
  }, [schemaType, members, brand])

  return renderDefault(filtered ? { ...props, ...filtered } : props)
}
