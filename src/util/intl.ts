import { createContext, useContext, type ReactNode } from 'react'

/* ── Language ──────────────────────────────────────────────────────────────
   Two separate problems, and only one of them is the kit's.

   Anything derived from a date is the platform's: month and weekday names,
   the order of the days, the first day of the week, twelve hours or
   twenty-four, what "before noon" is called. All of it comes out of `Intl`
   for whatever locale is in force, so the kit ships no calendar translations
   and never will — a hard-coded Monday is wrong in the United States and a
   hard-coded January is wrong everywhere but here.

   What is the kit's is the handful of words it puts on screen itself:
   "Nothing found", "Previous month", "optional". They are all listed below.
   A product overrides the set once on `<Root>` rather than passing a prop
   into every control — that is the difference between a kit that can speak
   Russian and a kit that can be made to.                                    */

export interface Labels {
  /** Shown by a `Select` with nothing chosen. */
  selectPlaceholder: ReactNode
  /** Shown when a filter matches nothing. */
  empty: ReactNode
  /** Shown under a list that was cut short because too much matched. */
  truncated: ReactNode
  /** Marks a field the form does not require. */
  optional: ReactNode
  previousMonth: string
  nextMonth: string
  datePlaceholder: ReactNode
  rangePlaceholder: ReactNode
  /** Names the Days / Week / Month switch for a screen reader. */
  granularity: string
  granularityDay: ReactNode
  granularityWeek: ReactNode
  granularityMonth: ReactNode
  noSuchTime: ReactNode
  pagination: string
  previousPage: string
  nextPage: string
  dismiss: string
  breadcrumb: string
}

export const LABELS_EN: Labels = {
  selectPlaceholder: 'Select…',
  empty: 'Nothing found',
  truncated: 'Not everything is shown — keep typing to narrow it down',
  optional: 'optional',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  datePlaceholder: 'Pick a date',
  rangePlaceholder: 'Pick a range',
  granularity: 'What a click selects',
  granularityDay: 'Days',
  granularityWeek: 'Week',
  granularityMonth: 'Month',
  noSuchTime: 'No such time',
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  dismiss: 'Dismiss',
  breadcrumb: 'Breadcrumb',
}

export const LABELS_RU: Labels = {
  selectPlaceholder: 'Выберите…',
  empty: 'Ничего не найдено',
  truncated: 'Показано не всё — уточните запрос',
  optional: 'необязательно',
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  datePlaceholder: 'Выберите дату',
  rangePlaceholder: 'Выберите период',
  granularity: 'Что выбирает клик',
  granularityDay: 'Дни',
  granularityWeek: 'Неделя',
  granularityMonth: 'Месяц',
  noSuchTime: 'Такого времени нет',
  pagination: 'Постраничная навигация',
  previousPage: 'Предыдущая страница',
  nextPage: 'Следующая страница',
  dismiss: 'Закрыть',
  breadcrumb: 'Хлебные крошки',
}

export interface IntlValue {
  /** A BCP 47 tag. Left unset, every component asks the browser. */
  locale?: string
  labels: Labels
}

export const IntlContext = createContext<IntlValue>({ labels: LABELS_EN })

/** The kit's own words, overridable once on `<Root>`. */
export function useLabels(): Labels {
  return useContext(IntlContext).labels
}

/**
 * The locale a component should format in. A prop wins, then whatever the
 * product set on `<Root>`, then the browser — so leaving all of it alone
 * means the calendar follows the system, which is usually what is wanted.
 */
export function useLocale(explicit?: string): string {
  const fromContext = useContext(IntlContext).locale
  if (explicit !== undefined) return explicit
  if (fromContext !== undefined) return fromContext
  return typeof navigator === 'undefined' ? 'en' : navigator.language
}
