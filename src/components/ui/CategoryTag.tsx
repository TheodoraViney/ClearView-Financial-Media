/**
 * shared-shell category-tag-large: a 40px bordered label, 16/20, radius 4 (awards programme Categories). Not a link
 * here, so the design's hover tint (surface-subtle + border-plus ring) is left out: on a non-interactive element it
 * would suggest an action that is not there.
 */
export function CategoryTag({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-10 max-w-full items-center rounded-sm bg-white px-4 py-2.5 text-base leading-5 text-foreground inset-ring inset-ring-border wrap-anywhere">
      {label}
    </span>
  )
}
