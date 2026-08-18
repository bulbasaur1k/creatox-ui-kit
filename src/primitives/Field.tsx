import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { cx } from '../util/cx'
import { useLabels } from '../util/intl'
import type { ControlSize } from './Button'

/* ── How a control learns its size ─────────────────────────────────────────
   Through context, and the alternative is why. The obvious move is to hand
   the size to the control in the same object the field already passes down —
   but that object is spread onto an element, and half the things a product
   puts in a field are plain `<input>`s. A prop React does not recognise on a
   DOM node is a console warning at best and an invalid attribute at worst,
   so what a field passes down has to stay strictly DOM-safe.

   The context carries no state and never changes after mount, so it costs a
   read and nothing else. An explicit prop always wins over it: a control can
   still be deliberately smaller than the field around it.                   */
const ControlSizeContext = createContext<ControlSize>('md')

export function useControlSize(explicit?: ControlSize): ControlSize {
  const inherited = useContext(ControlSizeContext)
  return explicit ?? inherited
}

/* ── Field ─────────────────────────────────────────────────────────────────
   Wires label, description, error and the control together so that every form
   in the product gets the same association rules without repeating them.    */

/* Label and helper text sized against the control they belong to — through a
   token, so they follow the density as well as the size. A field is one row,
   and a 12px label under a 44px input is the row coming apart. */
const LABEL_TEXT: Record<ControlSize, string> = {
  sm: 'text-field-sm',
  md: 'text-field-md',
  lg: 'text-field-lg',
}

export interface FieldProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  required?: boolean
  /** Marks the field explicitly optional, for forms where most fields are not. */
  optional?: boolean
  /** Horizontal rows suit dense settings screens; they stack when space runs out. */
  layout?: 'stacked' | 'horizontal'
  /**
   * Sizes the whole field: the label, the message, and any kit control
   * rendered inside it. The control picks it up on its own — nothing has to
   * be threaded through the render prop.
   *
   * For a touch interface set the density on `<Root>` instead: that moves
   * every control in the product at once, and this prop keeps meaning
   * "smaller or larger than the rest of this screen".
   */
  controlSize?: ControlSize
  children: (props: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': true | undefined
  }) => ReactNode
}

export function Field({
  label,
  help,
  error,
  required,
  optional,
  layout = 'stacked',
  controlSize = 'md',
  className,
  children,
  ...rest
}: FieldProps) {
  const labels = useLabels()
  const id = useId()
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined

  return (
    <div
      className={cx(
        'min-w-0',
        layout === 'horizontal'
          ? cx(
              'grid grid-cols-[minmax(8rem,14rem)_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2',
              '@max-narrow/page:grid-cols-[minmax(0,1fr)]',
            )
          : 'flex flex-col gap-1',
        className,
      )}
      {...rest}
    >
      {label !== undefined && (
        <label
          htmlFor={id}
          className={cx(
            'flex items-baseline gap-1 font-medium text-fg-secondary',
            LABEL_TEXT[controlSize],
          )}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-danger">
              *
            </span>
          )}
          {optional && !required && (
            <span className="text-micro font-normal text-fg-muted">
              {labels.optional}
            </span>
          )}
        </label>
      )}

      <ControlSizeContext.Provider value={controlSize}>
        {children({
          id,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
        })}
      </ControlSizeContext.Provider>

      {error !== undefined && (
        <p
          id={errorId}
          className={cx(
            'm-0 text-danger-fg',
            LABEL_TEXT[controlSize],
            layout === 'horizontal' && 'col-start-2 @max-narrow/page:col-start-1',
          )}
        >
          {error}
        </p>
      )}
      {help !== undefined && error === undefined && (
        <p
          id={helpId}
          className={cx(
            'm-0 text-fg-muted',
            LABEL_TEXT[controlSize],
            layout === 'horizontal' && 'col-start-2 @max-narrow/page:col-start-1',
          )}
        >
          {help}
        </p>
      )}
    </div>
  )
}

/* ── The shared control surface ────────────────────────────────────────────*/

