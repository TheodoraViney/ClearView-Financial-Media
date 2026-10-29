'use client'

import { useState } from 'react'

import { ActionButton } from '@/components/ui/ActionButton.client'
import { Icon } from '@/components/ui/Icon'

// ActionButton needs a handler, which a server page cannot pass, so the review page renders it from here.
export function ActionButtonDemo() {
  const [count, setCount] = useState(0)

  return (
    <ActionButton variant="subtle" size="compact" onClick={() => setCount((value) => value + 1)}>
      <Icon name="link" />
      Clicked {count}
    </ActionButton>
  )
}
