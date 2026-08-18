import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

/**
 * A real <table>. Reach for it whenever users need to compare, scan, sort,
 * filter or process many objects — a grid of cards does none of that well.
 *
 * The parts are exported separately rather than driven by a `columns` config
 * so that a cell can hold an ObjectRef, a Status or anything else the domain
 * needs, instead of only a string.
 */

export interface TableProps extends ComponentPropsWithoutRef<'table'> {
  density?: 'compact' | 'default' | 'comfortable'
  caption?: ReactNode
  /**
   * Draws a box around the whole table. Off by default: the sticky header
   * already marks where the table begins, and an outer border on top of ruled
   * rows states the same boundary twice.
   */
  bounded?: boolean
}

const DENSITY = {
  compact: '[&_td]:py-1 [&_th]:py-1',
  default: '',
  comfortable: '[&_td]:py-3 [&_th]:py-3',
} as const

export function Table({
  density = 'default',
  caption,
  bounded,
  className,
  children,
  ...rest
}: TableProps) {
  return (
    <div
      className={cx(
        'w-full overflow-auto',
        bounded && 'rounded-md border-[length:var(--cx-hairline)] border-line bg-raised',
      )}
    >
      <table
        className={cx(
          'w-full border-separate border-spacing-0 text-ui tabular-nums',
          DENSITY[density],
          className,
        )}
        {...rest}
      >
        {caption !== undefined && (
          <caption className="caption-top px-3 py-2 text-left text-meta text-fg-muted">
            {caption}
          </caption>
        )}
        {children}
      </table>
    </div>
  )
}

/* `align` is overridden rather than reused: the HTML attribute is a
   presentational leftover that takes left/right, while the kit works in
   logical directions so right-to-left locales come out correct. */
export interface ThProps extends Omit<ComponentPropsWithoutRef<'th'>, 'align'> {
  align?: 'start' | 'center' | 'end'
  /** Keeps the column visible while the rest of the table scrolls sideways. */
  pinned?: boolean
}

export function Th({ align, pinned, className, ...rest }: ThProps) {
  return (
    <th
      scope="col"
      className={cx(
        'sticky top-0 z-10 whitespace-nowrap bg-subtle px-3 py-2',
        'border-b-[length:var(--cx-hairline)] border-line',
        'text-left text-micro font-medium uppercase tracking-[0.04em] text-fg-muted',
        align === 'end' && 'text-right',
        align === 'center' && 'text-center',
        pinned && 'left-0 z-20',
        className,
      )}
      {...rest}
    />
  )
}

export interface TdProps extends Omit<ComponentPropsWithoutRef<'td'>, 'align'> {
  align?: 'start' | 'center' | 'end'
  /** Machine values: ids, sizes, durations, hashes. */
  mono?: boolean
  pinned?: boolean
}

export function Td({ align, mono, pinned, className, ...rest }: TdProps) {
  return (
    <td
      className={cx(
        'border-b-[length:var(--cx-hairline)] border-line px-3 py-2 align-middle text-fg',
        align === 'end' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono text-meta text-fg-secondary',
        pinned && 'sticky left-0 z-[1] bg-raised',
        className,
      )}
      {...rest}
    />
  )
}

export interface TrProps extends ComponentPropsWithoutRef<'tr'> {
  selected?: boolean
  interactive?: boolean
}

/**
 * Carries the `group` marker so row actions can reveal themselves on hover or
 * focus without a handler — see RowActions.
 */
export function Tr({ selected, interactive, className, ...rest }: TrProps) {
  return (
    <tr
      data-selected={selected ? '' : undefined}
      data-interactive={interactive ? '' : undefined}
      aria-selected={selected}
      className={cx(
        'group/row last:[&>td]:border-b-0',
        'data-interactive:cursor-pointer',
        'not-data-selected:hover:[&>td]:bg-hover',
        'data-interactive:not-data-selected:active:[&>td]:bg-active',
        'data-selected:[&>td]:bg-selected',
        className,
      )}
      {...rest}
    />
  )
}

/**
 * Row actions appear on hover or when something inside the row takes focus,
 * and are always visible on touch, where there is no hover to reveal them.
 * Progressive disclosure with no event handling at all — §10.
 */
export function RowActions({ className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cx(
        'flex items-center justify-end gap-1 opacity-0 transition-opacity duration-snap ease-snap',
        'group-hover/row:opacity-100 group-focus-within/row:opacity-100',
        'has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100',
        className,
      )}
      {...rest}
    />
  )
}

export interface SortButtonProps extends ComponentPropsWithoutRef<'button'> {
  direction?: 'ascending' | 'descending' | 'none'
}

export function SortButton({
  direction = 'none',
  className,
  children,
  type,
  ...rest
}: SortButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-sort={direction === 'none' ? undefined : direction}
      className={cx(
        'cx-sort-mark inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent',
        'p-0 font-inherit uppercase tracking-[inherit] text-inherit',
        'transition-colors duration-instant ease-snap hover:text-fg active:text-fg-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
