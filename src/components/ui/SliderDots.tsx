import { cx } from './cx'

// Hero slide switcher. Mobile and tablet buttons keep a 44px touch target around the 8px dot.
export function SliderDots({
  labels,
  selected,
  onSelect,
  label,
  className,
}: {
  labels: string[]
  selected: number
  onSelect?: (index: number) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx(
        'relative flex h-6 items-center rounded-full bg-white/20 px-1 backdrop-blur-xl lg:gap-2 lg:px-3',
        className,
      )}
    >
      {labels.map((itemLabel, index) => {
        const active = index === selected

        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={itemLabel}
            onClick={onSelect ? () => onSelect(index) : undefined}
            className="-my-2.5 flex h-11 w-7 cursor-pointer items-center justify-center lg:my-0 lg:size-2"
          >
            <span
              aria-hidden="true"
              className={cx(
                'block size-2 rounded-full transition-colors duration-200 ease-in-out',
                active ? 'bg-white' : 'bg-white/40',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
