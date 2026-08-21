import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SyntheticEvent as ReactSyntheticEvent,
} from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'
import { useLabels } from '../util/intl'
import { IconButton } from './IconButton'

/**
 * Three heights, and no fourth. The one it opens at is the caller's decision,
 * made from what is going into it, and it does not change afterwards:
 *
 *   peek — the sheet announces itself and nothing more. The object behind is
 *          still the thing being read; this is a summary and one action.
 *   half — the working height. Enough for a list to be scanned while what it
 *          belongs to stays on screen, which is the whole reason not to have
 *          navigated away.
 *   full — everything the sheet has. A strip of the page stays visible on
 *          purpose, so it never reads as a screen the user has moved to.
 *
 * There is deliberately no way for the user to resize it. A draggable sheet
 * has to measure itself and write a height back into layout at the rate the
 * display refreshes, and what it buys is a position nobody returns to — "the
 * height I left it at" is not something anyone remembers. Choosing the right
 * one of three as the sheet opens is the same decision, taken once, and it
 * costs nothing at runtime.
 */
export type SheetDetent = 'peek' | 'half' | 'full'

/**
 * How long the element says its own transition is, in milliseconds. Read
 * rather than repeated: the duration is a token, and a product that retimes
 * the sheet must not have to retime a constant in here to match.
 */
function longestDuration(element: Element): number {
  const declared = getComputedStyle(element).transitionDuration
  let longest = 0
  for (const part of declared.split(',')) {
    const value = Number.parseFloat(part)
    if (Number.isNaN(value)) continue
    longest = Math.max(longest, part.includes('ms') ? value : value * 1000)
  }
  return longest
}

export interface SheetProps extends Omit<
  ComponentPropsWithoutRef<'dialog'>,
  'title' | 'onClose'
> {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  /**
   * How much of the screen it takes, chosen from what is going in: a summary
   * is `peek`, a list is `half`, a form or a long list is `full`. The product
   * may change it while the sheet is open; the user has no grip to drag.
   */
  detent?: SheetDetent
  /**
   * The sheet can be closed: the handle and the cross in the header both do
   * it, as does a click on the backdrop. Escape is the browser's and stays
   * either way. Off for a sheet the flow may not be abandoned in.
   */
  dismissible?: boolean
  /** Caps the width on a desktop, where edge to edge would be absurd. */
  width?: string
}

