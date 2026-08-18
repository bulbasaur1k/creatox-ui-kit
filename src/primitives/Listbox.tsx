import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { cx } from '../util/cx'
import { CONTROL_ROW, CONTROL_SURFACE, useControlSize } from './Field'
import { useLabels } from '../util/intl'
import type { ControlSize } from './Button'

/* ── Drawn lists ───────────────────────────────────────────────────────────
   `Select` and `Combobox`, neither of them native.

   The native controls were the obvious choice and they were the wrong one.
   A `<select>` popup is a different list on every platform, takes no styling
   inside it, and can hold nothing but a string — so an option with a line of
   explanation under it, which is what a settings form actually needs, is not
   expressible. `<datalist>` is worse: three engines, three behaviours, and
   Safari drops it on some input types without a word.

   What is kept from the platform is everything that is genuinely hard. The
   list is a `[popover]`, so the top layer, light dismiss and Escape are the
   browser's, and it cannot be clipped by a scrolling ancestor — which is what
   sinks most hand-built dropdowns inside a panel. CSS anchor positioning
   places it. What is left here is the part that was always going to be code:
   which option is active, and what the arrow keys do to it.

   Focus never leaves the trigger. `aria-activedescendant` names the active
   option instead, which is what the pattern asks for and what keeps Escape,
   Tab and typing working without a focus trap.                              */

export interface ListboxOption<T extends string = string> {
  value: T
  label: ReactNode
  /** A second line under the label: what the option means, not what it says. */
  description?: ReactNode
  disabled?: boolean
  /** Not selectable — a heading over the options that follow it. */
  heading?: boolean
  /** What typeahead and filtering match on. Defaults to a string label. */
  search?: string
}

const CHEVRON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0 opacity-60">
    <path
      d="M6 9l6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0">
    <path
      d="M5 13l4 4L19 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Where the chevron sits, matched to the field padding of each row size. */
const CHEVRON_INSET: Record<ControlSize, string> = {
  sm: 'right-field-sm',
  md: 'right-field-md',
  lg: 'right-field-lg',
}

/**
 * How many matches a `Combobox` draws. Every rendered row is one React
 * rebuilds on every keystroke — two thousand of them cost 70ms a character,
 * against 19ms for fifty — and a list nobody scrolls to the end of is not
 * worth the frame. Past the cap the list says so and the next letter narrows
 * it.
 */
const MATCH_CAP = 100

/* Nothing in the row is conditional, so the merge runs once for the module
   rather than once per option — a hundred rows, a hundred calls, on every
   keystroke. Measured at about a microsecond each: not the difference between
   fast and slow, but free to not spend. */
const OPTION_ROW = cx(
  'flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5',
  'text-control-md text-fg',
  'data-active:bg-hover aria-disabled:cursor-not-allowed',
  'aria-disabled:text-fg-muted aria-disabled:data-active:bg-transparent',
)

/** The text an option matches on, for typeahead and for filtering. */
function searchText(option: ListboxOption): string {
  if (option.search !== undefined) return option.search.toLowerCase()
  if (typeof option.label === 'string') return option.label.toLowerCase()
  return option.value.toLowerCase()
}

/**
 * `<option>` children are still accepted, and read into the same shape the
 * `options` prop takes. Existing forms keep the markup they had; only what
 * gets painted changed.
 */
function optionsFromChildren(children: ReactNode): ListboxOption[] {
  const out: ListboxOption[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = child.props as {
      value?: string
      label?: string
      disabled?: boolean
      children?: ReactNode
    }

    if (child.type === 'optgroup') {
      out.push({ value: `__group-${out.length}`, label: props.label, heading: true })
      out.push(...optionsFromChildren(props.children))
      return
    }

    if (child.type === 'option') {
      const label = props.children ?? props.value ?? ''
      out.push({
        value: String(props.value ?? (typeof label === 'string' ? label : '')),
        label,
        disabled: props.disabled,
      })
    }
  })

  return out
}

/** `useId` is unique and stable, never guaranteed to be a legal CSS
    identifier. Anything outside the ident grammar is dropped rather than
    replaced, so two ids cannot collapse into one. */
function useIdent(): string {
  return useId().replace(/[^\w-]/g, '')
}

/** The DOM types have not caught up with the argument yet. */
type ShowPopover = (options?: { source?: HTMLElement }) => void

