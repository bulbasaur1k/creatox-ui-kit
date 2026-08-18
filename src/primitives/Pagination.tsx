import type { ReactNode } from 'react'
import { cx } from '../util/cx'
import { useLabels } from '../util/intl'
import { Button } from './Button'
import type { ControlSize } from './Button'

/* ── Pagination ────────────────────────────────────────────────────────────
   Numbered pages, with the range around the current one.

   Rendered as buttons by default and as links when `href` is given, because
   which one is right depends on whether the page is a place: a table that
   refetches in situ is a button, a catalogue someone shares the third page
   of is a link, and only the product knows which it is building.            */

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange?: (page: number) => void
  /** Turns the pages into links. Receives a 1-based page number. */
  href?: (page: number) => string
  /** How many pages to show on each side of the current one. */
  siblings?: number
  size?: ControlSize
  label?: string
  previousLabel?: ReactNode
  nextLabel?: ReactNode
  className?: string
}

const GAP = '…'

/**
 * The pages to render, with gaps where the run is broken. The window is a
 * fixed width so the control does not resize as it is paged through — a row
 * of buttons that shifts under the cursor is a row that gets misclicked.
 */
function pageRange(page: number, pageCount: number, siblings: number): (number | '…')[] {
  // First, last, current, its siblings, and the two gap markers.
  const slots = siblings * 2 + 5
  if (pageCount <= slots) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const start = Math.max(page - siblings, 1)
  const end = Math.min(page + siblings, pageCount)
  const gapBefore = start > 2
  const gapAfter = end < pageCount - 1

  // Near an edge there is no gap on that side, so the window grows into the
  // space the marker would have taken and the width stays put.
  if (!gapBefore) {
    const head = Array.from({ length: slots - 2 }, (_, index) => index + 1)
    return [...head, GAP, pageCount]
  }

  if (!gapAfter) {
    const tail = Array.from(
      { length: slots - 2 },
      (_, index) => pageCount - (slots - 3) + index,
    )
    return [1, GAP, ...tail]
  }

  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index)
  return [1, GAP, ...middle, GAP, pageCount]
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  href,
  siblings = 1,
  size = 'md',
  label,
  previousLabel = '‹',
  nextLabel = '›',
  className,
}: PaginationProps) {
  const labels = useLabels()
  if (pageCount <= 1) return null

  const pages = pageRange(page, pageCount, siblings)

  const step = (target: number) => ({
    ...(href ? { as: 'a' as const, href: href(target) } : {}),
    onClick: onPageChange ? () => onPageChange(target) : undefined,
  })

  return (
    <nav
      aria-label={label ?? labels.pagination}
      className={cx('flex items-center gap-1', className)}
    >
      <Button
        {...step(page - 1)}
        size={size}
        variant="quiet"
        disabled={page <= 1}
        aria-label={labels.previousPage}
      >
        {previousLabel}
      </Button>

      {pages.map((entry, index) =>
        entry === GAP ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-fg-muted select-none"
          >
            {GAP}
          </span>
        ) : (
          <Button
            key={entry}
            {...step(entry)}
            size={size}
            variant={entry === page ? 'primary' : 'quiet'}
            aria-current={entry === page ? 'page' : undefined}
            className="tabular-nums"
          >
            {entry}
          </Button>
        ),
      )}

      <Button
        {...step(page + 1)}
        size={size}
        variant="quiet"
        disabled={page >= pageCount}
        aria-label={labels.nextPage}
      >
        {nextLabel}
      </Button>
    </nav>
  )
}
