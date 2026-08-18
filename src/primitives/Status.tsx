import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import type { Tone } from './Badge'

export interface StatusProps extends ComponentPropsWithoutRef<'span'> {
  tone?: Tone
  children?: ReactNode
  /** Draws attention to a state that is actively changing. */
  pulse?: boolean
  /** Hides the label, leaving only the mark. The label still reaches assistive tech. */
  markOnly?: boolean
}

/* Shared with ActivityStream: the same six tones mean the same six colours,
   and two copies would be two places to forget. */
export const MARK: Record<Tone, string> = {
  neutral: 'bg-neutral',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

/**
 * A compact state signal: a mark plus a word. Deliberately not a badge — a
 * status is a fact about an object, not a label attached to it, and it appears
 * inline next to object names far too often to carry a filled background.
 *
 * Colour is never the only carrier: the word is always present, and available
 * to assistive tech even when visually hidden.
 */
export function Status({
  tone = 'neutral',
  pulse,
  markOnly,
  className,
  children,
  ...rest
}: StatusProps) {
  return (
    <span
      className={cx('inline-flex shrink-0 items-center gap-[0.4rem] text-ui', className)}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cx(
          'size-[0.45rem] shrink-0 rounded-full',
          MARK[tone],
          pulse && 'animate-pulse',
        )}
      />
      {children !== undefined &&
        (markOnly ? (
          <span className="sr-only-control">{children}</span>
        ) : (
          <span className="min-w-0 truncate text-fg-secondary">{children}</span>
        ))}
    </span>
  )
}
