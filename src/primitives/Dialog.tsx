import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'

export interface DialogProps extends Omit<
  ComponentPropsWithoutRef<'dialog'>,
  'title' | 'onClose'
> {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  width?: string
  /** Colours the title for destructive confirmations. */
  tone?: 'default' | 'danger'
  /**
   * `sheet` docks it to the bottom edge instead of centring it — the shape a
   * phone wants, because the controls end up under the thumb rather than
   * halfway up the screen. Still the same `<dialog>`: modality, focus and
   * Escape do not change with where it sits.
   */
  placement?: 'center' | 'sheet'
}

/**
 * A native modal <dialog>. Focus trapping, inertness of the page behind,
 * Escape and the backdrop are all the browser's job; the only JS here is the
 * call that opens it, because `showModal()` has no declarative equivalent.
 *
 * Reserved for irreversible actions, confirmation and short focused flows.
 * Exploring an object belongs in a Panel — §23.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  width,
  tone = 'default',
  placement = 'center',
  className,
  children,
  style,
  ...rest
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Per instance, not a constant: two mounted dialogs sharing one id would
  // point both `aria-labelledby` attributes at whichever heading came first.
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      data-placement={placement}
      className={cx(
        'cx-dialog overflow-visible border border-line p-0',
        'bg-overlay text-fg shadow-overlay',
        // A column, so the body scrolls and the dialog itself never grows past
        // its own maximum. `open:` and not a bare `flex`: a closed <dialog> is
        // hidden by `display: none` from the user-agent sheet, and a display
        // utility in the utilities layer would win against it — the dialog
        // would sit on the page while closed.
        'open:flex open:flex-col',
        placement === 'sheet'
          ? cx(
              // Pinned by an offset, not pushed by an auto margin. `mt-auto`
              // used to do it, and an auto margin is a leftover-space
              // calculation: the browser derives 611px of top margin from the
              // viewport height and the sheet's own height, and anything that
              // disturbs either — a taller sheet, a viewport resizing under
              // it, a margin resolving before the height settles — moves the
              // sheet. An explicit `bottom` states the answer instead.
              'top-auto m-0 mx-auto rounded-lg',
              // Lifted off the edge rather than flush against it. Flush is
              // what "docked" usually means and it is what the platforms do,
              // but against a rounded screen and a home indicator it reads as
              // the sheet having been cut off by the bezel. The safe-area
              // inset is the floor, not the whole value: it is zero on a
              // desktop, where a gap is still wanted.
              'bottom-[max(env(safe-area-inset-bottom),--spacing(3))]',
              // The same gap either side, so the sheet floats rather than
              // spanning edge to edge.
              'w-[min(var(--cx-dialog-width,32rem),calc(100vw-var(--spacing)*6))]',
              'max-h-[85dvh]',
            )
          : cx(
              'm-auto rounded-lg',
              'w-[min(var(--cx-dialog-width,30rem),calc(100vw-2rem))]',
              // `dvh`, not `vh`. On a phone `100vh` is the viewport with the
              // address bar retracted, so a dialog measured against it stands
              // taller than the screen actually showing and runs off the
              // bottom. `dvh` tracks what is visible right now.
              'max-h-[calc(100dvh-2rem)]',
            ),
        className,
      )}
      style={vars({ '--cx-dialog-width': width }, style)}
      {...rest}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h2
            id={titleId}
            className={cx(
              'm-0 text-title font-semibold tracking-[-0.011em]',
              tone === 'danger' ? 'text-danger-fg' : 'text-fg',
            )}
          >
            {title}
          </h2>
          {description !== undefined && (
            <p className="mb-0 mt-1 text-ui text-fg-secondary">{description}</p>
          )}
        </div>
      </div>

      {/* No height of its own. It used to cap at `60vh`, which is a share of
          the window rather than of the dialog — stacked on a header and a
          footer that measure separately, the three could add up to more than
          the dialog was allowed to be. Sized from its content instead, and
          shrunk by the cap on the dialog when there is more of it than fits.

          `flex-initial`, not `flex-1`, and the difference is the whole body
          on WebKit. A dialog's height is `fit-content` — the user agent's,
          and what makes a short dialog short — and against an indefinite
          height WebKit resolves a `flex-basis: 0` item to nothing: the body
          collapsed to its own padding, so a sheet showed its title, its
          description and a two-millimetre strip of the form, with the field
          and the buttons cut off below. Chromium measures the same markup
          from the content and never showed it. Sized from content and allowed
          to shrink, both engines agree. */}
      {children !== undefined && (
        <div className="min-h-0 flex-initial overflow-auto px-4 pb-4">{children}</div>
      )}

      {footer !== undefined && (
        <div
          className={cx(
            'flex shrink-0 items-center justify-end gap-2 border-t border-line bg-subtle px-4 py-3',
            // Both placements are rounded on all four corners now.
            'rounded-b-lg',
          )}
        >
          {footer}
        </div>
      )}
    </dialog>
  )
}
