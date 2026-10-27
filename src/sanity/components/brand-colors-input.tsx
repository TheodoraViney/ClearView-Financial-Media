import { Box, Card, Flex, Stack, Text } from '@sanity/ui'
import { useFormValue } from 'sanity'

import { BRANDS, type BrandColors, isBrandKey } from '@/brands'

/**
 * Read-only "Brand colours" display on the Brand document (src/sanity/schema/documents/brand.ts).
 *
 * The colours are set in code, BRANDS[key].colors in src/brands.ts, which the site and the newsletter email both read.
 * This input only shows them: it never calls onChange, so the field it sits on stays empty in the document.
 * The brand comes from the document's `key` slug.
 */

const LABELS: Record<keyof BrandColors, string> = {
  accent: 'Accent',
  accentHover: 'Accent hover',
  accentSubtle: 'Accent subtle',
  focus: 'Focus',
  surfaceHover: 'Surface hover',
}

export function BrandColorsInput() {
  const key = useFormValue(['key', 'current'])

  if (typeof key !== 'string' || !isBrandKey(key)) {
    return (
      <Card padding={3} radius={2} tone="caution" border>
        <Text size={1}>Set the key to see this brand&apos;s colours.</Text>
      </Card>
    )
  }

  const colors = BRANDS[key].colors

  return (
    <Stack gap={2}>
      {(Object.keys(LABELS) as (keyof BrandColors)[]).map((name) => (
        <Flex key={name} align="center" gap={3}>
          <Card
            radius={2}
            border
            style={{ width: 32, height: 32, flex: 'none', background: colors[name] }}
          />
          <Box flex={1}>
            <Text size={1} weight="medium">
              {LABELS[name]}
            </Text>
          </Box>
          <Text size={1} muted>
            {colors[name]}
          </Text>
        </Flex>
      ))}
    </Stack>
  )
}
