import {
  Activity,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { cx } from '../util/cx'

/**
 * Open and close, light dismiss, Escape, focus return and top-layer stacking
 * all come from the platform's popover API. There is no state and no effect in
 * this component — the browser owns the behaviour and CSS anchor positioning
 * owns the placement. The one exception is `defer`, which has to know when the
 * popover opens; ask for it and you get a listener, otherwise you get markup.
 *
 *   const popover = usePopover()
 *   <Button {...popover.trigger}>Actions</Button>
 *   <Popover {...popover.content}><Menu>…</Menu></Popover>
 *
 * The trigger carries one keyboard handler, for the arrow keys that open a
 * menu — see Menu below for why that one is not optional. Spread the trigger
 * props last if you pass your own `onKeyDown`, or call ours from yours.
 */
export function usePopover() {
  const key = useId()
  // useId is only guaranteed to be unique and stable, never to be a legal CSS
  // identifier, and the format has changed between releases before. Anything
  // outside the ident grammar is dropped rather than replaced, so two ids
  // cannot collapse into one.
  const ident = key.replace(/[^\w-]/g, '')
  const id = `cx-popover-${ident}`
  const anchor = `--cx-anchor-${ident}`
  const style = { '--cx-anchor': anchor } as CSSProperties

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const content = document.getElementById(id)
    if (!content) return

    const items = menuItems(content)
    if (items.length === 0) return

    event.preventDefault()
    if (!content.matches(':popover-open')) content.showPopover()
    ;(event.key === 'ArrowDown' ? items[0] : items[items.length - 1])?.focus()
  }

  return {
    trigger: { popoverTarget: id, 'data-cx-anchor': '', style, onKeyDown },
    content: { id, style },
  } as const
}

export interface PopoverProps extends ComponentPropsWithoutRef<'div'> {
  /** Which edge the popover lines up with when there is room on both sides. */
  align?: 'start' | 'end'
  /**
   * `auto` closes on outside click and on Escape — right for menus and
   * inspectors. `manual` stays until dismissed explicitly.
   */
  mode?: 'auto' | 'manual'
  /**
   * Makes the popover at least as wide as its trigger, the way a select's
   * list matches its control. Read from the anchor in CSS via `anchor-size()`,
   * so nothing measures anything.
   */
  matchAnchor?: boolean
  /**
   * Keeps the content in a hidden `<Activity>` while the popover is closed —
   * for a panel heavy enough that building it costs a frame: a calendar is a
   * hundred nodes and forty-four buttons, per field, sitting in the document
   * whether or not anyone opens it. React pre-renders it at a lower priority
   * and holds its state across closes, so the first open is ready and the
   * second one is where the user left it.
   *
   * Opt-in, because it is the only thing here that costs a piece of state and
   * a listener. Without it this component is markup.
   */
  defer?: boolean
}

interface PopoverBoxProps extends Omit<PopoverProps, 'defer'> {
  boxRef?: RefObject<HTMLDivElement | null>
}

function PopoverBox({
  align = 'start',
  mode = 'auto',
  matchAnchor,
  boxRef,
  className,
  ...rest
}: PopoverBoxProps) {
  return (
    <div
      ref={boxRef}
      popover={mode}
      data-align={align}
      data-match={matchAnchor ? 'anchor' : undefined}
      className={cx(
        'cx-popover w-max overflow-auto overscroll-contain rounded-md border',
        'border-line bg-overlay text-fg shadow-popover',
        'max-w-[min(22rem,calc(100vw-2rem))]',
        className,
      )}
      {...rest}
    />
  )
}

function DeferredPopover({ children, ...rest }: Omit<PopoverProps, 'defer'>) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    // `beforetoggle` fires inside `showPopover()` rather than a task later, so
    // the content is switched on in the same frame the popover appears in.
    const onBeforeToggle = (event: Event) => {
      setOpen((event as unknown as { newState?: string }).newState === 'open')
    }
    node.addEventListener('beforetoggle', onBeforeToggle)
    return () => node.removeEventListener('beforetoggle', onBeforeToggle)
  }, [])

  return (
    <PopoverBox boxRef={ref} {...rest}>
      {/* Around the content, never around the popover itself: React hides with
          an inline `display: none !important`, which outranks the user-agent
          rule that shows an open popover — the thing would open in the top
          layer and paint nothing. */}
      <Activity mode={open ? 'visible' : 'hidden'}>{children}</Activity>
    </PopoverBox>
  )
}

