import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cx } from '../util/cx'
import { GAP, PAD_Y, type Space } from '../util/tokens'

export interface StackProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  gap?: Space
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Separates children with a rule instead of whitespace. */
  divided?: boolean
}

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const

/** Vertical flow. The default composition tool for an object view. */
export function Stack({
  as: Tag = 'div',
  gap = 3,
  align,
  divided,
  className,
  ...rest
}: StackProps) {
  return (
    <Tag
      className={cx(
        'flex min-w-0 flex-col',
        divided ? cx('gap-0 divide-y divide-line', PAD_Y[gap]) : GAP[gap],
        align && ALIGN[align],
        className,
      )}
      {...rest}
    />
  )
}
