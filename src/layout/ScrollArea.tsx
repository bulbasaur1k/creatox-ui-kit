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
        'min-h-0 min-w-0 [scrollbar-width:thin]',
        AXIS[axis],
        // Contained overscroll only where there is a bound to scroll against.
        // `contain` means "never hand the wheel to the parent", and a scroll
        // container that has nothing to scroll is always at its boundary — an
        // unbounded area with that rule on it swallows every wheel turn over it
        // and the page under the pointer stands still.
        maxHeight && 'max-h-[var(--cx-scroll-max)] overscroll-contain',
        fade && 'scroll-fade',
        className,
      )}
      style={vars({ '--cx-scroll-max': maxHeight }, style)}
      {...rest}
    />
  )
}
