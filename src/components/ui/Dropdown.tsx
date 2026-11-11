import Link from 'next/link'

import { cx } from './cx'
import { DropdownDisclosure } from './Dropdown.client'
import { Icon } from './Icon'

export type DropdownOption = { value: string; label: string; selected: boolean }

// Option rows: 44px on touch layouts, 36px from the header breakpoint (select-dropdown `touch` / `default`).
const ROW = 'flex min-h-11 cursor-pointer items-center text-sm leading-none whitespace-nowrap header:min-h-9 noscript:whitespace-normal noscript:leading-snug'

// The input is visually hidden; the row draws its keyboard outline.
const ROW_FOCUS = 'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus'

// Panel: 8px under the trigger, at least its width, at most 360px, 24px padding (select-dropdown). Without
// JavaScript there is no trigger: the panel sits open in the flow under the label instead.
const PANEL = cx(
  'absolute top-full left-0 z-30 mt-2 flex w-max max-w-90 min-w-full flex-col rounded-sm border border-border bg-white p-6 shadow-dropdown origin-top-left transition-dropdown',
  'noscript:pointer-events-auto noscript:visible noscript:static noscript:w-full noscript:max-w-none noscript:translate-y-0 noscript:scale-100 noscript:opacity-100 noscript:shadow-none',
)

/**
 * A labelled dropdown of real form inputs (shared-shell select-dropdown), for a GET form the caller owns.
 *
 * `multi`: checkboxes named `name`; an "All" row first (ticked while nothing is), a divider, the options and a footer
 * link (`clear`) that clears the group. The trigger reads the All label, the one option's label, or "N selected".
 * `single`: radios named `name`, the chosen one in the accent with a tick; the trigger reads its label.
 * A change submits the form (`DropdownDisclosure`). Without JavaScript the panel shows open and the form's own submit
 * button applies the choice.
 */
export function Dropdown({
  id,
  label,
  name,
  options,
  multiple = false,
  allLabel,
  selectedLabel,
  clear,
  syncKey,
  hideLabel = false,
  className,
}: {
  /** Unique on the page: prefixes the label, value and panel ids. */
  id: string
  label: string
  name: string
  options: DropdownOption[]
  multiple?: boolean
  /** `multiple`: the All row and the trigger text while nothing is chosen. */
  allLabel?: string
  /** `multiple`: the word after the count, "3 selected". */
  selectedLabel?: string
  /** `multiple`: the footer link that clears the group. */
  clear?: { label: string; href: string }
  /** The URL state the inputs reflect, see `DropdownDisclosure`. */
  syncKey: string
  /** Keeps the label for screen readers only, for a trigger that sits in line with other controls (search Year). */
  hideLabel?: boolean
  className?: string
}) {
  const selected = options.filter((option) => option.selected)
  const value = multiple
    ? selected.length === 0
      ? (allLabel ?? '')
      : selected.length === 1
        ? selected[0].label
        : `${selected.length} ${selectedLabel ?? ''}`.trim()
    : (selected[0] ?? options[0])?.label

  return (
    <div className={cx('flex min-w-0 flex-col gap-2', className)}>
      <span
        id={`${id}-label`}
        className={hideLabel ? 'sr-only' : 'text-caption leading-none font-medium text-foreground'}
      >
        {label}
      </span>
      <DropdownDisclosure
        panelId={`${id}-panel`}
        labelledBy={`${id}-label ${id}-value`}
        multi={multiple}
        syncKey={syncKey}
        value={
          <span id={`${id}-value`} className="min-w-0 truncate">
            {value}
          </span>
        }
        panelClassName={PANEL}
        groupLabelledBy={`${id}-label`}
      >
        {multiple ? (
          <>
            <div className="-mx-2 flex max-h-80 flex-col gap-1 overflow-y-auto px-2 py-1">
              {allLabel && (
                <>
                  <MultiRow label={allLabel} checked={selected.length === 0} all />
                  <span aria-hidden="true" className="my-2 block h-px shrink-0 bg-border" />
                </>
              )}
              {options.map((option) => (
                <MultiRow key={option.value} label={option.label} name={name} value={option.value} checked={option.selected} />
              ))}
            </div>
            {clear && (
              <div className="mt-4 flex items-center border-t border-border pt-4">
                <Link
                  href={clear.href}
                  prefetch={false}
                  scroll={false}
                  className="-my-2.75 inline-flex min-h-9 items-center text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60"
                >
                  {clear.label}
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            {options.map((option) => (
              <label
                key={option.value}
                className={cx(
                  ROW,
                  ROW_FOCUS,
                  'group justify-between gap-4 text-foreground transition-colors duration-180 ease-out hover:text-accent has-checked:text-accent',
                )}
              >
                <input type="radio" name={name} value={option.value} defaultChecked={option.selected} className="sr-only" />
                {option.label}
                <Icon name="tick" className="opacity-0 group-has-checked:opacity-100" />
              </label>
            ))}
          </div>
        )}
      </DropdownDisclosure>
    </div>
  )
}

// A checkbox row: 16px box with a 2px radius and the field ring, accent fill and a 10px white tick when ticked
// (select-dropdown's own box, not `Checkbox`). The All row has no name, so it is never submitted.
function MultiRow({
  label,
  name,
  value,
  checked,
  all = false,
}: {
  label: string
  name?: string
  value?: string
  checked: boolean
  all?: boolean
}) {
  return (
    <label className={cx(ROW, ROW_FOCUS, 'group gap-3 text-foreground')}>
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        data-all={all || undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center rounded-xs bg-white inset-ring inset-ring-input transition duration-180 ease-out peer-checked:bg-accent peer-checked:inset-ring-accent"
      >
        <Icon name="tick" strokeWidth={1.5} className="size-2.5 text-white opacity-0 group-has-checked:opacity-100" />
      </span>
      {label}
    </label>
  )
}
