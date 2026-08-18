import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cx } from '../util/cx'
import { IconButton } from './IconButton'
import { CONTROL_SIZE, useControlSize } from './Field'
import { useLabels, useLocale } from '../util/intl'
import { Combobox } from './Listbox'
import { SegmentedControl } from './SegmentedControl'
import { usePopover, Popover } from './Popover'
import type { ControlSize } from './Button'

/* ── Calendar ──────────────────────────────────────────────────────────────
   A month grid the kit draws itself.

   `<input type="date">` is not wrapped anywhere in this kit, and this is what
   replaces it. The native control is a different widget in every engine —
   Firefox, Chrome and Safari each draw their own — none of them take the
   product's styling, and the picker that opens looks like nothing else on
   screen. A grid the kit draws is the same everywhere, and it can mark the
   days that are taken, which the native one cannot do at all.

   What it does not reimplement is dates. Month lengths, leap years, weekday
   order, month and weekday names and the first day of the week all come from
   `Date` and `Intl`, in the user's own locale — a calendar that hard-codes
   Monday is wrong in the United States and one that hard-codes English is
   wrong everywhere else.                                                    */

const DAY_MS = 86_400_000

/** Local-time ISO. `toISOString` is UTC and shifts the date either side of it. */
function toISO(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function fromISO(value?: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, count: number): Date {
  // Through the epoch rather than by setDate, so a DST boundary cannot land
  // the result an hour short and roll it back a day.
  return startOfDay(new Date(startOfDay(date).getTime() + count * DAY_MS))
}

function addMonths(date: Date, count: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + count, 1)
  // 31 January plus a month is 28 or 29 February, not 3 March.
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  return a !== null && b !== null && toISO(a) === toISO(b)
}

/**
 * Sunday in the United States, Monday across most of Europe, Saturday in much
 * of the Middle East. `Intl.Locale` knows; where it does not, Monday is the
 * ISO default and the least wrong guess.
 */
function firstWeekday(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay
    // Intl counts Monday as 1 and Sunday as 7; Date counts Sunday as 0.
    if (first !== undefined) return first % 7
  } catch {
    /* Engines without Intl.Locale fall through to the default. */
  }
  return 1
}

export interface DateRange {
  /** ISO `yyyy-mm-dd`. */
  start: string
  end: string
}

/**
 * What one click picks. A range of arbitrary days is two clicks; a week or a
 * month is one, because "the week of the 14th" is a single thing a person has
 * in mind, and making them find both ends of it by hand is asking them to do
 * arithmetic the calendar already knows.
 */
export type DateGranularity = 'day' | 'week' | 'month'

