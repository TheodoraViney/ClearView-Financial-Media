import { cx } from './cx'

const ICONS = {
  'chevron-right': { width: 7, height: 12, d: 'M2 10L5 7L2 4', round: true },
  'chevron-down': { width: 10, height: 9, d: 'M2 4L5 7L8 4', round: true },
  search: {
    width: 16,
    height: 16,
    d: 'M14 14L11.6667 11.6667M13.3333 7.66667C13.3333 10.7963 10.7963 13.3333 7.66667 13.3333C4.53705 13.3333 2 10.7963 2 7.66667C2 4.53705 4.53705 2 7.66667 2C10.7963 2 13.3333 4.53705 13.3333 7.66667Z',
    round: false,
  },
  close: { width: 16, height: 16, d: 'M12 4L4 12M4 4L12 12', round: true },
  menu: { width: 20, height: 20, d: 'M3 6H17M3 10H17M3 14H17', round: true },
  'menu-close': { width: 20, height: 20, d: 'M5 5L15 15M15 5L5 15', round: true },
  download: {
    width: 12,
    height: 12,
    d: 'M10.5 10.5H1.5M3 6L6 9L9 6M6 9V1.5',
    round: false,
  },
  check: { width: 12, height: 12, d: 'M10 3L4.5 8.5L2 6', round: false },
} as const

export type IconName = keyof typeof ICONS

export function Icon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  const { width, height, d, round } = ICONS[name]

  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cx('block shrink-0', className)}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={name === 'check' ? 2 : 1}
        strokeLinecap={round ? 'round' : undefined}
      />
    </svg>
  )
}
