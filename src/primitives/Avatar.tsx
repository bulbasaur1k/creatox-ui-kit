import type { ComponentPropsWithoutRef } from 'react'
import { cva, cx } from '../util/cx'

/* ── Avatar ────────────────────────────────────────────────────────────────
   A picture of a person or a thing, with initials behind it.

   The fallback needs no `onError` handler and no loading state: the initials
   are always rendered, the image is laid over them, and an image that fails
   to load leaves nothing behind — `alt=""` is what makes the failure silent
   rather than a broken-image glyph. One element more, one state hook and one
   listener fewer.                                                           */

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  src?: string
  /** Used for the initials and, when there is no adjacent label, the name. */
  name?: string
  size?: AvatarSize
  shape?: 'circle' | 'square'
  /**
   * Set when the avatar stands alone. Beside a name that is already on
   * screen, leave it off: repeating it makes a screen reader say it twice.
   */
  standalone?: boolean
}

const avatar = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center',
    'overflow-hidden border border-line bg-inset font-medium text-fg-secondary',
  ],
  {
    variants: {
      size: {
        sm: 'size-5 text-micro',
        md: 'size-7 text-meta',
        lg: 'size-9 text-ui',
        xl: 'size-12 text-reading',
      },
      shape: { circle: 'rounded-full', square: 'rounded-control' },
    },
    defaultVariants: { size: 'md', shape: 'circle' },
  },
)

/** First letters of the first two words — "Ada Lovelace" becomes AL. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

export function Avatar({
  src,
  name,
  size,
  shape,
  standalone,
  className,
  ...rest
}: AvatarProps) {
  return (
    <span
      role={standalone && name ? 'img' : undefined}
      aria-label={standalone && name ? name : undefined}
      aria-hidden={standalone ? undefined : true}
      className={cx(avatar({ size, shape }), className)}
      {...rest}
    >
      {name !== undefined && <span>{initials(name)}</span>}
      {src !== undefined && (
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  )
}
