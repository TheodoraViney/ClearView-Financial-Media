'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'

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
 * - `submitOn` (`single` only): `change` (default) submits on every change, arrow keys included. `confirm` lets the
 *   arrow keys only move the choice; Enter or Space, a click or tap on an option, or the panel closing any other way
 *   (a press outside, focus leaving, the trigger) submits it, if it differs from the value the panel opened with.
 *   Escape cancels: the radios return to that value and nothing is submitted, as Escape in a native select.
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
  submitOn = 'change',
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
  /** `single`: when a choice is submitted, see above. */
  submitOn?: 'change' | 'confirm'
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const confirm = !multi && submitOn === 'confirm'
  // `confirm`: the radio checked when the panel opened, and whether the last input came from a pointer (a click or tap
  // on an option submits; the click a keyboard selection dispatches does not).
  const opened = useRef<HTMLInputElement | null>(null)
  const pointer = useRef(false)

  useEffect(() => {
    root.current?.querySelectorAll('input').forEach((input) => {
      input.checked = input.defaultChecked
    })
  }, [syncKey])

  const checkedRadio = () => root.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? null

  // Submits the surrounding form. A chosen empty option (`data-omit-empty`, a single dropdown's "All") stays out of the
  // URL: disabled inputs are not submitted, and the submit handler reads the form data synchronously, so they are
  // enabled again straight after.
  const submit = (form: HTMLFormElement | null | undefined) => {
    const omitted = [...(form?.querySelectorAll<HTMLInputElement>('input[data-omit-empty]:checked') ?? [])]

    omitted.forEach((input) => {
      input.disabled = true
    })
    form?.requestSubmit()
    omitted.forEach((input) => {
      input.disabled = false
    })
  }

  const show = () => {
    opened.current = checkedRadio()
    setOpen(true)
  }

  const close = (focusTrigger: boolean) => {
    setOpen(false)

    if (focusTrigger) {
      trigger.current?.focus()
    }
  }

  // `confirm`: closes the panel and submits the choice if it moved since the panel opened.
  const commit = (focusTrigger: boolean) => {
    const current = checkedRadio()

    close(focusTrigger)

    if (current && current !== opened.current) {
      opened.current = current
      submit(current.form)
    }
  }

  // Closing without Escape: `confirm` submits the pending choice, the default has nothing pending.
  const dismiss = () => (confirm ? commit(false) : setOpen(false))
  const onOutside = useEffectEvent(dismiss)

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        onOutside()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)

    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onKeyDown = (event: KeyboardEvent) => {
    pointer.current = false

    if (event.key === 'Escape' && open) {
      event.preventDefault()

      // `confirm`: back to the value the panel opened with, nothing submitted.
      if (confirm && opened.current) {
        opened.current.checked = true
      }

      close(true)

      return
    }

    // `confirm`: Enter or Space on an option submits it (and Enter no longer submits the form implicitly).
    if (confirm && open && (event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).matches('input')) {
      event.preventDefault()
      commit(true)
    }
  }

  // `confirm`: a click or tap on an option, the one already chosen included (a label forwards it to its radio).
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (confirm && pointer.current && (event.target as HTMLElement).matches('input')) {
      commit(true)
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
    } else if (confirm) {
      // An arrow key moved the choice; a click submits in `onClick`, Enter or Space in `onKeyDown`.
      return
    } else {
      close(true)
    }

    submit(form)
  }

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget) {
          dismiss()
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={labelledBy}
        onClick={() => (open ? dismiss() : show())}
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
        onClick={onClick}
        onPointerDown={() => {
          pointer.current = true
        }}
      >
        {children}
      </div>
    </div>
  )
}
