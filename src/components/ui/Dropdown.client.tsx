'use client'

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

/**
 * The interactive part of `Dropdown`: the trigger button and the panel's open state. The panel's inputs are rendered
 * by the server; this only opens and closes the panel and submits the surrounding form when a choice changes.
 *
 * - The trigger is a disclosure button (`aria-expanded`, `aria-controls`). Escape closes and returns focus to it; a
 *   press outside or focus leaving the dropdown closes it.
 * - `multi`: the "All" row (`data-all`, no name) clears the group; ticking every option also falls back to All.
 *   The panel stays open while the list reloads, as in the design.
 * - `single`: a choice closes the panel and returns focus to the trigger.
 * - `syncKey` is the URL state the inputs were rendered for. When it changes (submit, Back, the Clear link), the inputs
 *   take their new server state again: they are uncontrolled, and a box the user ticked keeps its own checked state.
 */
export function DropdownDisclosure({
  panelId,
  labelledBy,
  multi,
  syncKey,
  value,
  panelClassName,
  groupLabelledBy,
  children,
}: {
  panelId: string
  /** The visible label and value ids, the trigger's accessible name ("Topics, All topics"). */
  labelledBy: string
  multi: boolean
  syncKey: string
  /** The trigger text. */
  value: ReactNode
  panelClassName: string
  /** The panel's group name: the visible label's id. */
  groupLabelledBy: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    root.current?.querySelectorAll('input').forEach((input) => {
      input.checked = input.defaultChecked
    })
  }, [syncKey])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)

    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = (focusTrigger: boolean) => {
    setOpen(false)

    if (focusTrigger) {
      trigger.current?.focus()
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      close(true)
    }
  }

  const onChange = (event: ChangeEvent<HTMLDivElement>) => {
    const target = event.target as unknown as HTMLInputElement
    const form = target.form

    if (multi) {
      const all = root.current?.querySelector<HTMLInputElement>('input[data-all]')
      const options = [...(root.current?.querySelectorAll<HTMLInputElement>('input[name]') ?? [])]

      // All, or every option ticked: back to no filter.
      if (target === all || options.every((input) => input.checked)) {
        options.forEach((input) => {
          input.checked = false
        })
      }

      if (all) {
        all.checked = options.every((input) => !input.checked)
      }
    } else {
      close(true)
    }

    form?.requestSubmit()
  }

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget) {
          setOpen(false)
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={labelledBy}
        onClick={() => setOpen((value) => !value)}
        className="group flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-sm bg-white pr-3 pl-4 text-left text-sm leading-none text-foreground inset-ring inset-ring-input transition-shadow duration-180 ease-out outline-none hover:inset-ring-accent focus-visible:inset-ring-2 focus-visible:inset-ring-focus aria-expanded:inset-ring-accent noscript:hidden header:h-9"
      >
        {value}
        <Icon
          name="dropdown-chevron"
          className="transition-transform duration-200 ease-smooth group-aria-expanded:rotate-180"
        />
      </button>
      <div
        id={panelId}
        role="group"
        aria-labelledby={groupLabelledBy}
        className={cx(
          panelClassName,
          open
            ? 'visible translate-y-0 scale-100 opacity-100 delay-0'
            : 'pointer-events-none invisible -translate-y-1 scale-98 opacity-0',
        )}
        onChange={onChange}
      >
        {children}
      </div>
    </div>
  )
}
