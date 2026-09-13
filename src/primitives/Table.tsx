import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import type { Tone } from './Badge'

/**
 * Highlight fills for cells and rows. The `-surface` tokens only — the same
 * muted greens and reds Badge and Toast already use, so a marked cell reads as
 * part of the table rather than as something painted on top of it.
 *
 * A highlight is emphasis, not meaning: it says "look here", not "this
 * failed". Whatever the colour is standing for belongs in the cell as a word —
 * a Status or a Badge — for the same reason Status never ships colour alone.
 */
const TONE: Record<Tone, string> = {
  neutral: 'bg-neutral-surface',
  accent: 'bg-accent-subtle',
  success: 'bg-success-surface',
  warning: 'bg-warning-surface',
  danger: 'bg-danger-surface',
  info: 'bg-info-surface',
}

/* Spelled out rather than built from TONE: Tailwind extracts class names by
   scanning source text, so a template literal would compile to nothing. */
const ROW_TONE: Record<Tone, string> = {
  neutral: '[&>td]:bg-neutral-surface',
  accent: '[&>td]:bg-accent-subtle',
  success: '[&>td]:bg-success-surface',
  warning: '[&>td]:bg-warning-surface',
  danger: '[&>td]:bg-danger-surface',
  info: '[&>td]:bg-info-surface',
}

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
   * The scrolling box around the table. DataTable hands it a ref and a max
   * height so the virtualizer can watch the element that actually scrolls.
   */
  wrapperProps?: ComponentProps<'div'>
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
  wrapperProps,
  className,
  children,
  ...rest
}: TableProps) {
  return (
    <div
      {...wrapperProps}
      className={cx(
        'w-full overflow-auto',
        bounded && 'rounded-md border-[length:var(--cx-hairline)] border-line bg-raised',
        wrapperProps?.className,
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
  /** Marks this one value out of the column — see TONE. */
  tone?: Tone
}

export function Td({ align, mono, pinned, tone, className, ...rest }: TdProps) {
  return (
    <td
      className={cx(
        'border-b-[length:var(--cx-hairline)] border-line px-3 py-2 align-middle text-fg',
        align === 'end' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono text-meta text-fg-secondary',
        // After `pinned`, which carries a background of its own: a pinned cell
        // that is also marked should show the mark, not the plain surface.
        pinned && 'sticky left-0 z-[1] bg-raised',
        tone && TONE[tone],
        className,
      )}
      {...rest}
    />
  )
}

export interface TrProps extends ComponentProps<'tr'> {
  selected?: boolean
  interactive?: boolean
  /** Marks the whole row — see TONE. A `tone` on a Td still wins over it. */
  tone?: Tone
}

/**
 * Carries the `group` marker so row actions can reveal themselves on hover or
 * focus without a handler — see RowActions.
 */
export function Tr({ selected, interactive, tone, className, ...rest }: TrProps) {
  return (
    <tr
      data-selected={selected ? '' : undefined}
      data-interactive={interactive ? '' : undefined}
      aria-selected={selected}
      className={cx(
        'group/row last:[&>td]:border-b-0',
        'data-interactive:cursor-pointer',
        // The row fill sits before the state rules on purpose. Hover, press and
        // selection all carry a pseudo-class or an attribute, so they outrank a
        // bare `[&>td]` on specificity and keep responding over a marked row.
        tone && ROW_TONE[tone],
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
