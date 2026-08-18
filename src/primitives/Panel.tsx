import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'

export interface PanelProps extends Omit<ComponentPropsWithoutRef<'aside'>, 'title'> {
  title?: ReactNode
  /** Actions for the panel itself: close, pin, open full view. */
  actions?: ReactNode
  footer?: ReactNode
  /**
   * `docked`  — a column inside Split. The default.
   * `overlay` — floats above the object, for inspecting a second object
   *             without leaving the first.
   * `auto`    — docked while there is room, overlay once there is not.
   */
  mode?: 'docked' | 'overlay' | 'auto'
  width?: string
}

/**
 * The contextual region. Prefer this over a modal for anything the user is
 * exploring rather than committing to — the object behind stays visible and
 * keeps its scroll position.
 */
export function Panel({
  title,
  actions,
  footer,
  mode = 'docked',
  width,
  className,
  children,
  style,
  ...rest
}: PanelProps) {
  return (
    <aside
      data-mode={mode}
      className={cx(
        'flex min-h-0 flex-col bg-raised text-fg',
        // Written out per mode rather than composed at runtime: Tailwind scans
        // source text, so a class name assembled from variables never ships.
        mode === 'overlay' &&
          'fixed inset-y-0 right-0 z-20 w-[min(var(--cx-panel-width,26rem),100vw)] border-l border-line shadow-overlay',
        mode === 'auto' &&
          '@max-medium/page:fixed @max-medium/page:inset-y-0 @max-medium/page:right-0 @max-medium/page:z-20 @max-medium/page:w-[min(var(--cx-panel-width,26rem),100vw)] @max-medium/page:border-l @max-medium/page:border-line @max-medium/page:shadow-overlay',
        className,
      )}
      style={vars({ '--cx-panel-width': width }, style)}
      {...rest}
    >
      {(title !== undefined || actions !== undefined) && (
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-3">
          {title !== undefined && (
            <h2 className="m-0 min-w-0 truncate text-ui font-semibold tracking-[-0.011em]">
              {title}
            </h2>
          )}
          {actions !== undefined && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </header>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>

      {footer !== undefined && (
        <div className="border-t border-line bg-subtle px-4 py-3">{footer}</div>
      )}
    </aside>
  )
}