/**
 * A bottom sheet: the same native modal <dialog> as `Dialog`, docked to the
 * bottom edge at one of three heights. Focus, inertness, Escape and the
 * backdrop are the browser's; the height is a custom property picked by an
 * attribute. Nothing here observes, measures or recomputes anything — opening
 * it costs one `showModal()`, and the travel is a CSS transition.
 *
 * Reach for it when the second thing needs to be worked on without the first
 * one leaving — filters over a list, a record under a map, a compose box.
 * A confirmation is a `Dialog`; a region that stays put is a `Panel` (§23).
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  detent = 'half',
  dismissible = true,
  width,
  className,
  children,
  style,
  ...rest
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const labels = useLabels()

  /* The height a closing sheet keeps is the one it had. Products hold the
     stop and the openness in the same piece of state — `open={picked !== null}
     detent={picked ?? 'half'}` is the obvious way to write it — so releasing
     that state hands this component a different stop on the very frame the
     sheet starts leaving. The height does not animate, by design, so it
     arrives as a jump: a peek sheet snaps to half its screen and only then
     slides away.

     Remembering the last stop while open costs a ref and no render. Reading
     the prop instead would mean asking every product to keep a value alive
     for the length of an animation it does not know about. */
  const lastDetent = useRef(detent)
  if (open) lastDetent.current = detent
  const shownDetent = open ? detent : lastDetent.current

  /* ── Opening, and leaving ────────────────────────────────────────────────
     Arriving is one call. Leaving is not, and the reason is `close()`: it
     takes the element out of the top layer on the spot, so whatever the
     stylesheet says about the way out never gets a frame to run in. The
     platform's answer is the `overlay` property — transition it with
     `allow-discrete` and the browser defers the removal until the animation
     is done — and Chromium is the only engine that implements it. In Safari
     and Firefox the sheet is simply gone on the frame it is closed, which is
     exactly what "it disappears" looks like.

     So the exit plays while the dialog is still open. `data-closing` slides
     the sheet back off the bottom edge, the transition runs, and the real
     `close()` lands at the end of it, when there is nothing left on screen to
     remove.
     One attribute and one listener, both alive for the length of the
     animation and gone after it.                                            */
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open) {
      // Reopened mid-exit: drop the closing state and let the same slide
      // carry the sheet back up from wherever it had got to.
      delete dialog.dataset.closing
      if (!dialog.open) dialog.showModal()
      return
    }

    if (!dialog.open) return
    dialog.dataset.closing = 'true'

    let closed = false
    const finish = () => {
      if (closed) return
      closed = true
      delete dialog.dataset.closing
      if (dialog.open) dialog.close()
    }

    // Only the sheet's own slide counts. Transitions bubble, and the content
    // inside is full of things that fade and recolour on their own.
    const onEnd = (event: TransitionEvent) => {
      if (event.target === dialog && event.propertyName === 'translate') finish()
    }
    dialog.addEventListener('transitionend', onEnd)

    // Nothing guarantees a transition ran at all: reduced motion cuts it to a
    // millisecond, a product may have switched it off, a tab in the
    // background never gets the frames. The timer is what makes the sheet
    // closeable in all three cases, and it is why the duration is read off
    // the element rather than repeated here.
    const timer = setTimeout(finish, longestDuration(dialog) + 50)

    return () => {
      dialog.removeEventListener('transitionend', onEnd)
      clearTimeout(timer)
    }
  }, [open])

  // Escape closes a dialog natively, and natively means instantly — same
  // problem as `close()`, and the same answer: take the key, hand it to the
  // product, and let the exit above play on the way back.
  const onCancel = (event: ReactSyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    onClose()
  }

  // The backdrop is part of the dialog element, so a click that lands on the
  // element itself landed outside the sheet. Everything the sheet draws is in
  // a child, which is what makes the test hold.
  const onBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (dismissible && event.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onCancel}
      onClick={onBackdropClick}
      aria-labelledby={titleId}
      data-detent={shownDetent}
      className={cx(
        'cx-sheet border border-line p-0',
        'bg-overlay text-fg shadow-overlay',
        // Same reason as `Dialog`: a closed <dialog> is `display: none` from
        // the user-agent sheet, and a bare `flex` would win against it.
        'open:flex open:flex-col',
        // Flush with the bottom edge, rounded only where it meets the page.
        // The heights are shares of the viewport, and a sheet floating clear
        // of the edge would make every one of them a lie by the size of the
        // gap.
        'inset-x-0 bottom-0 top-auto m-0 mx-auto rounded-t-xl rounded-b-none',
        'w-[min(var(--cx-sheet-width,40rem),100vw)] max-w-none',
        // Clipped, because the sheet spends its arrival and its exit shorter
        // than what is inside it. Without this the header hangs out over the
        // page below while the sheet is still on its way.
        'overflow-hidden',
        className,
      )}
      style={vars({ '--cx-sheet-width': width }, style)}
      {...rest}
    >
      <div className="shrink-0">
        {dismissible && (
          <div className="flex justify-center pb-1 pt-2">
            {/* The grip is what a thumb goes for, so it closes: the action a
                sheet is expected to answer, arriving as a press rather than a
                downward swipe the browser has already spoken for.

                Not a button, and hidden from assistive technology. It is the
                same action as the cross beside the title, so announcing it
                would describe two controls where there is one — and a modal
                dialog hands focus to the first focusable thing inside it,
                which as a button this was: the sheet would open with the
                caret on an element that is not in the accessibility tree.
                The cross is the control. This is the target under the thumb. */}
            <div
              aria-hidden="true"
              onClick={onClose}
              className="group flex h-6 w-16 cursor-pointer items-center justify-center rounded-control"
            >
              {/* Colour and a width, both on an element with nothing under it
                  — the press has to be answered inside the frame the finger
                  is still down, or it reads as lag rather than as feedback. */}
              <span
                className={cx(
                  'h-1 w-9 rounded-full bg-line-strong',
                  'transition-[width,background-color] duration-instant ease-snap',
                  'group-hover:bg-fg-muted group-active:w-11 group-active:bg-fg-muted',
                )}
              />
            </div>
          </div>
        )}

        <div
          className={cx(
            'flex items-start justify-between gap-4 px-4 pb-3',
            // With no handle above it, the title needs the room itself.
            dismissible ? 'pt-0' : 'pt-4',
          )}
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="m-0 truncate text-title font-semibold tracking-[-0.011em]"
            >
              {title}
            </h2>
            {description !== undefined && (
              <p className="mb-0 mt-1 text-ui text-fg-secondary">{description}</p>
            )}
          </div>
          {dismissible && (
            <IconButton
              label={labels.dismiss}
              onClick={onClose}
              icon={
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {children !== undefined && (
        /* Focus opens here, not on the cross. A modal dialog hands focus to
           its first focusable element, which is the dismiss button in the
           header — and the browser, having moved focus itself, paints the
           focus ring on it. A sheet that opens with a ringed cross looks like
           it is asking to be closed. The body is where reading starts and
           where arrow keys should scroll, so it takes the focus instead; it
           is not in the tab order, and `base.css` keeps it unringed. */
        <div
          tabIndex={-1}
          autoFocus
          className={cx(
            'cx-sheet-body min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-4',
            // The inset only matters when there is no footer under it; with
            // one, the footer carries it instead.
            footer === undefined && 'pb-[max(env(safe-area-inset-bottom),--spacing(4))]',
          )}
        >
          {children}
        </div>
      )}

      {footer !== undefined && (
        <div
          className={cx(
            'flex shrink-0 items-center justify-end gap-2 border-t border-line bg-subtle px-4 py-3',
            'pb-[max(env(safe-area-inset-bottom),--spacing(3))]',
          )}
        >
          {footer}
        </div>
      )}
    </dialog>
  )
}
