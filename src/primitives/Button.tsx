import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cva, cx } from '../util/cx'

export type ButtonVariant = 'default' | 'primary' | 'quiet' | 'danger'
export type ControlSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  as?: ElementType
  variant?: ButtonVariant
  size?: ControlSize
  /** Keeps the label in place so the button does not resize while working. */
  loading?: boolean
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
    'aria-busy:pointer-events-none aria-busy:cursor-progress',
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
  icon,
  iconEnd,
  full,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  return (
    <Tag
      type={Tag === 'button' ? (type ?? 'button') : type}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={cx(button({ variant, size, full }), className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children !== undefined && (
        <span className="min-w-0 truncate group-aria-busy/button:opacity-35">
          {children}
        </span>
      )}
      {iconEnd}
    </Tag>
  )
}
