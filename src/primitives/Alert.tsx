import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cva, cx } from '../util/cx'
import { useLabels } from '../util/intl'
import { x } from '../icons'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import type { Tone } from './Badge'

/* ── Alert ─────────────────────────────────────────────────────────────────
   A message that belongs to the place it is shown: the reason a form will
   not submit, the warning over an invoice that is already paid, the notice
   that a service is being drained. It stays until the situation changes.

   That is what separates it from a toast. A toast announces an event and
   leaves; whoever looked away missed it, and that is fine because the event
   is over. An alert describes a state, and a state has to be readable for
   as long as it holds — next to the thing it is about, not in a corner.  */

export interface AlertProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  tone?: Tone
  title?: ReactNode
  icon?: ReactNode
  /** A button or a link that acts on the situation — "Retry", "Open invoice". */
  action?: ReactNode
  /** Adds a close control. Only for messages the reader may put away. */
  onDismiss?: () => void
}

const alert = cva(
  [
    'flex items-start gap-3 rounded-md border-[length:var(--cx-hairline)] px-3 py-2.5',
    'text-ui',
  ],
  {
    variants: {
      tone: {
        neutral: 'border-line bg-subtle text-fg',
        accent: 'border-accent bg-accent-subtle text-fg',
        info: 'border-info bg-info-surface text-info-fg',
        success: 'border-success bg-success-surface text-success-fg',
        warning: 'border-warning bg-warning-surface text-warning-fg',
        danger: 'border-danger bg-danger-surface text-danger-fg',
      },
    },
    defaultVariants: { tone: 'info' },
  },
)

export function Alert({
  tone = 'info',
  title,
  icon,
  action,
  onDismiss,
  className,
  children,
  ...rest
}: AlertProps) {
  const labels = useLabels()
  return (
    <div
      // A problem interrupts; everything else waits its turn to be read.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(alert({ tone }), className)}
      {...rest}
    >
      {icon !== undefined && (
        <span className="mt-[0.15em] shrink-0 text-[1.1em]">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        {title !== undefined && <p className="m-0 font-medium">{title}</p>}
        {children !== undefined && (
          <div className={cx('text-meta', title !== undefined && 'mt-0.5 opacity-90')}>
            {children}
          </div>
        )}
        {action !== undefined && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss !== undefined && (
        <IconButton
          size="sm"
          label={labels.dismiss}
          icon={<Icon>{x}</Icon>}
          onClick={onDismiss}
          className="-my-1 -me-1 shrink-0 text-inherit"
        />
      )}
    </div>
  )
}
