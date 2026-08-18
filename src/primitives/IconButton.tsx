import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cva, cx } from '../util/cx'
import type { ControlSize } from './Button'

export interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  as?: ElementType
  /** Required: an icon-only control is unusable without an accessible name. */
  label: string
  icon: ReactNode
  variant?: 'quiet' | 'bordered' | 'danger'
  size?: ControlSize
  /** Shows the label as a tooltip on hover and keyboard focus. */
  tooltip?: boolean
  tooltipSide?: 'top' | 'bottom' | 'start' | 'end'
}

/* Square, so the height token sets both axes and the padding token is not
   wanted. The text size still travels: an icon sized in `em` grows with it. */
const iconButton = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-control border p-0',
    'cursor-pointer text-fg-secondary transition-colors duration-snap ease-snap',
    'aria-pressed:bg-selected aria-pressed:text-fg-accent',
  ],
  {
    variants: {
      variant: {
        quiet:
          'border-transparent hover:not-disabled:bg-hover hover:not-disabled:text-fg active:not-disabled:bg-active',
        bordered:
          'border-line-strong bg-raised hover:not-disabled:bg-hover hover:not-disabled:text-fg active:not-disabled:bg-active',
        danger:
          'border-transparent hover:not-disabled:bg-danger-surface hover:not-disabled:text-danger-fg active:not-disabled:bg-danger-active',
      },
      size: {
        sm: 'size-control-sm text-control-sm',
        md: 'size-control-md text-control-md',
        lg: 'size-control-lg text-control-lg',
      },
    },
    defaultVariants: { variant: 'quiet', size: 'md' },
  },
)

export function IconButton({
  as: Tag = 'button',
  label,
  icon,
  variant,
  size,
  tooltip,
  tooltipSide,
  className,
  type,
  ...rest
}: IconButtonProps) {
  return (
    <Tag
      type={Tag === 'button' ? (type ?? 'button') : type}
      aria-label={label}
      data-cx-tooltip={tooltip ? label : undefined}
      data-tooltip-side={tooltip && tooltipSide !== 'top' ? tooltipSide : undefined}
      className={cx(iconButton({ variant, size }), className)}
      {...rest}
    >
      {icon}
    </Tag>
  )
}
