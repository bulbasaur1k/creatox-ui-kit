import type { ComponentPropsWithoutRef, ElementType, MouseEvent, ReactNode } from 'react'
import { cva, cx } from '../util/cx'
import { useHeldResult, useSettled } from '../util/settle'
import { check, x } from '../icons'
import { Icon } from './Icon'

export type ButtonVariant = 'default' | 'primary' | 'quiet' | 'danger'
export type ControlSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  as?: ElementType
  variant?: ButtonVariant
  size?: ControlSize
  /**
   * Keeps the label in place so the button does not resize while working.
   *
   * The button stops taking clicks the moment this goes up, but the spinner
   * waits: an answer inside ~150ms shows nothing, and a spinner that did
   * appear stays ~400ms so it reads as one — see `useSettled`. Pass
   * `'immediate'` to draw it on the first frame regardless.
   */
  loading?: boolean | 'immediate'
  /**
   * What the last action came to. A tick or a cross takes the icon's place
   * for ~1.4s and then the button is a button again; the product only has
   * to mark the moment. `resultSticky` keeps it — for actions done once.
   */
  result?: 'success' | 'error'
  resultSticky?: boolean
  icon?: ReactNode
  iconEnd?: ReactNode
  full?: boolean
}

/* One recipe rather than a base string and two lookup tables. The height,
   text size and padding all come from the single `button-*` utility, so the
   density in force decides what `md` means — nothing here says 36px. */
const button = cva(
  [
    // `loading` is already on the element as `aria-busy`, so the busy styling
    // reads it from there instead of branching here. The class list stops
    // depending on state, and a product can style a busy button from its own
    // CSS without being handed a prop.
    'group/button inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
    // No `leading-none`. The label is a truncating span, so it clips at the
    // line box, and a line box exactly one font-size tall has no room for the
    // descenders in "Роллаут" or "Deploy topology". The height is the control
    // token's either way.
    'rounded-control border font-medium no-underline',
    'cursor-pointer transition-colors duration-snap ease-snap',
    'aria-pressed:bg-selected aria-pressed:text-fg-accent',
    // `data-pending` goes up with the flag and takes the clicks away at once;
    // `aria-busy` follows when the spinner does, so a fast answer changes
    // nothing on screen and a double-click still lands on nothing.
    'data-pending:pointer-events-none aria-busy:cursor-progress',
  ],
  {
    variants: {
      variant: {
        default:
          'border-line-strong bg-raised text-fg hover:not-disabled:bg-hover active:not-disabled:bg-active',
        primary:
          'border-accent bg-accent text-accent-fg hover:not-disabled:border-accent-hover hover:not-disabled:bg-accent-hover active:not-disabled:bg-accent-active',
        quiet:
          'border-transparent text-fg-secondary hover:not-disabled:bg-hover hover:not-disabled:text-fg active:not-disabled:bg-active',
        danger:
          'border-[color-mix(in_oklch,var(--color-danger)_40%,transparent)] bg-raised text-danger-fg hover:not-disabled:border-danger hover:not-disabled:bg-danger-surface active:not-disabled:bg-danger-active',
      },
      size: { sm: 'button-sm', md: 'button-md', lg: 'button-lg' },
      full: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'default', size: 'md', full: false },
  },
)

/** A small CSS-only spinner. No icon dependency, no animation library. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'size-[0.85em] shrink-0 animate-spin rounded-full border-[1.5px]',
        'border-[color-mix(in_oklch,currentColor_25%,transparent)] border-t-current',
        className,
      )}
    />
  )
}

export function Button({
  as: Tag = 'button',
  variant,
  size,
  loading,
  result,
  resultSticky,
  icon,
  iconEnd,
  full,
  className,
  children,
  disabled,
  type,
  onClick,
  ...rest
}: ButtonProps) {
  const pending = loading === true || loading === 'immediate'
  const settled = useSettled(loading === true)
  const busy = loading === 'immediate' || settled
  const held = useHeldResult(result, { sticky: resultSticky })

  return (
    <Tag
      type={Tag === 'button' ? (type ?? 'button') : type}
      disabled={disabled}
      aria-busy={busy || undefined}
      data-pending={pending ? '' : undefined}
      data-result={held}
      className={cx(button({ variant, size, full }), className)}
      // Keyboard activation does not care about pointer-events, so the click
      // is swallowed here as well while a previous one is still in flight.
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (pending) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      {...rest}
    >
      {busy ? (
        <Spinner />
      ) : held === 'success' ? (
        <Icon className="text-success">{check}</Icon>
      ) : held === 'error' ? (
        <Icon className="text-danger">{x}</Icon>
      ) : (
        icon
      )}
      {children !== undefined && (
        <span className="min-w-0 truncate group-aria-busy/button:opacity-35">
          {children}
        </span>
      )}
      {iconEnd}
    </Tag>
  )
}
