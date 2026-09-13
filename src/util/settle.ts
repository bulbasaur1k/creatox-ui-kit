import { useEffect, useRef, useState } from 'react'

/* ── Settling a pending flag ───────────────────────────────────────────────
   A request that answers in ninety milliseconds must not show a spinner: the
   spinner would appear and vanish inside three frames, which reads as a
   glitch, not as progress. And a spinner that did appear must stay long
   enough to be seen as one — a flash of it is worse than none.

   So a raw `pending` goes through two timers before it reaches the screen.
   It is shown only after `delay` has passed with the flag still up, and once
   shown it is held for at least `minDuration`, however quickly the answer
   arrives after that. Below about a hundred milliseconds nothing is shown at
   all — the change in the content is the feedback, and it needs no herald.

   The numbers are properties of perception, not of a product, which is why
   they live here with the other timings rather than in every model. What
   counts as pending — a query, a mutation, a store — is the product's, and
   arrives as the plain boolean it already has.                             */

export interface SettleOptions {
  /** How long the flag must stay up before anything is shown. */
  delay?: number
  /** Once shown, how long it stays up at the least. */
  minDuration?: number
}

export const SETTLE_DELAY = 150
export const SETTLE_MIN_DURATION = 400

/**
 * The visible version of a pending flag: late to appear, reluctant to leave.
 * `pending` is the raw signal; the return value is what to draw.
 */
export function useSettled(
  pending: boolean,
  { delay = SETTLE_DELAY, minDuration = SETTLE_MIN_DURATION }: SettleOptions = {},
): boolean {
  const [shown, setShown] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (pending) {
      if (shown) return
      const timer = setTimeout(() => {
        shownAt.current = Date.now()
        setShown(true)
      }, delay)
      return () => clearTimeout(timer)
    }
    if (!shown) return
    const remaining = shownAt.current + minDuration - Date.now()
    if (remaining <= 0) {
      setShown(false)
      return
    }
    const timer = setTimeout(() => setShown(false), remaining)
    return () => clearTimeout(timer)
  }, [pending, shown, delay, minDuration])

  return shown
}

/**
 * How long a result — a tick after a save, a cross after a failure — stays
 * on a control before it goes back to being a control. Long enough to be
 * read, short enough that the button is itself again before the hand
 * reaches for it.
 */
export const RESULT_HOLD = 1400

/**
 * A transient result. Whenever `result` takes a value it is returned for
 * `hold` milliseconds and then dropped, even if the prop is still set: the
 * product marks the moment, the kit decides how long the moment lasts. Set
 * `sticky` to keep it — for one-shot actions that should not be repeated.
 */
export function useHeldResult<R>(
  result: R | undefined,
  { hold = RESULT_HOLD, sticky = false }: { hold?: number; sticky?: boolean } = {},
): R | undefined {
  const [held, setHeld] = useState<R | undefined>(result)

  useEffect(() => {
    setHeld(result)
    if (result === undefined || sticky) return
    const timer = setTimeout(() => setHeld(undefined), hold)
    return () => clearTimeout(timer)
  }, [result, hold, sticky])

  return held
}
