import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '../util/cx'
import { GAP, vars, type Space } from '../util/tokens'

export interface SidebarProps extends ComponentPropsWithoutRef<'div'> {
  gap?: Space
  /** Ideal sidebar width. It shrinks before wrapping, never below its content. */
  width?: string
  /** Below this share of the row the two regions wrap onto separate lines. */
  contentMin?: string
  side?: 'start' | 'end'
}

/**
 * Two regions that wrap on their own, driven purely by the space available —
 * no breakpoint, no container query, no resize observer. Exactly two children.
 *
 * The trick is the huge grow factor on the content region: it takes every
 * spare pixel until its `min-inline-size` can no longer be met, at which point
 * flex wrapping puts the two regions on separate rows.
 */
export function Sidebar({
  gap = 6,
  width = '15rem',
  contentMin = '50%',
  side,
  className,
  style,
  ...rest
}: SidebarProps) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-start',
        side === 'end' ? 'flex-row-reverse' : 'flex-row',
        GAP[gap],
        '[&>:first-child]:grow [&>:first-child]:basis-[var(--cx-sidebar-width)]',
        '[&>:last-child]:min-w-0 [&>:last-child]:grow-[999] [&>:last-child]:basis-0',
        '[&>:last-child]:[min-inline-size:var(--cx-sidebar-content-min)]',
        className,
      )}
      style={vars(
        { '--cx-sidebar-width': width, '--cx-sidebar-content-min': contentMin },
        style,
      )}
      {...rest}
    />
  )
}
