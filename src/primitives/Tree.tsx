import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cx } from '../util/cx'

/**
 * Built on native <details>, so expansion state costs nothing: no open-nodes
 * set in React, no controlled/uncontrolled split, and it keeps working with
 * find-in-page, which expands matching sections on its own.
 *
 * Deliberately not `role="tree"`. That role is a contract with assistive tech:
 * arrow keys move between nodes, left and right collapse and expand, type-ahead
 * jumps, and every node reports its level, position and size. Claiming the role
 * without implementing all of it leaves a screen-reader user with a widget that
 * announces keys which do nothing — worse than no role at all. What is here is
 * a set of nested disclosures, which is what `<details>` already is and already
 * announces correctly, with Enter and Space doing the expanding.
 *
 * Selection is a navigation state, so the selected row carries `aria-current`.
 */

export interface TreeProps extends ComponentPropsWithoutRef<'div'> {}

export function Tree({ className, ...rest }: TreeProps) {
  return <div className={cx('min-w-0 text-ui', className)} {...rest} />
}

export interface TreeNodeProps extends Omit<
  ComponentPropsWithoutRef<'details'>,
  'title'
> {
  label: ReactNode
  selected?: boolean
  /** Rendered between the twisty and the label: a type icon, a status mark. */
  leading?: ReactNode
  /** Actions for this node, revealed on hover. */
  actions?: ReactNode
}

/* Selection lives on the element as `data-selected`, not in the class list, so
   the row styling is a constant and a product can restyle a selected row from
   its own stylesheet. The compound overrides are spelled out because hover and
   press must not repaint a row that is already selected. */
const ROW =
  'flex min-w-0 items-center gap-2 rounded-sm px-2 py-[0.2rem] ' +
  'transition-colors duration-instant ease-snap ' +
  'hover:bg-hover active:bg-active'

const ROW_SELECTED =
  'group-data-selected/node:bg-selected group-data-selected/node:text-fg-accent ' +
  'group-data-selected/node:hover:bg-selected group-data-selected/node:active:bg-selected'

export function TreeNode({
  label,
  selected,
  leading,
  actions,
  className,
  children,
  ...rest
}: TreeNodeProps) {
  return (
    <details
      className={cx('cx-tree-node group/node min-w-0', className)}
      data-selected={selected ? '' : undefined}
      {...rest}
    >
      <summary
        aria-current={selected || undefined}
        className={cx('cx-tree-twisty cursor-pointer select-none', ROW, ROW_SELECTED)}
      >
        {leading}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {actions && (
          <span className="flex shrink-0 items-center gap-1 opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 [@media(hover:none)]:opacity-100">
            {actions}
          </span>
        )}
      </summary>
      <div className="ml-4 border-l border-line pl-1">{children}</div>
    </details>
  )
}

export interface TreeLeafProps extends ComponentPropsWithoutRef<'a'> {
  as?: ElementType
  selected?: boolean
  leading?: ReactNode
}

/** A node with no children. Reserves the twisty column so labels stay aligned. */
export function TreeLeaf({
  as: Tag = 'a',
  selected,
  leading,
  className,
  children,
  ...rest
}: TreeLeafProps) {
  return (
    <Tag
      data-selected={selected ? '' : undefined}
      aria-current={selected || undefined}
      className={cx(
        'cx-tree-leaf cursor-pointer text-inherit no-underline',
        ROW,
        'data-selected:bg-selected data-selected:text-fg-accent',
        'data-selected:hover:bg-selected data-selected:active:bg-selected',
        className,
      )}
      {...rest}
    >
      {leading}
      <span className="min-w-0 truncate">{children}</span>
    </Tag>
  )
}
