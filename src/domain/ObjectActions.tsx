import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import { IconButton } from '../primitives/IconButton'
import { Menu, Popover, usePopover } from '../primitives/Popover'

export interface ObjectActionsProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * The one or two actions a user reaches for most often on this object.
   * They stay visible; everything else goes behind the overflow menu.
   */
  primary?: ReactNode
  /** Rendered inside the overflow menu. Use MenuItem / MenuSeparator. */
  overflow?: ReactNode
  overflowLabel?: string
}

/**
 * The action set for an object. Frequent actions are immediately available;
 * the rest are one click away rather than crowding the header — §10.
 *
 * The overflow menu is a native popover: no open state, no outside-click
 * handler, no Escape listener.
 */
export function ObjectActions({
  primary,
  overflow,
  overflowLabel = 'More actions',
  className,
  ...rest
}: ObjectActionsProps) {
  const popover = usePopover()

  return (
    <div className={cx('flex shrink-0 items-center gap-2', className)} {...rest}>
      {primary}

      {overflow !== undefined && (
        <>
          <IconButton
            label={overflowLabel}
            tooltip
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                <circle cx="12" cy="5" r="1.4" fill="currentColor" />
                <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                <circle cx="12" cy="19" r="1.4" fill="currentColor" />
              </svg>
            }
            {...popover.trigger}
          />
          <Popover align="end" {...popover.content}>
            <Menu>{overflow}</Menu>
          </Popover>
        </>
      )}
    </div>
  )
}
