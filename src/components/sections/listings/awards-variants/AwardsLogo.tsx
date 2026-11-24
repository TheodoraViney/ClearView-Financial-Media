import { cx } from '@/components/ui/cx'
import { Media, type MediaImage } from '@/components/ui/Media'

/*
 * AWARDS-LIST-VARIANTS (temporary): the edition logo box of the Awards `?view=icon` and `?view=grid` variants. The
 * edition logos are wide wordmarks on their own dark ground, so they sit contained, unpadded, on `foreground`, which
 * fills the rest of the box; an edition without one (nor a programme logo) gets a neutral box of the same size. The
 * caller sizes the box. Decorative: the title beside it names the edition.
 */
export function AwardsLogo({ logo, sizes, className }: { logo?: MediaImage | null; sizes: string; className?: string }) {
  if (!logo) {
    return <div aria-hidden className={cx('shrink-0 rounded-sm bg-light', className)} />
  }

  return (
    <div className={cx('shrink-0 overflow-hidden rounded-sm bg-foreground', className)}>
      <Media image={{ ...logo, alt: '' }} sizes={sizes} fit="contain-center" placeholder={false} className="size-full" />
    </div>
  )
}