function startOfWeek(date: Date, weekStart: number): Date {
  return addDays(date, -((date.getDay() - weekStart + 7) % 7))
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/** The span one click covers, given what is being picked. */
function spanFor(date: Date, granularity: DateGranularity, weekStart: number): DateRange {
  if (granularity === 'week') {
    const from = startOfWeek(date, weekStart)
    return { start: toISO(from), end: toISO(addDays(from, 6)) }
  }
  if (granularity === 'month') {
    return { start: toISO(startOfMonth(date)), end: toISO(endOfMonth(date)) }
  }
  return { start: toISO(date), end: toISO(date) }
}

export interface CalendarProps {
  /** ISO `yyyy-mm-dd`. Single mode only. */
  value?: string
  onValueChange?: (value: string) => void
  /** `range` turns the grid into a two-ended selection. */
  mode?: 'single' | 'range'
  range?: DateRange | null
  onRangeChange?: (range: DateRange) => void
  /** What a click covers in range mode. */
  granularity?: DateGranularity
  /** The month on screen, when the product wants to drive it. */
  month?: string
  defaultMonth?: string
  onMonthChange?: (month: string) => void
  min?: string
  max?: string
  /** Days that cannot be picked — booked, closed, out of range. */
  isDisabled?: (date: Date) => boolean
  locale?: string
  label?: string
  className?: string
}

export function Calendar({
  value,
  onValueChange,
  mode = 'single',
  range,
  onRangeChange,
  granularity = 'day',
  month,
  defaultMonth,
  onMonthChange,
  min,
  max,
  isDisabled,
  locale,
  label,
  className,
}: CalendarProps) {
  const resolvedLocale = useLocale(locale)
  const labels = useLabels()

  const selected = fromISO(value)
  const today = startOfDay(new Date())
  const minDate = fromISO(min)
  const maxDate = fromISO(max)

  // Opens where the selection is, and in range mode that is the start of the
  // range rather than `value` — which is empty there. Without this the grid
  // opens on the current month and a range set anywhere else is simply not on
  // screen, which reads as the range having been lost.
  const [uncontrolledMonth, setUncontrolledMonth] = useState(
    () => fromISO(defaultMonth) ?? selected ?? fromISO(range?.start) ?? today,
  )
  const visibleMonth = fromISO(month) ?? uncontrolledMonth

  // The day the arrow keys are on. It is not the selection: moving through
  // the grid must not commit a date, only Enter and a click do.
  const [focused, setFocused] = useState<Date>(() => selected ?? today)
  const shouldFocus = useRef(false)
  const gridRef = useRef<HTMLTableElement>(null)

  // The only effect here, and the reason for it: after an arrow key the cell
  // to focus does not exist until React has committed the new grid, so the
  // focus call cannot happen in the handler that decided where to go.
  useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-date="${toISO(focused)}"]`)
      ?.focus()
  }, [focused])

  const monthFormat = useMemo(
    () => new Intl.DateTimeFormat(resolvedLocale, { month: 'long', year: 'numeric' }),
    [resolvedLocale],
  )
  const weekdayShort = useMemo(
    () => new Intl.DateTimeFormat(resolvedLocale, { weekday: 'short' }),
    [resolvedLocale],
  )
  const weekdayLong = useMemo(
    () => new Intl.DateTimeFormat(resolvedLocale, { weekday: 'long' }),
    [resolvedLocale],
  )
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(resolvedLocale, { dateStyle: 'full' }),
    [resolvedLocale],
  )

  const weekStart = firstWeekday(resolvedLocale)

  // One end of a range that is being drawn but not yet committed, and the day
  // the pointer is over. Together they are what the grid paints before the
  // second click lands — without them a range selection gives no sign of what
  // it is about to become.
  const [anchor, setAnchor] = useState<Date | null>(null)
  const [hovered, setHovered] = useState<Date | null>(null)

  /** What the grid should shade right now: the committed range, or the one
      being drawn, or the week or month under the pointer. */
  const painted: DateRange | null = (() => {
    if (mode !== 'range') return null
    if (granularity !== 'day') {
      return hovered ? spanFor(hovered, granularity, weekStart) : (range ?? null)
    }
    if (anchor !== null && hovered !== null) {
      const [from, to] = anchor <= hovered ? [anchor, hovered] : [hovered, anchor]
      return { start: toISO(from), end: toISO(to) }
    }
    if (anchor !== null) return { start: toISO(anchor), end: toISO(anchor) }
    return range ?? null
  })()

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const leading = (monthStart.getDay() - weekStart + 7) % 7
  const gridStart = addDays(monthStart, -leading)

  // Always six rows. A month that fits in five would otherwise resize the
  // popover as it is paged through, moving the buttons under the cursor.
  const weeks = Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(gridStart, week * 7 + day)),
  )

  const outOfRange = (date: Date) =>
    (minDate !== null && date < minDate) || (maxDate !== null && date > maxDate)

  const unavailable = (date: Date) => outOfRange(date) || (isDisabled?.(date) ?? false)

  const goToMonth = (next: Date) => {
    if (month === undefined) setUncontrolledMonth(next)
    onMonthChange?.(toISO(new Date(next.getFullYear(), next.getMonth(), 1)))
  }

  const moveFocus = (next: Date) => {
    shouldFocus.current = true
    setFocused(next)
    if (
      next.getMonth() !== visibleMonth.getMonth() ||
      next.getFullYear() !== visibleMonth.getFullYear()
    ) {
      goToMonth(next)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -((focused.getDay() - weekStart + 7) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() - weekStart + 7) % 7)),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    }

    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    moveFocus(move())
  }

  const select = (date: Date) => {
    if (unavailable(date)) return
    setFocused(date)

    if (mode === 'single') {
      onValueChange?.(toISO(date))
      return
    }

    // A week or a month is one click: the span is already decided, and asking
    // for a second click would only be asking where the week ends.
    if (granularity !== 'day') {
      onRangeChange?.(spanFor(date, granularity, weekStart))
      setAnchor(null)
      return
    }

    if (anchor === null) {
      setAnchor(date)
      return
    }

    // Either order of clicks means the same range. Sorting here rather than
    // refusing a backwards drag is the difference between a control that
    // works and one that has to be explained.
    const [from, to] = anchor <= date ? [anchor, date] : [date, anchor]
    onRangeChange?.({ start: toISO(from), end: toISO(to) })
    setAnchor(null)
  }

  return (
    <div className={cx('inline-flex min-w-0 flex-col gap-2 p-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <IconButton
          size="sm"
          label={labels.previousMonth}
          onClick={() => goToMonth(addMonths(monthStart, -1))}
          icon={<Chevron direction="start" />}
        />
        {/* Announced when it changes, so paging through months is audible
            without moving focus off the grid. */}
        <span aria-live="polite" className="text-ui font-medium text-fg">
          {monthFormat.format(monthStart)}
        </span>
        <IconButton
          size="sm"
          label={labels.nextMonth}
          onClick={() => goToMonth(addMonths(monthStart, 1))}
          icon={<Chevron direction="end" />}
        />
      </div>

      <table
        ref={gridRef}
        role="grid"
        aria-label={label ?? monthFormat.format(monthStart)}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHovered(null)}
        className="border-separate border-spacing-0.5"
      >
        <thead>
          <tr>
            {weeks[0]!.map((date) => (
              <th
                key={date.getDay()}
                scope="col"
                abbr={weekdayLong.format(date)}
                className="pb-1 text-micro font-normal text-fg-muted"
              >
                {weekdayShort.format(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={toISO(week[0]!)}>
              {week.map((date) => {
                const iso = toISO(date)
                const outside = date.getMonth() !== monthStart.getMonth()
                const off = unavailable(date)

                // ISO dates sort as strings, so the band is a plain
                // comparison — no date arithmetic per cell.
                const inBand =
                  painted !== null && iso >= painted.start && iso <= painted.end
                const bandStart = painted?.start === iso
                const bandEnd = painted?.end === iso
                const isSelected =
                  mode === 'range' ? bandStart || bandEnd : isSameDay(date, selected)

                return (
                  <td key={iso} className="p-0">
                    <button
                      type="button"
                      data-date={iso}
                      // One cell in the grid is reachable by Tab; the arrow
                      // keys move between the rest. Thirty-five extra tab
                      // stops is what the roving index exists to avoid.
                      tabIndex={isSameDay(date, focused) ? 0 : -1}
                      disabled={off}
                      aria-selected={isSelected || undefined}
                      aria-current={isSameDay(date, today) ? 'date' : undefined}
                      aria-label={dayFormat.format(date)}
                      data-outside={outside || undefined}
                      data-selected={isSelected || undefined}
                      data-in-band={(inBand && !isSelected) || undefined}
                      data-band-start={bandStart || undefined}
                      data-band-end={bandEnd || undefined}
                      onClick={() => select(date)}
                      onFocus={() => setFocused(date)}
                      onPointerEnter={() => setHovered(date)}
                      className={cx(
                        'flex size-control-sm cursor-pointer items-center',
                        'justify-center rounded-control border border-transparent',
                        'text-control-sm tabular-nums text-fg',
                        'transition-colors duration-instant ease-snap',
                        'hover:not-disabled:bg-hover active:not-disabled:bg-active',
                        'disabled:cursor-not-allowed disabled:text-fg-muted',
                        // The days between the two ends read as one band, so
                        // the tint is flat and only the ends carry the fill.
                        'data-in-band:bg-accent-subtle data-in-band:text-fg',
                        // Days from the neighbouring months are shown rather
                        // than blanked: the week they belong to is still a
                        // week, and a ragged grid is harder to scan.
                        'data-outside:text-fg-muted',
                        'data-selected:border-accent data-selected:bg-accent',
                        'data-selected:text-accent-fg data-selected:hover:bg-accent-hover',
                        // Today is marked with a rule, not a fill: the fill
                        // means "selected" and only one thing can mean that.
                        'aria-[current=date]:not-data-selected:border-line-strong',
                        'aria-[current=date]:not-data-selected:font-medium',
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Chevron({ direction }: { direction: 'start' | 'end' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5">
      <path
        d={direction === 'start' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── DatePicker ────────────────────────────────────────────────────────────
   The calendar behind a control-shaped trigger.

   The popover is the kit's, so opening, light dismiss, Escape, focus return
   and the top layer are the platform's — the only thing added here is
   closing it once a day has been chosen, which the browser has no way to
   know is what a click meant.                                               */

export interface DatePickerProps extends Omit<CalendarProps, 'className'> {
  /** Submitted with the form as `yyyy-mm-dd`. */
  name?: string
  id?: string
  placeholder?: ReactNode
  controlSize?: ControlSize
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-describedby'?: string
}

export function DatePicker({
  value,
  onValueChange,
  name,
  id,
  placeholder,
  controlSize,
  disabled,
  invalid,
  locale,
  className,
  ...calendar
}: DatePickerProps) {
  const popover = usePopover()
  const size = useControlSize(controlSize)
  const resolvedLocale = useLocale(locale)
  const labels = useLabels()

  const selected = fromISO(value)
  const label = selected
    ? new Intl.DateTimeFormat(resolvedLocale, { dateStyle: 'medium' }).format(selected)
    : (placeholder ?? labels.datePlaceholder)

  return (
    <>
      <button
        {...popover.trigger}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
        className={cx(
          CONTROL_SIZE[size],
          'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2',
          'rounded-control border border-line-strong bg-raised text-start',
          'transition-colors duration-snap ease-snap',
          'hover:not-disabled:border-line-accent disabled:bg-subtle',
          'aria-invalid:border-danger aria-invalid:bg-danger-surface',
          selected ? 'text-fg' : 'text-fg-muted',
          className,
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <CalendarGlyph />
      </button>

      {name !== undefined && <input type="hidden" name={name} value={value ?? ''} />}

      <Popover {...popover.content} className="p-0">
        <Calendar
          {...calendar}
          value={value}
          locale={locale}
          onValueChange={(next) => {
            onValueChange?.(next)
            document.getElementById(popover.content.id)?.hidePopover()
          }}
        />
      </Popover>
    </>
  )
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 text-fg-muted">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ── DateRangePicker ───────────────────────────────────────────────────────
   Two ends at once, and a switch for what one click covers.

   The switch is the point. Most range pickers make every selection two
   clicks, which is right for an arbitrary span and wrong for the two spans
   people actually ask for most — this week, this month. Those are one thing
   in the user's head, so they are one click here, and the calendar works out
   where the week starts in their locale rather than asking.                */

export interface DateRangePickerProps extends Omit<
  CalendarProps,
  'className' | 'mode' | 'value' | 'onValueChange'
> {
  value?: DateRange | null
  onValueChange?: (range: DateRange) => void
  /** Fixes what a click covers and hides the switch. */
  granularity?: DateGranularity
  /** Hides the Days / Week / Month switch when the product wants one mode. */
  showGranularity?: boolean
  name?: string
  id?: string
  placeholder?: ReactNode
  controlSize?: ControlSize
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-describedby'?: string
}

export function DateRangePicker({
  value,
  onValueChange,
  granularity,
  showGranularity = true,
  name,
  id,
  placeholder,
  controlSize,
  disabled,
  invalid,
  locale,
  className,
  ...calendar
}: DateRangePickerProps) {
  const popover = usePopover()
  const size = useControlSize(controlSize)
  const resolvedLocale = useLocale(locale)
  const labels = useLabels()

  const [ownGranularity, setOwnGranularity] = useState<DateGranularity>('day')
  const effective = granularity ?? ownGranularity

  const from = fromISO(value?.start)
  const to = fromISO(value?.end)

  // One formatter, two calls, and the parts that repeat are dropped: a range
  // inside one month reads "14 – 20 March", not the month twice.
  const label = useMemo(() => {
    if (!from || !to) return placeholder ?? labels.rangePlaceholder
    const sameMonth =
      from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
    const long = new Intl.DateTimeFormat(resolvedLocale, { dateStyle: 'medium' })
    if (toISO(from) === toISO(to)) return long.format(from)
    if (sameMonth) {
      const day = new Intl.DateTimeFormat(resolvedLocale, { day: 'numeric' })
      return `${day.format(from)} – ${long.format(to)}`
    }
    return `${long.format(from)} – ${long.format(to)}`
  }, [from, to, placeholder, resolvedLocale, labels])

  const commit = (range: DateRange) => {
    onValueChange?.(range)
    // A day range needs both clicks before it means anything; a week or a
    // month is complete the moment it is picked, so the list can close.
    if (effective !== 'day') {
      document.getElementById(popover.content.id)?.hidePopover()
    }
  }

  return (
    <>
      <button
        {...popover.trigger}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
        className={cx(
          CONTROL_SIZE[size],
          'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2',
          'rounded-control border border-line-strong bg-raised text-start',
          'transition-colors duration-snap ease-snap',
          'hover:not-disabled:border-line-accent disabled:bg-subtle',
          'aria-invalid:border-danger aria-invalid:bg-danger-surface',
          from && to ? 'text-fg' : 'text-fg-muted',
          className,
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <CalendarGlyph />
      </button>

      {name !== undefined && (
        <>
          <input type="hidden" name={`${name}.start`} value={value?.start ?? ''} />
          <input type="hidden" name={`${name}.end`} value={value?.end ?? ''} />
        </>
      )}

      <Popover {...popover.content} className="p-0">
        <div className="flex flex-col gap-2 p-2">
          {granularity === undefined && showGranularity && (
            <SegmentedControl
              size="sm"
              full
              label={labels.granularity}
              value={ownGranularity}
              onValueChange={setOwnGranularity}
              options={[
                { value: 'day' as const, label: labels.granularityDay },
                { value: 'week' as const, label: labels.granularityWeek },
                { value: 'month' as const, label: labels.granularityMonth },
              ]}
            />
          )}
          <Calendar
            {...calendar}
            mode="range"
            granularity={effective}
            range={value ?? null}
            onRangeChange={commit}
            locale={locale}
            className="p-0"
          />
        </div>
      </Popover>
    </>
  )
}

/* ── TimePicker ────────────────────────────────────────────────────────────
   One field, not three.

   It was three selects, and three selects is what a time looks like when the
   control is built out of what was lying around rather than out of what the
   task is. Reading a time back off them means reading three boxes and joining
   them up, and setting one means three separate interactions.

   So: one input showing `18:30`, with the list of times behind it. Typing is
   the fast path and the parser is deliberately loose — `1830`, `18.30`, `18`
   and `6:30 pm` all land on the same value. The list is the slow path, for
   when the exact time is not already in mind.

   Twenty-four hours by default. Most of the world is on it, the string that
   goes to the server is on it either way, and a picker that quietly follows
   the browser's locale is a picker that reads differently in test and in
   production. `hour12` is there for the places that want it.                */

export interface TimePickerProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'list'
> {
  /** 24-hour `HH:MM`, whatever is displayed. */
  value?: string
  onValueChange?: (value: string) => void
  /** Minutes between the offered times. The field still accepts any minute. */
  step?: number
  /** Twelve-hour display. Off by default. */
  hour12?: boolean
  min?: string
  max?: string
  locale?: string
  controlSize?: ControlSize
  invalid?: boolean
}

function pad2(n: number): string {
  return `${n}`.padStart(2, '0')
}

/**
 * Loose on purpose. Someone typing a time is not filling in a form field,
 * they are saying a time, and the shapes they use for it are all of these.
 */
function parseTime(raw: string): string | null {
  const text = raw.trim().toLowerCase()
  if (text === '') return null

  const pm = /p\.?\s*m\.?/.test(text)
  const am = /a\.?\s*m\.?/.test(text)

  let hours: number
  let minutes: number

  const separated = text.match(/^(\d{1,2})\s*[:.,hчu]\s*(\d{1,2})/)
  if (separated) {
    hours = Number(separated[1])
    minutes = Number(separated[2])
  } else {
    const digits = text.replace(/\D/g, '')
    if (digits === '') return null
    if (digits.length <= 2) {
      hours = Number(digits)
      minutes = 0
    } else if (digits.length === 3) {
      hours = Number(digits.slice(0, 1))
      minutes = Number(digits.slice(1))
    } else {
      hours = Number(digits.slice(0, 2))
      minutes = Number(digits.slice(2, 4))
    }
  }

  // 12 AM is midnight and 12 PM is noon — the one place the clock does not
  // simply add twelve.
  if (pm && hours < 12) hours += 12
  if (am && hours === 12) hours = 0

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours > 23 || minutes > 59) return null
  return `${pad2(hours)}:${pad2(minutes)}`
}

function formatTime(value: string, hour12: boolean, locale: string): string {
  if (!hour12) return value
  const [hours, minutes] = value.split(':').map(Number)
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(2020, 0, 1, hours ?? 0, minutes ?? 0))
}

export function TimePicker({
  value,
  onValueChange,
  step = 30,
  hour12 = false,
  min,
  max,
  locale,
  controlSize,
  invalid,
  className,
  ...rest
}: TimePickerProps) {
  const resolvedLocale = useLocale(locale)
  const labels = useLabels()

  const display = value ? formatTime(value, hour12, resolvedLocale) : ''
  const [text, setText] = useState(display)

  // The field follows the value it is given, except while it is being typed
  // into — otherwise a half-typed "18" would be rewritten to "18:00" under
  // the cursor on every keystroke.
  const lastValue = useRef(value)
  if (lastValue.current !== value) {
    lastValue.current = value
    if (text !== display && parseTime(text) !== value) setText(display)
  }

  const times = useMemo(() => {
    const out: string[] = []
    for (let minutes = 0; minutes < 24 * 60; minutes += Math.max(1, step)) {
      const iso = `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`
      if (min !== undefined && iso < min) continue
      if (max !== undefined && iso > max) continue
      out.push(iso)
    }
    return out
  }, [step, min, max])

  const options = useMemo(
    () =>
      times.map((iso) => ({
        value: formatTime(iso, hour12, resolvedLocale),
        label: formatTime(iso, hour12, resolvedLocale),
        search: `${iso} ${formatTime(iso, hour12, resolvedLocale)}`,
      })),
    [times, hour12, resolvedLocale],
  )

  const accept = (next: string) => {
    setText(next)
    const parsed = parseTime(next)
    if (parsed !== null) onValueChange?.(parsed)
  }

  return (
    <Combobox
      {...rest}
      options={options}
      value={text}
      onValueChange={accept}
      controlSize={controlSize}
      invalid={invalid}
      inputMode={hour12 ? 'text' : 'numeric'}
      placeholder={hour12 ? '6:30 PM' : '18:30'}
      empty={labels.noSuchTime}
      className={className}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        // Tidy up on the way out: what was typed becomes the canonical form,
        // or reverts if it was never a time.
        const parsed = parseTime(text)
        setText(parsed === null ? display : formatTime(parsed, hour12, resolvedLocale))
        rest.onBlur?.(event)
      }}
    />
  )
}