/**
 * A popover element the component drives itself rather than through
 * `popovertarget`: the trigger has to stay open while the arrow keys move
 * through the list, and toggling on every interaction would fight that.
 *
 * `showPopover({ source })` is what names the trigger as the invoker, and it
 * is not decoration: without it the browser has no idea the two elements
 * belong together, so a press on the trigger counts as a press outside the
 * popover and light-dismisses the list the user is working in. The
 * `popovertarget` attribute does not establish it either — on an
 * `<input type="text">` it is inert, because only buttons are valid invokers.
 */
function usePopoverList(ident: string, onOpen?: () => void) {
  const listId = `cx-listbox-${ident}`
  const anchorStyle = { '--cx-anchor': `--cx-anchor-${ident}` } as CSSProperties
  const ref = useRef<HTMLDivElement>(null)

  // Two readings of the same fact, and both are needed. The DOM is the truth
  // a key handler needs, because it has to know whether the list is open
  // before React has re-rendered anything. `expanded` is the truth the markup
  // needs: `aria-expanded` is an attribute, so it can only follow state, and
  // reading the DOM during render would leave it stuck on its initial value.
  const [expanded, setExpanded] = useState(false)

  // The callback lives in a ref so the subscription below can keep empty
  // deps. Re-subscribing on every render is how a popover turns into a
  // listener leak, and the leak only shows up on the tenth open, not the
  // first.
  const opened = useRef(onOpen)
  opened.current = onOpen

  useEffect(() => {
    const node = ref.current
    if (!node) return
    // `beforetoggle`, not `toggle`: it fires synchronously inside
    // `showPopover()`, so `aria-expanded` and the active option land in the
    // same frame as the list. `toggle` arrives a task later and leaves the
    // attribute misreporting the control in between.
    const onBeforeToggle = (event: Event) => {
      const open = (event as unknown as { newState?: string }).newState === 'open'
      setExpanded(open)
      if (open) opened.current?.()
    }
    node.addEventListener('beforetoggle', onBeforeToggle)
    return () => node.removeEventListener('beforetoggle', onBeforeToggle)
  }, [])

  const isOpen = () => {
    const node = ref.current
    return (
      node !== null &&
      typeof node.hidePopover === 'function' &&
      node.matches(':popover-open')
    )
  }

  return {
    listId,
    anchorStyle,
    ref,
    expanded,
    isOpen,
    open(source?: HTMLElement | null) {
      const node = ref.current
      if (!node || typeof node.showPopover !== 'function' || isOpen()) return
      ;(node.showPopover as ShowPopover)(source ? { source } : undefined)
    },
    close() {
      const node = ref.current
      if (node && isOpen()) node.hidePopover()
    },
  }
}

/**
 * The active option, moved by attribute rather than by render.
 *
 * Which option is active changes on every arrow key, and holding that in
 * React state means rebuilding the whole list to repaint one row: measured at
 * 22–34ms a keypress on two thousand options, against 1ms on ten. So the
 * index lives in a ref and the two things that depend on it — `data-active`
 * on the row, `aria-activedescendant` on the trigger — are written straight
 * onto the DOM. React is left out of a loop it has nothing to contribute to.
 */
function useActiveOption(listId: string) {
  const index = useRef(0)
  const trigger = useRef<HTMLElement | null>(null)
  const box = useRef<HTMLDivElement>(null)

  /** Writes the current index onto the DOM. Cheap enough to run after every
      commit, which is what carries the highlight through a re-filtered list. */
  const apply = () => {
    const root = box.current
    if (!root) return

    const id = `${listId}-opt-${index.current}`
    const next = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    for (const stale of root.querySelectorAll('[data-active]')) {
      if (stale !== next) stale.removeAttribute('data-active')
    }

    if (!next) {
      // Nothing matched the filter, or the index landed on a heading, which
      // carries no id. A reference to an element that is not there is worse
      // than no reference: a screen reader reads the last thing it knew.
      trigger.current?.removeAttribute('aria-activedescendant')
      return
    }

    next.setAttribute('data-active', '')
    trigger.current?.setAttribute('aria-activedescendant', id)
    // Focus stays on the trigger, so the browser does not keep the active row
    // on screen the way it would for a focused element.
    next.scrollIntoView({ block: 'nearest' })
  }

  const clear = () => {
    trigger.current?.removeAttribute('aria-activedescendant')
    for (const stale of box.current?.querySelectorAll('[data-active]') ?? []) {
      stale.removeAttribute('data-active')
    }
  }

  return {
    index,
    trigger,
    box,
    apply,
    clear,
    /** Reading the ref rather than a closed-over value, so several key events
        arriving before React has re-rendered still count one after another. */
    at: () => index.current,
    set(next: number) {
      index.current = next
      apply()
    },
  }
}

