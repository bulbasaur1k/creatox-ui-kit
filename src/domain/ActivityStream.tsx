import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import { MARK } from '../primitives/Status'
import type { Tone } from '../primitives/Badge'

export interface ActivityEntry {
  /** What happened, in the domain's language. Include the objects involved. */
  description: ReactNode
  /** When it happened. Pass a formatted string; formatting is the app's call. */
  time: ReactNode
  /** Machine-readable timestamp for the <time> element. */
  dateTime?: string
  /** Who or what caused it: a user, a pipeline, a scheduler. */
  actor?: ReactNode
  tone?: Tone
  /** Expanded detail: a diff, a log excerpt, a payload. */
  detail?: ReactNode
}

export interface ActivityStreamProps extends ComponentPropsWithoutRef<'ol'> {
  entries: ActivityEntry[]
}

/**
 * History as a timeline rather than a table: for activity, the order and the
 * gaps between events are the information, and there is nothing to sort by.
 *
 * The connecting rule is drawn with a border on the list itself, so adding an
 * entry costs nothing and the line never falls out of alignment.
 */
export function ActivityStream({ entries, className, ...rest }: ActivityStreamProps) {
  return (
    <ol className={cx('m-0 flex list-none flex-col p-0', className)} {...rest}>
      {entries.map((entry, i) => (
        <li key={i} className="relative flex min-w-0 gap-3 pb-4 last:pb-0">
          {/* The rule connects this mark to the next one and stops at the last. */}
          <div className="relative flex shrink-0 flex-col items-center">
            <span
              aria-hidden="true"
              className={cx(
                'mt-[0.4rem] size-[0.45rem] shrink-0 rounded-full',
                MARK[entry.tone ?? 'neutral'],
              )}
            />
            {i < entries.length - 1 && (
              <span aria-hidden="true" className="mt-1 w-px flex-1 bg-line" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="min-w-0 text-ui text-fg">{entry.description}</span>
              <time
                dateTime={entry.dateTime}
                className="shrink-0 text-meta text-fg-muted"
              >
                {entry.time}
              </time>
            </div>

            {entry.actor !== undefined && (
              <span className="text-meta text-fg-muted">{entry.actor}</span>
            )}

            {entry.detail !== undefined && (
              <div className="mt-1 min-w-0">{entry.detail}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
