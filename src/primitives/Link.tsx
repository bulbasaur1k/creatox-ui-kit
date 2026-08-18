import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cx } from '../util/cx'

export interface LinkProps extends ComponentPropsWithoutRef<'a'> {
  /** Swap in a router link component while keeping the kit's styling. */
  as?: ElementType
  /**
   * `default` — navigation in interface chrome; a faint rule at rest that
   *   darkens on hover, so a dense list of references does not become a
   *   field of lines but is still visibly a list of links.
   * `inline`  — inside prose, where a link must be obvious without hovering.
   * `quiet`   — object names in rows: reads as text until touched.
   */
  variant?: 'default' | 'inline' | 'quiet'
  /** Marks a destination outside the application. */
  external?: boolean
}

/* The underline is not decoration here, it is the affordance. The accent is
   neutral, so colour no longer says "this is a link" — and hover does not
   exist on a phone, which leaves an unmarked link with nothing at all. */
const VARIANT = {
  default:
    'text-fg-accent underline decoration-[color-mix(in_oklch,currentColor_22%,transparent)] hover:decoration-current',
  inline:
    'text-fg-accent underline decoration-[color-mix(in_oklch,currentColor_35%,transparent)] hover:decoration-current',
  quiet: 'text-inherit hover:text-fg-accent',
} as const

export function Link({
  as: Tag = 'a',
  variant = 'default',
  external,
  className,
  children,
  ...rest
}: LinkProps) {
  return (
    <Tag
      className={cx(
        'cursor-pointer rounded-sm no-underline underline-offset-[0.18em]',
        'transition-colors duration-snap ease-snap active:text-accent-active',
        VARIANT[variant],
        className,
      )}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
      {...rest}
    >
      {children}
      {external && (
        <span aria-hidden="true" className="ml-[0.2em] text-[0.85em] text-fg-muted">
          ↗
        </span>
      )}
    </Tag>
  )
}
