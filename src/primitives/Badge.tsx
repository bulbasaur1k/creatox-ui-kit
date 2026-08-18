import type { ComponentPropsWithoutRef } from 'react'
import { cva, cx } from '../util/cx'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: Tone
  /**
   * `solid` is a filled tint — the default.
   * `outline` is for counts and secondary facts that should not compete.
   */
  variant?: 'solid' | 'outline'
  /**
   * A pill is correct here: a badge is a compact label, which is exactly what
   * §21 reserves the full radius for.
   */
  shape?: 'pill' | 'square'
}

/* The one place in the kit where two props genuinely interact: a tone means
   a tint under `solid` and a border under `outline`. Written as compounds
   rather than as two parallel lookup tables picked between at render. */
const badge = cva(
  [
    'inline-flex shrink-0 items-center gap-1 px-[0.4rem] py-[0.05rem]',
    'text-micro font-medium leading-[1.5] whitespace-nowrap',
  ],
  {
    variants: {
      tone: {
        neutral: '',
        accent: '',
        success: '',
        warning: '',
        danger: '',
        info: '',
      },
      variant: {
        solid: 'border border-transparent',
        outline: 'border bg-transparent',
      },
      shape: { pill: 'rounded-full', square: 'rounded-sm' },
    },
    compoundVariants: [
      { variant: 'solid', tone: 'neutral', class: 'bg-neutral-surface text-neutral-fg' },
      { variant: 'solid', tone: 'accent', class: 'bg-accent-subtle text-fg-accent' },
      { variant: 'solid', tone: 'success', class: 'bg-success-surface text-success-fg' },
      { variant: 'solid', tone: 'warning', class: 'bg-warning-surface text-warning-fg' },
      { variant: 'solid', tone: 'danger', class: 'bg-danger-surface text-danger-fg' },
      { variant: 'solid', tone: 'info', class: 'bg-info-surface text-info-fg' },
      {
        variant: 'outline',
        tone: 'neutral',
        class: 'border-line-strong text-fg-secondary',
      },
      { variant: 'outline', tone: 'accent', class: 'border-accent text-fg-accent' },
      { variant: 'outline', tone: 'success', class: 'border-success text-success-fg' },
      { variant: 'outline', tone: 'warning', class: 'border-warning text-warning-fg' },
      { variant: 'outline', tone: 'danger', class: 'border-danger text-danger-fg' },
      { variant: 'outline', tone: 'info', class: 'border-info text-info-fg' },
    ],
    defaultVariants: { tone: 'neutral', variant: 'solid', shape: 'pill' },
  },
)

export function Badge({ tone, variant, shape, className, ...rest }: BadgeProps) {
  return <span className={cx(badge({ tone, variant, shape }), className)} {...rest} />
}
