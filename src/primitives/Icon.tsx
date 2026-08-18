import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

export interface IconProps extends ComponentPropsWithoutRef<'svg'> {
  /** SVG path content, sized against a 24×24 viewBox. */
  children: ReactNode
  /** Give a label only when the icon is the sole carrier of meaning. */
  label?: string
}

/**
 * Icons inherit colour and scale with the text around them, so an icon inside
 * a `text-meta` label is automatically smaller than one in a title. The kit
 * ships no icon set — bring your own paths or any icon library.
 */
export function Icon({ children, label, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cx('inline-block size-[1em] shrink-0 align-[-0.125em]', className)}
      {...rest}
    >
      {children}
    </svg>
  )
}
