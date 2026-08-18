import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

/* ── Separator ─────────────────────────────────────────────────────────────*/

export interface SeparatorProps extends ComponentPropsWithoutRef<'hr'> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({
  orientation = 'horizontal',
  className,
  ...rest
}: SeparatorProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cx(
        'm-0 shrink-0 border-0 bg-line',
        orientation === 'horizontal'
          ? 'h-px w-full'
          : 'h-auto min-h-[1em] w-px self-stretch',
        className,
      )}
      {...rest}
    />
  )
}

/* ── Skeleton ──────────────────────────────────────────────────────────────*/

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /** Number of lines to draw. The last one is short, as real text tends to be. */
  lines?: number
  width?: string
  height?: string
  shape?: 'text' | 'block' | 'circle'
}

/**
 * A loading placeholder shaped like the content it stands in for, so the
 * layout does not jump when the real thing arrives.
 */
export function Skeleton({
  lines = 1,
  width,
  height,
  shape = 'text',
  className,
  style,
  ...rest
}: SkeletonProps) {
  const base = cx(
    'animate-pulse bg-inset',
    shape === 'circle' ? 'rounded-full' : 'rounded-sm',
  )

  if (shape === 'text' && lines > 1) {
    return (
      <div className={cx('flex flex-col gap-2', className)} aria-hidden="true" {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={cx(base, 'h-[0.8em]', i === lines - 1 && 'w-3/5')} />
        ))}
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cx(base, shape === 'text' && 'h-[0.8em]', className)}
      style={{ width, height, ...style }}
      {...rest}
    />
  )
}

/* ── EmptyState ────────────────────────────────────────────────────────────*/

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: ReactNode
  /**
   * Explain what this place is for and what will make it fill up. "Nothing
   * here yet" teaches the user nothing about the object model — §25.
   */
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  /** `inline` fits inside a table or panel; `page` owns a whole region. */
  size?: 'inline' | 'page'
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  size = 'page',
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-2 text-center',
        size === 'page' ? 'px-6 py-12' : 'px-4 py-6',
        className,
      )}
      {...rest}
    >
      {icon && <div className="text-title text-fg-muted">{icon}</div>}
      <p className="m-0 text-ui font-medium text-fg">{title}</p>
      {description !== undefined && (
        <p className="m-0 max-w-[42ch] text-meta text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
