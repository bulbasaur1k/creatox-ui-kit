import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { cva, cx } from '../util/cx'
import { useLabels } from '../util/intl'
import { IconButton } from './IconButton'

/* ── Toast ─────────────────────────────────────────────────────────────────
   A message about something that already happened, raised from wherever it
   happened rather than passed down as a prop.

   This is the one component in the kit with a store, and it earns it: the
   code that needs to say "saved" is a mutation somewhere in the product, not
   a component with a place in the tree to render into. So the store is a
   module — a list, a set of subscribers and `useSyncExternalStore` — and the
   only component is the region that renders it.

   The region is a manual popover, which is what puts it in the top layer. A
   toast raised while a modal `<dialog>` is open would otherwise be painted
   behind it: the top layer beats every z-index, so nothing but the top layer
   can sit above something already in it.

   Reserve it for what it is for. A message the user has to act on is a
   Dialog; a message about the form in front of them belongs beside the field
   that caused it, where they are already looking.                           */

export type ToastTone = 'default' | 'success' | 'warning' | 'danger'

export interface ToastOptions {
  title: ReactNode
  description?: ReactNode
  tone?: ToastTone
  /** Milliseconds. `0` keeps it up until dismissed. */
  duration?: number
  /** A single control — "Undo", "View". More than one belongs in a Dialog. */
  action?: ReactNode
}

export interface ToastItem extends ToastOptions {
  id: string
  tone: ToastTone
}

const EMPTY: readonly ToastItem[] = []

let items: readonly ToastItem[] = EMPTY
let counter = 0
const listeners = new Set<() => void>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): readonly ToastItem[] {
  return items
}

/** Nothing has been raised during a server render, and nothing can be. */
function getServerSnapshot(): readonly ToastItem[] {
  return EMPTY
}

/** Raises a toast. Returns its id, so it can be dismissed early. */
export function toast(options: ToastOptions): string {
  const id = `cx-toast-${++counter}`
  const item: ToastItem = { tone: 'default', ...options, id }
  items = [...items, item]
  emit()

  const duration = options.duration ?? 5000
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration),
    )
  }

  return id
}

/** Dismisses one toast, or all of them when called without an id. */
export function dismissToast(id?: string): void {
  if (id === undefined) {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    items = EMPTY
  } else {
    const timer = timers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.delete(id)
    }
    items = items.filter((item) => item.id !== id)
  }
  emit()
}

const toastItem = cva(
  [
    'cx-toast pointer-events-auto flex items-start gap-3 rounded-lg border',
    'px-3 py-2.5 shadow-overlay',
  ],
  {
    variants: {
      tone: {
        default: 'border-line bg-overlay text-fg',
        success: 'border-success bg-success-surface text-success-fg',
        warning: 'border-warning bg-warning-surface text-warning-fg',
        danger: 'border-danger bg-danger-surface text-danger-fg',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

export interface ToasterProps {
  /** Bottom on a phone, where the thumb is; top on a desktop, out of the way. */
  placement?: 'bottom-end' | 'bottom-center' | 'top-end' | 'top-center'
  className?: string
}

/** Render once, near the root. Everything else reaches it through `toast()`. */
export function Toaster({ placement = 'bottom-end', className }: ToasterProps) {
  const labels = useLabels()
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    // Where the popover API is missing the region is a plain fixed element:
    // the attribute means nothing to the engine, so nothing hides it.
    if (!node || typeof node.showPopover !== 'function') return
    node.showPopover()
    return () => {
      node.hidePopover()
    }
  }, [])

  return (
    <div
      ref={ref}
      popover="manual"
      data-placement={placement}
      className={cx('cx-toaster', className)}
    >
      {/* Announced by the region, so a toast raised while focus is elsewhere
          is still heard. Polite: it reports, it does not interrupt. */}
      <ol
        aria-live="polite"
        aria-atomic="false"
        className="m-0 flex list-none flex-col gap-2 p-0"
      >
        {current.map((item) => (
          <li key={item.id} className={toastItem({ tone: item.tone })}>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-ui font-medium">{item.title}</p>
              {item.description !== undefined && (
                <p className="m-0 mt-0.5 text-meta opacity-80">{item.description}</p>
              )}
            </div>
            {item.action}
            <IconButton
              label={labels.dismiss}
              size="sm"
              onClick={() => dismissToast(item.id)}
              icon={<span aria-hidden="true">×</span>}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}
