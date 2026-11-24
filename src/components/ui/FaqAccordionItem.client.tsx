'use client'

import { useId, useState, type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

// The question row and the answer row share one grid: below md the text beside a 24px chevron column (gap 16); from md
// 12 columns (gap 24, 32 from the header breakpoint) with the text in 1–8 and the chevron at the end of 9–12.
const ROW = 'grid grid-cols-faq gap-x-4 md:grid-cols-12 md:gap-x-6 header:gap-x-8'
const TEXT = 'min-w-0 md:col-span-8'

/**
 * shared-shell faq-accordion-item: an h3 holding a full-width button with the question (16/20.8 500, the accent while
 * open or hovered, 180ms ease-out) and a 12px chevron that turns over; the answer (16/22.4 grey) below it, 24 above
 * the item's bottom rule (none on the last item). Opening grows the panel (grid rows 0fr → 1fr), turns the chevron
 * and trims the button's bottom padding from 24 to 16, all 240ms ease-smooth; a closed panel leaves the tab order once
 * it has collapsed. Closed on the server; each item opens on its own.
 */
export function FaqAccordionItem({ question, answer, last = false }: { question: ReactNode; answer: ReactNode; last?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const buttonId = `${id}-trigger`
  const panelId = `${id}-panel`

  return (
    <div className={cx('min-w-0', !last && 'border-b border-border')}>
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cx(
            ROW,
            'w-full cursor-pointer items-start pt-6 text-left transition-faq hover:text-accent',
            open ? 'pb-4 text-accent' : 'pb-6 text-foreground',
          )}
        >
          <span className={cx(TEXT, 'text-base leading-title font-medium text-pretty wrap-anywhere')}>{question}</span>
          <span aria-hidden="true" className="flex h-lh items-center justify-self-end text-base leading-title md:col-span-4 md:col-start-9">
            <Icon
              name="dropdown-chevron"
              className={cx('transition-transform duration-240 ease-smooth', open && 'rotate-180')}
            />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cx(
          'grid transition-rows duration-240 ease-smooth',
          open ? 'visible grid-rows-expand' : 'invisible grid-rows-collapse',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={cx(ROW, 'pb-6')}>
            <div className={cx(TEXT, 'text-base leading-copy text-pretty text-grey')}>{answer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
