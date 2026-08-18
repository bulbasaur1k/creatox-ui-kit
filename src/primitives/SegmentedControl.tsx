import { useId, type ReactNode } from 'react'
import { cva, cx } from '../util/cx'
import { useControlSize } from './Field'
import type { ControlSize } from './Button'

/* ── SegmentedControl ──────────────────────────────────────────────────────
   A small, closed set of mutually exclusive choices, all of them visible.

   It is a radio group, which is the whole implementation: arrow keys, Home
   and End, form participation, "2 of 4" from a screen reader and the grouping
   itself all arrive with the native inputs. The painted part is a label with
   `has-[:checked]`, so there is no state here and no handler per option — the
   only JS is the change event the product asked for.

   Use it where a Select would hide the alternatives from someone deciding
   between them, and where there are few enough to show — past five or six the
   row stops fitting and a Select is the honest control.                     */

export interface Segment<T extends string = string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string = string> {
  /** Shared across the radios. Generated when omitted. */
  name?: string
  options: ReadonlyArray<Segment<T>>
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
  size?: ControlSize
  label?: string
  full?: boolean
  className?: string
}

const segment = cva(
  [
    'relative inline-flex min-w-0 cursor-pointer items-center justify-center',
    'rounded-control font-medium whitespace-nowrap text-fg-secondary',
    'transition-colors duration-snap ease-snap',
    'hover:not-has-[:disabled]:text-fg',
    // The checked segment is the raised one: it sits on the canvas colour
    // while the rest stay in the well behind it. Marked with a border rather
    // than a shadow — only transient layers cast one.
    'border border-transparent',
    'has-[:checked]:border-line-strong has-[:checked]:bg-raised has-[:checked]:text-fg',
    'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45',
    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2',
    'has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent',
  ],
  {
    variants: {
      size: { sm: 'control-sm', md: 'control-md', lg: 'control-lg' },
      full: { true: 'flex-1', false: '' },
    },
    defaultVariants: { size: 'md', full: false },
  },
)

export function SegmentedControl<T extends string = string>({
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  size,
  label,
  full,
  className,
}: SegmentedControlProps<T>) {
  const generatedName = useId()
  const groupName = name ?? generatedName
  const controlSize = useControlSize(size)

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex items-center gap-0.5 rounded-control border border-line',
        'bg-subtle p-0.5',
        full && 'flex w-full',
        className,
      )}
    >
      {options.map((option) => (
        <label key={option.value} className={cx(segment({ size: controlSize, full }))}>
          <input
            type="radio"
            name={groupName}
            value={option.value}
            disabled={option.disabled}
            {...(value === undefined
              ? { defaultChecked: option.value === defaultValue }
              : { checked: option.value === value })}
            onChange={() => onValueChange?.(option.value)}
            className="sr-only-control"
          />
          <span className="min-w-0 truncate">{option.label}</span>
        </label>
      ))}
    </div>
  )
}
