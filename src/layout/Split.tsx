import { Children, type ComponentPropsWithoutRef } from 'react'
import { cx } from '../util/cx'

export interface SplitProps extends ComponentPropsWithoutRef<'div'> {
  /** Overrides the track sizing. Reach for this rarely. */
  columns?: string
}

/**
 * The object workspace: navigation | primary object | context.
 *
 * Two or three children are expected and the track sizing follows from the
 * count. As space runs out the context region moves below the object, then
 * navigation collapses — the reflow rules live in components.css so that no
 * feature re-implements them slightly differently.
 *
 * Mark the navigation region with `data-cx-collapsible="true"` if it may be
 * dropped on narrow viewports. Must be rendered inside <Root>.
 *
 * Track sizing lives entirely in CSS, not in utility classes. Tailwind emits
 * utilities into a later cascade layer than component styles, so a
 * `grid-cols-[…]` class here would silently beat the container queries that do
 * the reflow — the layout would lay out three full-width columns inside a
 * phone-sized container and overflow.
 */
export function Split({ columns, className, style, children, ...rest }: SplitProps) {
  const regions = Children.toArray(children).length

  return (
    <div
      className={cx('cx-split grid min-h-0 min-w-0 items-stretch', className)}
      data-regions={regions >= 3 ? '3' : '2'}
      style={columns ? { gridTemplateColumns: columns, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  )
}
