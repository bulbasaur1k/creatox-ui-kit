import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

export interface Relationship {
  /**
   * How this object relates to the other one, in the domain's own words:
   * "belongs to", "deployed by", "created incident". Not a section heading.
   */
  predicate: ReactNode
  /** The related object. Use ObjectRef so it stays recognisable and clickable. */
  object: ReactNode
}

export interface RelationshipListProps extends ComponentPropsWithoutRef<'dl'> {
  items: Relationship[]
}

/**
 * Relationships as first-class content — §12.
 *
 * Rendered as predicate/object pairs so the connection itself is readable,
 * rather than as an unlabelled list of links that leaves the user guessing
 * how the two objects are related.
 */
export function RelationshipList({ items, className, ...rest }: RelationshipListProps) {
  return (
    <dl
      className={cx(
        'm-0 grid grid-cols-[minmax(6rem,max-content)_minmax(0,1fr)] items-baseline',
        'gap-x-4 gap-y-2',
        className,
      )}
      {...rest}
    >
      {items.map((item, i) => (
        <div key={i} className="contents">
          <dt className="m-0 min-w-0 text-meta text-fg-muted">{item.predicate}</dt>
          <dd className="m-0 min-w-0">{item.object}</dd>
        </div>
      ))}
    </dl>
  )
}
