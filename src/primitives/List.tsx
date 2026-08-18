import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cx } from '../util/cx'

export interface ListProps extends ComponentPropsWithoutRef<'ul'> {
  as?: ElementType
  /** Draws a container around the whole list. */
  bounded?: boolean
  divided?: boolean
}

/**
 * Use a List when order or hierarchy matters more than per-column comparison,
 * and the object as a whole matters more than any single attribute of it.
 * When users need to compare across attributes, use a Table instead.
 */
export function List({
  as: Tag = 'ul',
  bounded,
  divided = true,
  className,
  ...rest
}: ListProps) {
  return (
    <Tag
      className={cx(
        'm-0 flex min-w-0 list-none flex-col p-0',
        bounded &&
          'overflow-hidden rounded-md border-[length:var(--cx-hairline)] border-line bg-raised',
        // One mechanism, not two: `divide-y` sets the width on `* + *` while a
        // blanket child rule sets it on `*`, so the first item ends up with a
        // border whose colour nobody set — it falls back to currentColor and
        // draws a hard dark line.
        divided && '[&>*+*]:border-t-[length:var(--cx-hairline)] [&>*+*]:border-line',
        className,
      )}
      {...rest}
    />
  )
}

export interface ListItemProps extends ComponentPropsWithoutRef<'li'> {
  as?: ElementType
  interactive?: boolean
  selected?: boolean
  /** Rendered before the content: a status mark, an avatar, a type icon. */
  leading?: ReactNode
  /** Revealed on hover or focus, like table row actions. */
  actions?: ReactNode
}

export function ListItem({
  as: Tag = 'li',
  interactive,
  selected,
  leading,
  actions,
  className,
  children,
  ...rest
}: ListItemProps) {
  return (
    <Tag
      data-selected={selected ? '' : undefined}
      data-interactive={interactive ? '' : undefined}
      aria-current={selected || undefined}
      className={cx(
        // Both states are attributes on the element, so the class list is a
        // constant and the row can be restyled from a product stylesheet.
        // Hover and press are scoped to interactive rows, and both are
        // suppressed on a selected row so it does not repaint under the finger.
        'group/item flex min-w-0 items-center gap-3 px-3 py-2 text-inherit no-underline',
        'data-interactive:cursor-pointer data-interactive:transition-colors',
        'data-interactive:duration-instant data-interactive:ease-snap',
        'data-interactive:not-data-selected:hover:bg-hover',
        'data-interactive:not-data-selected:active:bg-active',
        'data-selected:bg-selected data-selected:shadow-[inset_2px_0_0_var(--color-accent)]',
        className,
      )}
      {...rest}
    >
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-[0.05rem]">{children}</div>
      {actions && (
        <div
          className={cx(
            'flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-snap ease-snap',
            'group-hover/item:opacity-100 group-focus-within/item:opacity-100',
            '[@media(hover:none)]:opacity-100',
          )}
        >
          {actions}
        </div>
      )}
    </Tag>
  )
}
