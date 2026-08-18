import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cx } from '../util/cx'
import { GAP, vars, type Space } from '../util/tokens'

export interface GridProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  gap?: Space
  /** Minimum comfortable column width; the count follows from available space. */
  min?: string
  /** Fixes the column count. Use only when the data itself has a fixed shape. */
  columns?: number
}

/**
 * Columns are derived from the space available, not from viewport breakpoints,
 * so a Grid behaves correctly inside a narrow panel and a wide page alike.
 */
export function Grid({
  as: Tag = 'div',
  gap = 4,
  min = '16rem',
  columns,
  className,
  style,
  ...rest
}: GridProps) {
  return (
    <Tag
      className={cx(
        'grid min-w-0',
        GAP[gap],
        columns === undefined
          ? 'grid-cols-[repeat(auto-fit,minmax(min(100%,var(--cx-grid-min)),1fr))]'
          : 'grid-cols-[repeat(var(--cx-grid-columns),minmax(0,1fr))]',
        className,
      )}
      style={vars({ '--cx-grid-min': min, '--cx-grid-columns': columns }, style)}
      {...rest}
    />
  )
}