const CONTROL_BASE =
  'w-full min-w-0 rounded-control border border-line-strong bg-raised text-fg ' +
  'transition-colors duration-snap ease-snap placeholder:text-fg-muted ' +
  'hover:not-disabled:border-line-accent disabled:bg-subtle ' +
  'aria-invalid:border-danger aria-invalid:bg-danger-surface'

/* One utility per size, same three as Button — which is the point: a field
   and the button next to it resolve the same tokens and end up the same
   height without either of them naming a number. */
export const CONTROL_SIZE: Record<ControlSize, string> = {
  sm: 'control-sm',
  md: 'control-md',
  lg: 'control-lg',
}

/* For controls whose height is their content — textarea — only the text and
   the padding come from the row. */
const CONTROL_TEXT: Record<ControlSize, string> = {
  sm: 'text-control-sm px-field-sm',
  md: 'text-control-md px-field-md',
  lg: 'text-control-lg px-field-lg',
}

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  size?: never
  controlSize?: ControlSize
  /** Monospace for machine values: ids, hosts, versions, tokens. */
  mono?: boolean
}

export function Input({
  controlSize,
  mono,
  className,
  type = 'text',
  ...rest
}: InputProps) {
  const size = useControlSize(controlSize)
  return (
    <input
      type={type}
      className={cx(
        CONTROL_BASE,
        CONTROL_SIZE[size],
        // Relative, not a fixed step: a monospace face runs optically larger
        // at the same size, but pinning it to 12px took the control out of
        // the row its neighbours are in.
        mono && 'font-mono text-[0.95em]',
        className,
      )}
      {...rest}
    />
  )
}

/* There is no date input here on purpose. `<input type="date">` is the one
   native control the kit does not wrap: Firefox draws a different widget from
   Chrome, Safari a third, none of them take the product's styling, and on the
   engines that do render a picker it arrives in a shape nothing else in the
   interface has. `DatePicker` and `TimePicker` are drawn instead. */

export interface TextareaProps extends Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'size'
> {
  controlSize?: ControlSize
  mono?: boolean
}

/** Grows with its content via `field-sizing`, so no auto-size hook is needed. */
export function Textarea({ controlSize, mono, className, ...rest }: TextareaProps) {
  const size = useControlSize(controlSize)
  return (
    <textarea
      className={cx(
        CONTROL_BASE,
        'cx-textarea max-h-96 min-h-[calc(var(--spacing-control-lg)*2)] resize-y py-2',
        CONTROL_TEXT[size],
        // Relative, not a fixed step: a monospace face runs optically larger
        // at the same size, but pinning it to 12px took the control out of
        // the row its neighbours are in.
        mono && 'font-mono text-[0.95em]',
        className,
      )}
      {...rest}
    />
  )
}

/* `Select` and `Combobox` live in Listbox.tsx. Nothing in this kit opens a
   native popup any more: a `<select>` renders a different list on every
   platform, takes no styling inside it, and cannot hold anything but text —
   which rules out the two-line option with a description under it that a real
   form needs. Both are drawn against the same tokens as everything else. */

/* Shared with those, so a drawn control and a plain input cannot drift. */
export const CONTROL_SURFACE = CONTROL_BASE
export const CONTROL_ROW = CONTROL_SIZE

export interface InputGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'prefix'> {
  controlSize?: ControlSize
  /** Rendered before the input: a search icon, a protocol prefix. */
  prefix?: ReactNode
  /** Rendered after the input: a unit, a clear button, a counter. */
  suffix?: ReactNode
}

/**
 * Adornments around an input. The focus ring moves to the group so the whole
 * control reads as one thing.
 */
export function InputGroup({
  controlSize,
  prefix,
  suffix,
  className,
  children,
  ...rest
}: InputGroupProps) {
  const size = useControlSize(controlSize)
  return (
    <div
      className={cx(
        CONTROL_SIZE[size],
        'flex w-full items-center gap-2 rounded-control',
        'border border-line-strong bg-raised text-fg-muted',
        'transition-colors duration-snap ease-snap hover:border-line-accent',
        'has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2',
        'has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-accent',
        '[&_input]:h-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0',
        '[&_input]:outline-none',
        className,
      )}
      {...rest}
    >
      {prefix}
      {children}
      {suffix}
    </div>
  )
}
