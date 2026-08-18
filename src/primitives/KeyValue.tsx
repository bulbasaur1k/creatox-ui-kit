import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'

export interface KeyValuePair {
  key: ReactNode
  value: ReactNode
  /** Machine values render in monospace: ids, versions, hashes, timestamps. */
  mono?: boolean
}

export interface KeyValueProps extends ComponentPropsWithoutRef<'dl'> {
  items: KeyValuePair[]
  /**
   * `grid`   — aligned key/value columns, for a block of facts about an object.
   * `inline` — a single dense line of facts, for an object header.
   */
  layout?: 'grid' | 'inline'
  labelWidth?: string
}

/**
 * A definition list, not a table: these are facts about one object, so there
 * is no second row to compare against and no column to sort by.
 */
export function KeyValue({
  items,
  layout = 'grid',
  labelWidth,
  className,
  style,
  ...rest
}: KeyValueProps) {
  if (layout === 'inline') {
    return (
      <dl
        className={cx('m-0 flex flex-wrap items-baseline gap-x-8 gap-y-3', className)}
        style={style}
        {...rest}
      >
        {items.map((item, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-[0.1rem]">
            <dt className="m-0 min-w-0 text-meta text-fg-muted">{item.key}</dt>
            <dd
              className={cx(
                'm-0 min-w-0 text-ui text-fg',
                item.mono && 'font-mono text-meta',
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <dl
      className={cx(
        'm-0 grid items-baseline gap-x-4 gap-y-1',
        'grid-cols-[var(--cx-kv-label,minmax(6rem,max-content))_minmax(0,1fr)]',
        className,
      )}
      style={vars({ '--cx-kv-label': labelWidth }, style)}
      {...rest}
    >
      {items.map((item, i) => (
        <div key={i} className="contents">
          <dt className="m-0 min-w-0 text-meta text-fg-muted">{item.key}</dt>
          <dd
            className={cx(
              'm-0 min-w-0 text-ui text-fg',
              item.mono && 'font-mono text-meta',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
