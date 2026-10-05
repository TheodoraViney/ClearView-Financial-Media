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
  // Filled 64-unit glyphs from the design's uploads (star-icon-8c544710, public-icon, document-icon), drawn at 32px.
  star: {
    width: 32,
    height: 32,
    viewBox: 64,
    d: 'M32 4C34.367 18.3701 45.6299 29.633 60 32C45.6299 34.367 34.367 45.6299 32 60C29.633 45.6299 18.3701 34.367 4 32C18.3701 29.633 29.633 18.3701 32 4Z',
    fill: true,
  },
  public: {
    width: 32,
    height: 32,
    viewBox: 64,
    d: 'M56 39H49.3701L47 60.333H17L14.6299 39H8V37H56V39Z M32 23C38.9138 23 44.5986 28.2622 45.2676 35H18.7324C19.4014 28.2622 25.0862 23 32 23Z M32 3.66699C36.4182 3.66704 40 7.24874 40 11.667C39.9998 16.0851 36.4181 19.6669 32 19.667C27.5818 19.667 24.0002 16.0851 24 11.667C24 7.24871 27.5817 3.66699 32 3.66699Z',
    fill: true,
  },
  document: {
    width: 32,
    height: 32,
    viewBox: 64,
    d: 'M34 25H51V56H13L13 8H34V25Z M50 23H36V9L50 23Z',
    fill: true,
  },
} as const satisfies Record<
  string,
  { width: number; height: number; d: string; round?: boolean; fill?: boolean; viewBox?: number }
>

export type IconName = keyof typeof ICONS

export function Icon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  const icon: { width: number; height: number; d: string; round?: boolean; fill?: boolean; viewBox?: number } =
    ICONS[name]
  const { width, height, d, round, fill, viewBox } = icon

  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={viewBox ? `0 0 ${viewBox} ${viewBox}` : `0 0 ${width} ${height}`}
      fill="none"
      className={cx('block shrink-0', className)}
    >
      {fill ? (
        <path d={d} fill="currentColor" />
      ) : (
        <path
          d={d}
          stroke="currentColor"
          strokeWidth={name === 'check' ? 2 : 1}
          strokeLinecap={round ? 'round' : undefined}
        />
      )}
    </svg>
  )
}
