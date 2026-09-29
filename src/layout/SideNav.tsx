import {
  useId,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'
import { useLabels } from '../util/intl'
import { Icon } from '../primitives/Icon'
import { chevronLeft } from '../icons'

/* ── SideNav — the navigation column that folds down to a rail of icons ────
   The collapsed state is a checkbox. The input is the first child, so
   everything after it reads `:checked` through the sibling combinator, and
   the column reads its own width through `:has()` — the fold is a CSS
   transition that React never hears about. A product that wants to own the
   state (remember it, drive it from a store) passes `collapsed` and listens
   to `onCollapsedChange`; the input is then controlled, and nothing else
   changes.

   Only the width and the labels animate. Icons hold their x, which is what
   makes the fold read as the same menu getting narrower rather than a
   different menu arriving. Folded, every row names itself in a tooltip; the
   rules for that, and for the width, live in components.css.               */

export interface SideNavProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> {
  /** Brand, project switcher: what sits above the items. Wrap text in it
      with `SideNavLabel` so it folds away with the rest. */
  header?: ReactNode
  footer?: ReactNode
  /** Width when expanded. The rail is derived from the control height. */
  width?: string
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** The strip with the chevron at the bottom. Off when the product folds
      the column from somewhere else. */
  toggle?: boolean
  /** Lets `Split` drop the column when the container is too narrow for it. */
  hideOnNarrow?: boolean
}

export function SideNav({
  header,
  footer,
  width,
  collapsed,
  defaultCollapsed,
  onCollapsedChange,
  toggle = true,
  hideOnNarrow = true,
  className,
  style,
  children,
  ...rest
}: SideNavProps) {
  const id = `cx-sidenav-${useId().replace(/:/g, '')}`
  const labels = useLabels()

  return (
    <nav
      className={cx('cx-sidenav', className)}
      data-cx-collapsible={hideOnNarrow ? 'true' : undefined}
      style={vars({ '--cx-sidenav-width': width }, style)}
      {...rest}
    >
      {/* The nav fills its column; the sticky part inside is at most a
          viewport tall, so the strip at the bottom stays on screen while the
          page scrolls and the body scrolls on its own above it. */}
      <div className="cx-sidenav-column">
        {/* A switch, not a disclosure button: a button would need
            `aria-expanded` kept in sync by JS, and the point is that nothing
            here is. */}
        <input
          type="checkbox"
          role="switch"
          id={id}
          className="cx-sidenav-state sr-only-control"
          checked={collapsed}
          defaultChecked={collapsed === undefined ? defaultCollapsed : undefined}
          onChange={(event) => onCollapsedChange?.(event.currentTarget.checked)}
          aria-label={labels.collapseNav}
        />
        {header !== undefined && <div className="cx-sidenav-header">{header}</div>}
        <div className="cx-sidenav-body">{children}</div>
        {footer !== undefined && <div className="cx-sidenav-footer">{footer}</div>}
        {toggle && (
          <label
            htmlFor={id}
            className="cx-sidenav-toggle"
            data-cx-tooltip={labels.expandNav}
          >
            <span className="cx-sidenav-icon">
              <Icon className="cx-sidenav-chevron">{chevronLeft}</Icon>
            </span>
            <span className="cx-sidenav-label">{labels.collapseNav}</span>
          </label>
        )}
      </div>
    </nav>
  )
}

export interface SideNavItemProps extends ComponentPropsWithoutRef<'a'> {
  /** A router link, or `button` for an action that is not navigation. */
  as?: ElementType
  /** Required: on the rail the icon is all that is left of the row. */
  icon: ReactNode
  selected?: boolean
  count?: ReactNode
  /** What the tooltip says on the rail. Taken from the children when they
      are a string; needed when they are not. */
  label?: string
}

export function SideNavItem({
  as: Tag = 'a',
  icon,
  selected,
  count,
  label,
  className,
  children,
  ...rest
}: SideNavItemProps) {
  const name = label ?? (typeof children === 'string' ? children : undefined)
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      className={cx('cx-sidenav-item', className)}
      aria-current={selected ? 'page' : undefined}
      data-cx-tooltip={name}
      {...rest}
    >
      <span className="cx-sidenav-icon">{icon}</span>
      <span className="cx-sidenav-label">{children}</span>
      {count !== undefined && <span className="cx-sidenav-count">{count}</span>}
    </Tag>
  )
}

export interface SideNavGroupProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'title'
> {
  title?: ReactNode
  /** For content with no icons to fold down to — a tree, a filter form. On
      the rail it is hidden rather than left as an unreadable sliver. */
  onlyExpanded?: boolean
}

export function SideNavGroup({
  title,
  onlyExpanded,
  className,
  children,
  ...rest
}: SideNavGroupProps) {
  return (
    <div
      className={cx('cx-sidenav-group', className)}
      data-only-expanded={onlyExpanded ? '' : undefined}
      {...rest}
    >
      {title !== undefined && (
        <div className="cx-sidenav-group-title">
          <span className="cx-sidenav-label">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}

export interface SideNavLabelProps extends ComponentPropsWithoutRef<'span'> {}

/** Text that folds away with the labels: a brand name in the header, a hint in the footer. */
export function SideNavLabel({ className, ...rest }: SideNavLabelProps) {
  return <span className={cx('cx-sidenav-label', className)} {...rest} />
}
