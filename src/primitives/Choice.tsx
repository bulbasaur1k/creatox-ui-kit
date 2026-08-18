import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

/* Native inputs throughout. Only the painted parts are replaced, so keyboard
   behaviour, form participation and assistive-tech semantics stay the
   browser's job — see components.css for the marks. */

/* No nudge to line the box up with the label: the row is aligned on the text
   baseline instead, and a replaced element's baseline is the bottom of its
   box, so the box sits on the line the way a native one does. A fixed margin
   was doing it before, and a fixed margin is wrong twice — it is measured
   against one font size, and `--spacing-choice` grows in touch density, where
   the box ends up below the line it belongs to. It also has to be undone by
   hand the moment a product centres the row. */
const CONTROL =
  'cx-choice-control m-0 size-choice shrink-0 cursor-pointer ' +
  'border border-line-strong bg-raised transition-colors duration-snap ease-snap ' +
  'hover:not-disabled:border-line-accent ' +
  'checked:border-accent checked:bg-accent ' +
  'indeterminate:border-accent indeterminate:bg-accent'

export interface ChoiceProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  label?: ReactNode
  description?: ReactNode
}

export function Checkbox({ label, description, className, ...rest }: ChoiceProps) {
  return (
    <label
      className={cx(
        // `items-baseline`, so the box lands on the first line of the label
        // however large that text is. Pass `items-center` and it is centred
        // on the whole row instead — nothing here has to be unpicked first.
        'inline-flex min-w-0 cursor-pointer items-baseline gap-2',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45',
        className,
      )}
    >
      <input type="checkbox" className={cx(CONTROL, 'rounded-sm')} {...rest} />
      {(label !== undefined || description !== undefined) && (
        <span className="min-w-0">
          {label !== undefined && <span className="text-ui text-fg">{label}</span>}
          {description !== undefined && (
            <span className="block text-meta text-fg-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  )
}

export function Radio({ label, description, className, ...rest }: ChoiceProps) {
  return (
    <label
      className={cx(
        // `items-baseline`, so the box lands on the first line of the label
        // however large that text is. Pass `items-center` and it is centred
        // on the whole row instead — nothing here has to be unpicked first.
        'inline-flex min-w-0 cursor-pointer items-baseline gap-2',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45',
        className,
      )}
    >
      <input type="radio" className={cx(CONTROL, 'rounded-full')} {...rest} />
      {(label !== undefined || description !== undefined) && (
        <span className="min-w-0">
          {label !== undefined && <span className="text-ui text-fg">{label}</span>}
          {description !== undefined && (
            <span className="block text-meta text-fg-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  )
}

export interface ToggleProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  label?: ReactNode
}

/**
 * A binary control — one of the few places a full pill is the right shape,
 * because the geometry itself communicates "two positions".
 */
export function Toggle({ label, className, ...rest }: ToggleProps) {
  return (
    <label
      className={cx(
        'inline-flex cursor-pointer items-center gap-2',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className={cx(
          'cx-toggle-control m-0 h-switch-block w-switch-inline',
          'shrink-0 cursor-pointer rounded-full border-0',
          'bg-line-strong transition-colors duration-snap ease-snap checked:bg-accent',
        )}
        {...rest}
      />
      {label !== undefined && <span className="text-ui text-fg">{label}</span>}
    </label>
  )
}