export function Popover({ defer, ...rest }: PopoverProps) {
  return defer ? <DeferredPopover {...rest} /> : <PopoverBox {...rest} />
}

/* ── Menu — a list of actions inside a popover ─────────────────────────────*/

const MENU_ITEMS = '[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio]'

/** Enabled items, in DOM order. Read at the moment of the keypress, so items
    that appear or disappear between renders need no bookkeeping. */
function menuItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(MENU_ITEMS)).filter(
    (item) =>
      !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true',
  )
}

export interface MenuProps extends ComponentPropsWithoutRef<'div'> {}

/**
 * `role="menu"` is a promise that the arrow keys move between items, so the
 * promise is kept here. One delegated handler on the container does it for the
 * whole menu — the alternative, a handler per item, is the thing that makes
 * long menus expensive in other kits.
 *
 * Escape, closing on outside click and returning focus to the trigger stay the
 * browser's job; only the roving part is ours.
 */
export function Menu({ className, onKeyDown, ...rest }: MenuProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return

    const { key } = event
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') {
      return
    }

    const items = menuItems(event.currentTarget)
    if (items.length === 0) return
    event.preventDefault()

    const last = items.length - 1
    const from = items.indexOf(document.activeElement as HTMLElement)
    const down = key === 'ArrowDown'

    // Wraps at both ends, which is what the menu pattern asks for. `from < 0`
    // means focus is somewhere in the popover but not on an item yet, so the
    // first press lands on the end the key points at.
    let next: number
    if (key === 'Home') next = 0
    else if (key === 'End') next = last
    else if (from < 0) next = down ? 0 : last
    else if (down) next = from === last ? 0 : from + 1
    else next = from === 0 ? last : from - 1

    items[next]?.focus()
  }

  return (
    <div
      role="menu"
      className={cx('flex min-w-44 flex-col p-1', className)}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  )
}

export interface MenuItemProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'default' | 'danger'
  icon?: ReactNode
  /** Rendered right-aligned; keep it to a real keyboard shortcut. */
  shortcut?: string
}

const MENU_ITEM_BASE =
  'flex w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent ' +
  'px-2 py-[0.3rem] text-left text-ui whitespace-nowrap no-underline ' +
  'transition-colors duration-instant ease-snap focus-visible:bg-hover ' +
  'aria-checked:before:text-fg-accent aria-checked:before:content-["✓"]'

const MENU_ITEM_VARIANT = {
  default: 'text-fg hover:not-disabled:bg-hover active:not-disabled:bg-active',
  danger:
    'text-danger-fg hover:not-disabled:bg-danger-surface active:not-disabled:bg-danger-active',
} as const

export function MenuItem({
  variant = 'default',
  icon,
  shortcut,
  className,
  children,
  type,
  ...rest
}: MenuItemProps) {
  return (
    <button
      type={type ?? 'button'}
      role="menuitem"
      className={cx(MENU_ITEM_BASE, MENU_ITEM_VARIANT[variant], className)}
      {...rest}
    >
      {icon}
      {children}
      {shortcut && (
        <span className="ml-auto pl-4 font-mono text-micro text-fg-muted">
          {shortcut}
        </span>
      )}
    </button>
  )
}

export function MenuSeparator({ className, ...rest }: ComponentPropsWithoutRef<'hr'>) {
  return <hr className={cx('my-1 h-px border-0 bg-line', className)} {...rest} />
}

export function MenuLabel({ className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cx(
        'px-2 py-1 text-micro font-medium uppercase tracking-[0.04em] text-fg-muted',
        className,
      )}
      {...rest}
    />
  )
}
