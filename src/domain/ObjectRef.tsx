import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cx } from '../util/cx'
import { Status } from '../primitives/Status'
import type { Tone } from '../primitives/Badge'

export interface ObjectRefProps extends Omit<ComponentPropsWithoutRef<'a'>, 'title'> {
  as?: ElementType
  /** The object's name. This is its identity — keep it recognisable everywhere. */
  name: ReactNode
  /**
   * What kind of object this is. Shown in wider forms; always available to
   * assistive tech so "payments-api" is never announced without its type.
   */
  type?: string
  /** One line of context: environment, owner, region, parent object. */
  context?: ReactNode
  status?: Tone
  statusLabel?: string
  /** Replaces the status mark with a type icon or avatar. */
  leading?: ReactNode
  /**
   * `compact` — one line, for tables and dense lists.
   * `default` — name plus context, for list rows and relationship lists.
   * `rich`    — adds the type label, for search results and cross-object views.
   */
  size?: 'compact' | 'default' | 'rich'
}

/**
 * The single compact representation of a domain object — §18.
 *
 * The same component is used in tables, lists, breadcrumbs, relationship
 * views, activity streams and search results. It adapts to the space it is
 * given, but the object stays recognisable in every one of them, which is what
 * lets users navigate by object rather than by page.
 */
export function ObjectRef({
  as: Tag = 'a',
  name,
  type,
  context,
  status,
  statusLabel,
  leading,
  size = 'default',
  className,
  ...rest
}: ObjectRefProps) {
  const mark =
    leading ??
    (status && (
      <Status tone={status} markOnly>
        {statusLabel ?? status}
      </Status>
    ))

  return (
    <Tag
      className={cx(
        'group/ref inline-flex min-w-0 items-center gap-2 text-inherit no-underline',
        Tag !== 'span' && 'cursor-pointer rounded-sm',
        className,
      )}
      {...rest}
    >
      {mark}

      <span className="flex min-w-0 flex-col gap-0">
        <span className="flex min-w-0 items-baseline gap-2">
          <span
            className={cx(
              'min-w-0 truncate font-medium text-fg',
              Tag !== 'span' && 'group-hover/ref:text-fg-accent',
            )}
          >
            {name}
          </span>
          {size === 'rich' && type && (
            <span className="shrink-0 text-micro uppercase tracking-[0.04em] text-fg-muted">
              {type}
            </span>
          )}
          {size !== 'rich' && type && <span className="sr-only-control">{type}</span>}
        </span>

        {size !== 'compact' && context !== undefined && (
          <span className="min-w-0 truncate text-meta text-fg-muted">{context}</span>
        )}
      </span>
    </Tag>
  )
}
