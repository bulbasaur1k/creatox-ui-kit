import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'

export interface ScrollAreaProps extends ComponentPropsWithoutRef<'div'> {
  axis?: 'both' | 'vertical' | 'horizontal'
  maxHeight?: string
  /**
   * Fades the scrollable edges so it is visible that content continues.
   * Implemented with `background-attachment: local` — no scroll listener.
   */
  fade?: boolean
}

const AXIS = {
  both: 'overflow-auto',
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
} as const

export function ScrollArea({
  axis = 'vertical',
  maxHeight,
  fade,
  className,
  style,
  ...rest
}: ScrollAreaProps) {
  return (
    <div
      className={cx(
        'min-h-0 min-w-0 overscroll-contain [scrollbar-width:thin]',
        AXIS[axis],
        maxHeight && 'max-h-[var(--cx-scroll-max)]',
        fade && 'scroll-fade',
        className,
      )}
      style={vars({ '--cx-scroll-max': maxHeight }, style)}
      {...rest}
    />
  )
}