/** Steps to the next option that can actually be chosen. */
function nextEnabled(options: ListboxOption[], from: number, step: number): number {
  const usable = (index: number) =>
    options[index] !== undefined && !options[index]!.disabled && !options[index]!.heading

  for (let i = from + step; i >= 0 && i < options.length; i += step) {
    if (usable(i)) return i
  }
  // Wrap, so holding the arrow key at the end of a short list is not a dead
  // stop the user has to notice and reverse out of.
  for (
    let i = step > 0 ? 0 : options.length - 1;
    i >= 0 && i < options.length;
    i += step
  ) {
    if (usable(i)) return i
  }
  return from
}

interface OptionListProps {
  options: ListboxOption[]
  listId: string
  boxRef: RefObject<HTMLDivElement | null>
  selectedValue?: string
  onPick: (index: number) => void
  onHover: (index: number) => void
  empty?: ReactNode
  /** Says the list was cut short, when it was. */
  note?: ReactNode
}

function OptionList({
  options,
  listId,
  boxRef,
  selectedValue,
  onPick,
  onHover,
  empty,
  note,
}: OptionListProps) {
  const labels = useLabels()

  return (
    // Its own id, not the popover's: `popovertarget` already claims that one,
    // and `aria-controls` has to name the list itself. The element stays put
    // when there is nothing in it, so the reference never dangles.
    <div
      ref={boxRef}
      role="listbox"
      id={`${listId}-box`}
      className="max-h-72 overflow-auto p-1"
    >
      {options.length === 0 && (
        <div className="px-2 py-1.5 text-meta text-fg-muted">{empty ?? labels.empty}</div>
      )}
      {options.map((option, index) =>
        option.heading ? (
          <div
            key={`${option.value}-${index}`}
            role="presentation"
            className="px-2 pt-2 pb-1 text-micro font-medium tracking-wide text-fg-muted uppercase"
          >
            {option.label}
          </div>
        ) : (
          <div
            key={`${option.value}-${index}`}
            id={`${listId}-opt-${index}`}
            role="option"
            aria-selected={option.value === selectedValue}
            aria-disabled={option.disabled || undefined}
            // `data-active` is deliberately not rendered: it is written onto
            // the element by `useActiveOption`, so moving through the list
            // costs one attribute rather than a rebuild of every row.
            //
            // Pointer, not click: the popover light-dismisses on a pointer
            // press elsewhere, and by the time a click event lands the list
            // may already be gone.
            onPointerDown={(event) => {
              event.preventDefault()
              if (!option.disabled) onPick(index)
            }}
            onPointerEnter={() => {
              if (!option.disabled) onHover(index)
            }}
            className={OPTION_ROW}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{option.label}</span>
              {option.description !== undefined && (
                <span className="block truncate text-meta text-fg-muted">
                  {option.description}
                </span>
              )}
            </span>
            {option.value === selectedValue && CHECK}
          </div>
        ),
      )}
      {note !== undefined && (
        <div
          role="presentation"
          className="border-t border-line px-2 py-1.5 text-meta text-fg-muted"
        >
          {note}
        </div>
      )}
    </div>
  )
}

/* ── Select ────────────────────────────────────────────────────────────────*/

export interface SelectProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'value' | 'defaultValue' | 'onChange' | 'children'
> {
  /** Either this, or `<option>` children — both read into the same list. */
  options?: readonly ListboxOption[]
  children?: ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /**
   * Shown while nothing is chosen. Passing one is also what says the field
   * starts empty: without it an uncontrolled select settles on its first
   * option, the way a native one does, so existing forms keep submitting the
   * same value they always did.
   */
  placeholder?: ReactNode
  controlSize?: ControlSize
  /** Submitted with the form. */
  name?: string
  invalid?: boolean
}

