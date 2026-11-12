import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { Flex, Stack, Text } from '@sanity/ui'
import type { StringInputProps } from 'sanity'

import { useAdUnitLookup } from '@/sanity/ad-unit-lookup'

/**
 * The ad unit code field in Brand settings → Advertising, with the unit's name from Google Ad Manager under it once
 * the code is found. A missing code, a wrong size, an inactive unit or a failed check shows as the field's validation
 * message.
 */
export function AdUnitCodeInput(props: StringInputProps) {
  const lookup = useAdUnitLookup(props.value)

  return (
    <Stack gap={2}>
      {props.renderDefault(props)}
      {lookup?.status === 'found' ? (
        <Flex gap={2} align="center" role="status" aria-live="polite">
          <Text size={1} muted>
            <CheckmarkCircleIcon />
          </Text>
          <Text size={1} muted>
            Google Ad Manager: {lookup.unit.name}
          </Text>
        </Flex>
      ) : null}
    </Stack>
  )
}
