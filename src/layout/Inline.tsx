import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cx } from '../util/cx'
import { GAP, type Space } from '../util/tokens'

export interface InlineProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  gap?: Space
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
}

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
} as const

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

/**
 * A single row that does not wrap. Wrap the child that should absorb the
 * remaining space in <Grow> so its siblings keep their intrinsic size.
 */
export function Inline({
  as: Tag = 'div',
  gap = 2,
  align = 'center',
  justify,
  className,
  ...rest
}: InlineProps) {
  return (
    <Tag
      className={cx(
        'flex min-w-0 flex-row',
        GAP[gap],
        ALIGN[align],
        justify && JUSTIFY[justify],
        className,
      )}
      {...rest}
    />
  )
}

export interface GrowProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
}

/** Absorbs the leftover space in an Inline and allows its content to truncate. */
export function Grow({ as: Tag = 'div', className, ...rest }: GrowProps) {
  return <Tag className={cx('min-w-0 flex-1', className)} {...rest} />
}