export function Select({
  options,
  children,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  controlSize,
  name,
  invalid,
  className,
  disabled,
  ...rest
}: SelectProps) {
  const size = useControlSize(controlSize)
  const labels = useLabels()

  const items = useMemo(
    () => (options ? [...options] : optionsFromChildren(children)),
    [options, children],
  )

  const [uncontrolled, setUncontrolled] = useState(
    () =>
      defaultValue ??
      (placeholder === undefined
        ? items.find((option) => !option.disabled && !option.heading)?.value
        : undefined),
  )
  const current = value ?? uncontrolled
  const selectedIndex = items.findIndex((option) => option.value === current)
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined

  const ident = useIdent()
  const active = useActiveOption(`cx-listbox-${ident}`)

  // Set by the paths that have already decided where the list should open —
  // the arrow keys, typeahead. A click goes through the browser's invoker
  // instead, and then the list has to open on the current selection: without
  // this it opens wherever it was left, and Enter commits an option the
  // trigger is not showing.
  const chosen = useRef(false)

  const list = usePopoverList(ident, () => {
    if (!chosen.current) {
      active.index.current =
        selectedIndex >= 0 ? selectedIndex : nextEnabled(items, -1, 1)
    }
    chosen.current = false
    active.apply()
  })

  // The list is rebuilt by React on every render; the highlight is not part
  // of that render, so it is put back afterwards.
  useEffect(() => {
    if (list.expanded) active.apply()
    else active.clear()
  })

  // Typeahead, the behaviour a native select has and a drawn one is expected
  // to keep: typing "pro" lands on "production" without opening anything.
  const typed = useRef({ buffer: '', at: 0 })

  const commit = (index: number) => {
    const option = items[index]
    if (!option || option.disabled || option.heading) return
    if (value === undefined) setUncontrolled(option.value)
    onValueChange?.(option.value)
    active.index.current = index
    list.close()
  }

  const openWith = (index: number) => {
    chosen.current = true
    active.index.current = index
    list.open(active.trigger.current)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const open = list.isOpen()

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        if (!open)
          openWith(nextEnabled(items, selectedIndex >= 0 ? selectedIndex : -1, step))
        else active.set(nextEnabled(items, active.at(), step))
        return
      }
      case 'Home':
      case 'End': {
        if (!open) return
        event.preventDefault()
        active.set(
          event.key === 'Home'
            ? nextEnabled(items, -1, 1)
            : nextEnabled(items, items.length, -1),
        )
        return
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()
        if (open) commit(active.at())
        else openWith(selectedIndex >= 0 ? selectedIndex : nextEnabled(items, -1, 1))
        return
      }
      case 'Escape': {
        if (open) {
          event.preventDefault()
          list.close()
        }
        return
      }
      case 'Tab': {
        list.close()
        return
      }
    }

    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return

    // A pause resets the buffer, so "pp" is two attempts at P rather than a
    // search for a literal "pp".
    const now = event.timeStamp
    typed.current.buffer =
      now - typed.current.at > 700 ? event.key : typed.current.buffer + event.key
    typed.current.at = now

    const query = typed.current.buffer.toLowerCase()
    const hit = items.findIndex(
      (option) =>
        !option.heading && !option.disabled && searchText(option).startsWith(query),
    )
    if (hit >= 0) {
      if (open) active.set(hit)
      else {
        active.index.current = hit
        commit(hit)
      }
    }
  }

  return (
    <>
      <button
        ref={(node) => {
          active.trigger.current = node
        }}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={`${list.listId}-box`}
        aria-expanded={list.expanded}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        popoverTarget={list.listId}
        style={list.anchorStyle}
        data-cx-anchor=""
        onKeyDown={onKeyDown}
        className={cx(
          CONTROL_SURFACE,
          CONTROL_ROW[size],
          'flex cursor-pointer items-center justify-between gap-2 text-start',
          selected ? 'text-fg' : 'text-fg-muted',
          className,
        )}
        {...rest}
      >
        <span className="min-w-0 truncate">
          {selected ? selected.label : (placeholder ?? labels.selectPlaceholder)}
        </span>
        {CHEVRON}
      </button>

      {name !== undefined && <input type="hidden" name={name} value={current ?? ''} />}

      <div
        ref={list.ref}
        popover="auto"
        id={list.listId}
        style={list.anchorStyle}
        data-match="anchor"
        className={cx(
          'cx-popover w-max overflow-hidden rounded-lg border border-line',
          'bg-overlay text-fg shadow-popover',
          'max-w-[min(22rem,calc(100vw-2rem))]',
        )}
      >
        <OptionList
          options={items}
          listId={list.listId}
          boxRef={active.box}
          selectedValue={current}
          onPick={commit}
          onHover={active.set}
        />
      </div>
    </>
  )
}

/* ── Combobox ──────────────────────────────────────────────────────────────*/

export interface ComboboxOption extends ListboxOption {}

export interface ComboboxProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'size' | 'list' | 'type' | 'value' | 'onChange'
> {
  options: ReadonlyArray<string | ComboboxOption>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  controlSize?: ControlSize
  /**
   * `false` makes it a picker: what is typed filters the list but only a
   * listed value can be committed. The default lets anything through, which
   * is what a tag or a hostname field wants.
   */
  allowCustom?: boolean
  /** Shown in place of the list when nothing matches. */
  empty?: ReactNode
  invalid?: boolean
}

