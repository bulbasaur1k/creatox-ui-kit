import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import { useLabels } from '../util/intl'
import { Link } from '../primitives/Link'

export interface Crumb {
  label: ReactNode
  href?: string
}

export interface BreadcrumbsProps extends ComponentPropsWithoutRef<'nav'> {
  items: Crumb[]
}

/**
 * Where the user is, and the path they can walk back up. This is the answer to
 * "where did I come from" — the object's place in the domain, not a history of
 * clicks.
 */
export function Breadcrumbs({ items, className, ...rest }: BreadcrumbsProps) {
  const labels = useLabels()
  return (
    <nav
      aria-label={labels.breadcrumb}
      className={cx('flex min-w-0 items-center gap-1 text-meta', className)}
      {...rest}
    >
      {items.map((item, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className="text-fg-muted">
              /
            </span>
          )}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} variant="quiet" className="truncate text-fg-secondary">
              {item.label}
            </Link>
          ) : (
            <span
              aria-current={i === items.length - 1 ? 'page' : undefined}
              className="truncate text-fg-secondary"
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

export interface ObjectHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'title'
> {
  /** The object's name. One per view. */
  name: ReactNode
  /** What kind of object this is, shown above the name. */
  type?: ReactNode
  breadcrumbs?: Crumb[]
  /** The object's current state — the second question a user asks. */
  status?: ReactNode
  /** Facts about the object: use ObjectMeta or KeyValue in `inline` layout. */
  meta?: ReactNode
  /** The actions available on this object right now. */
  actions?: ReactNode
  /** Contextual navigation for this object: use TabNav. */
  navigation?: ReactNode
}

/**
 * The top of an object view. It answers, in order: where am I, what is this,
 * what state is it in, what can I do with it, and where can I go next.
 *
 * Deliberately not a card: the object is the page, so it needs no box drawn
 * around it — §4.
 */
export function ObjectHeader({
  name,
  type,
  breadcrumbs,
  status,
  meta,
  actions,
  navigation,
  className,
  children,
  ...rest
}: ObjectHeaderProps) {
  return (
    <header className={cx('flex min-w-0 flex-col gap-3', className)} {...rest}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          {type !== undefined && (
            <span className="text-micro font-medium uppercase tracking-[0.04em] text-fg-muted">
              {type}
            </span>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="m-0 min-w-0 text-identity font-semibold text-fg">{name}</h1>
            {status}
          </div>
        </div>

        {actions !== undefined && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {meta}
      {children}
      {navigation}
    </header>
  )
}
