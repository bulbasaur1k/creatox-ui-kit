import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

/* ── Progress ──────────────────────────────────────────────────────────────
   `<progress>`. It is already announced correctly, already has a value and a
   maximum, and already knows how to be indeterminate — omit the value and it
   says so, without a prop and without a second component.

   For "something is happening, we do not know for how long" on a button, the
   Spinner in Button.tsx is the smaller answer.                              */

export interface ProgressProps extends Omit<
  ComponentPropsWithoutRef<'progress'>,
  'value'
> {
  /** Omit for an indeterminate bar. */
  value?: number
  max?: number
  label?: ReactNode
  /** Shows the value as a percentage beside the label. */
  showValue?: boolean
  tone?: 'accent' | 'success' | 'warning' | 'danger'
}

const TONE = {
  accent: 'cx-progress-accent',
  success: 'cx-progress-success',
  warning: 'cx-progress-warning',
  danger: 'cx-progress-danger',
} as const

export function Progress({
  value,
  max = 100,
  label,
  showValue,
  tone = 'accent',
  className,
  ...rest
}: ProgressProps) {
  const percent = value === undefined ? undefined : Math.round((value / max) * 100)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {(label !== undefined || showValue) && (
        <div className="flex items-baseline justify-between gap-3 text-meta">
          {label !== undefined && (
            <span className="min-w-0 truncate text-fg-secondary">{label}</span>
          )}
          {showValue && percent !== undefined && (
            <span className="shrink-0 text-fg-muted tabular-nums">{percent}%</span>
          )}
        </div>
      )}
      <progress
        value={value}
        max={max}
        className={cx('cx-progress w-full', TONE[tone], className)}
        {...rest}
      />
    </div>
  )
}