export function Combobox({
  options,
  value,
  defaultValue,
  onValueChange,
  controlSize,
  allowCustom = true,
  empty,
  invalid,
  className,
  disabled,
  onKeyDown: onKeyDownProp,
  onClick: onClickProp,
  ...rest
}: ComboboxProps) {
  const size = useControlSize(controlSize)
  const labels = useLabels()

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const current = value ?? uncontrolled

  const all = useMemo<ListboxOption[]>(
    () =>
      options.map((option) =>
        typeof option === 'string' ? { value: option, label: option } : option,
      ),
    [options],
  )

  // Filtering is `includes`, not `startsWith`: someone typing "west" is
  // looking for eu-west-1, and a prefix match would find nothing.
  const query = current.trim().toLowerCase()
  const matches = useMemo(
    () =>
      query === '' ? all : all.filter((option) => searchText(option).includes(query)),
    [all, query],
  )

  // Past the cap the list stops being a list and starts being a scrollable
  // wall, and it is not free: every match is a row React rebuilds on every
  // keystroke. Cutting it costs the user nothing — nobody scrolls to the
  // four-hundredth hit, they type another letter.
  const shown = matches.length > MATCH_CAP ? matches.slice(0, MATCH_CAP) : matches

  const ident = useIdent()
  const active = useActiveOption(`cx-listbox-${ident}`)
  const list = usePopoverList(ident, () => {
    active.apply()
  })

  useEffect(() => {
    if (list.expanded) active.apply()
    else active.clear()
  })

  const setValue = (next: string) => {
    if (value === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const commit = (index: number) => {
    const option = shown[index]
    if (!option || option.disabled || option.heading) return
    setValue(option.value)
    list.close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDownProp?.(event)
    const open = list.isOpen()

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        if (!open) {
          active.index.current = nextEnabled(shown, -1, 1)
          list.open(active.trigger.current)
        } else {
          active.set(nextEnabled(shown, active.at(), step))
        }
        return
      }
      case 'Enter': {
        if (!open) return
        event.preventDefault()
        commit(active.at())
        return
      }
      case 'Escape': {
        if (open) {
          event.preventDefault()
          list.close()
        }
        return
      }
      case 'Tab': {
        // Leaving a picker with a half-typed value would commit something
        // that is not on the list, so it goes back to empty.
        if (!allowCustom && !all.some((option) => option.value === current)) setValue('')
        list.close()
        return
      }
    }
  }

  return (
    <>
      {/* The chevron needs something to sit in, and the field is an input:
          nothing can be drawn inside it. The wrapper carries the width the
          input used to carry itself, so a field in a form row is the same
          shape it was. */}
      <span className="relative block w-full">
        <input
          ref={(node) => {
            active.trigger.current = node
          }}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={`${list.listId}-box`}
          aria-expanded={list.expanded}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          disabled={disabled}
          value={current}
          style={list.anchorStyle}
          data-cx-anchor=""
          onChange={(event) => {
            setValue(event.target.value)
            active.index.current = 0
            list.open(active.trigger.current)
          }}
          // A combobox opens on a click in the field, the way every other one
          // does. `popovertarget` cannot do it — a text input is not a valid
          // invoker — and without the invoker relationship a click here would
          // light-dismiss the very list it is supposed to open.
          onClick={(event) => {
            onClickProp?.(event)
            list.open(active.trigger.current)
          }}
          onKeyDown={onKeyDown}
          className={cx(
            CONTROL_SURFACE,
            CONTROL_ROW[size],
            'pr-[calc(var(--cx-control-pad)+1rem)]',
            className,
          )}
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-y-0 flex items-center text-fg-muted',
            // `--cx-control-pad` is set by the row utility on the input, and a
            // sibling cannot read it, so the three paddings are named here.
            CHEVRON_INSET[size],
          )}
        >
          {CHEVRON}
        </span>
      </span>

      <div
        ref={list.ref}
        popover="auto"
        id={list.listId}
        style={list.anchorStyle}
        data-match="anchor"
        className={cx(
          'cx-popover w-max overflow-hidden rounded-lg border border-line',
          'bg-overlay text-fg shadow-popover',
          'max-w-[min(22rem,calc(100vw-2rem))]',
        )}
      >
        <OptionList
          options={shown}
          listId={list.listId}
          boxRef={active.box}
          selectedValue={current}
          empty={empty}
          note={matches.length > shown.length ? labels.truncated : undefined}
          onPick={commit}
          onHover={active.set}
        />
      </div>
    </>
  )
}
