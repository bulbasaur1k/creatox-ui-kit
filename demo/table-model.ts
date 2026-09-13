import { combine, createEffect, createEvent, createStore, sample } from 'effector'
import { makeItems, remainingOf, type InvoiceItem } from './table-data'
import type { RowSelectionState, SortingState } from '../src/table'

/* Модель страницы приёмки, как она выглядит в WMS: список из ответа сервера,
   поиск считается на клиенте, сортировка — на сервере (здесь сервер
   изображает эффект с задержкой), скан штрихкода меняет одну позицию.
   Таблица к этому подключается голыми `useUnit` — ни одного хука своего. */

export const countChanged = createEvent<number>()
export const searchChanged = createEvent<string>()
export const sortingChanged = createEvent<SortingState>()
export const selectionChanged = createEvent<RowSelectionState>()
export const rowClicked = createEvent<InvoiceItem>()
export const scanned = createEvent<void>()
export const reset = createEvent<void>()

export const $count = createStore(857).on(countChanged, (_, n) => n)
export const $search = createStore('').on(searchChanged, (_, s) => s)
export const $sorting = createStore<SortingState>([]).on(sortingChanged, (_, s) => s)
export const $selection = createStore<RowSelectionState>({}).on(
  selectionChanged,
  (_, s) => s,
)
export const $lastClicked = createStore<InvoiceItem | null>(null).on(
  rowClicked,
  (_, r) => r,
)
export const $scans = createStore(0).on(scanned, (n) => n + 1)

/* «Сервер»: отдаёт список в заказанном порядке через задержку, близкую к
   медиане прода. Локальная сортировка нарочно не используется — на реальной
   странице страница данных приходит уже отсортированной. */
export const fetchFx = createEffect(
  async ({ count, sorting }: { count: number; sorting: SortingState }) => {
    await new Promise((r) => setTimeout(r, 80))
    const items = makeItems(count)
    const [first] = sorting
    if (!first) return items
    const key = first.id as keyof InvoiceItem
    const dir = first.desc ? -1 : 1
    return items.sort((a, b) => {
      const x = a[key]
      const y = b[key]
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return String(x ?? '').localeCompare(String(y ?? ''), 'ru') * dir
    })
  },
)

export const $items = createStore<InvoiceItem[]>([])
  .on(fetchFx.doneData, (_, items) => items)
  .reset(reset)

export const $loading = fetchFx.pending

sample({
  clock: [countChanged, sortingChanged, reset],
  source: { count: $count, sorting: $sorting },
  target: fetchFx,
})

/* Поиск по артикулу, бренду и наименованию — как в WMS, на клиенте. */
export const $filteredItems = combine($items, $search, (items, search) => {
  if (search.length < 2) return items
  const lower = search.toLowerCase()
  return items.filter(
    (item) =>
      item.article.toLowerCase().includes(lower) ||
      item.brand.toLowerCase().includes(lower) ||
      item.name.toLowerCase().includes(lower),
  )
})

/* Скан: одна случайная позиция с остатком получает +1 к принятому. Новый
   массив, в нём один новый объект — ровно то, что таблице нужно, чтобы
   перерисовать одну строку. */
$items.on(scanned, (items) => {
  const open = items.filter((item) => remainingOf(item) > 0)
  if (open.length === 0) return items
  const target = open[Math.floor(Math.random() * open.length)]!
  return items.map((item) =>
    item === target ? { ...item, receiptedQuantity: item.receiptedQuantity + 1 } : item,
  )
})

/* Клик по строке в WMS открывает модалку ввода количества — здесь только
   отмечаем, чтобы было видно, что клик долетел до модели. */
export const $summary = combine($items, (items) => ({
  quantity: items.reduce((n, i) => n + i.quantity, 0),
  receipted: items.reduce((n, i) => n + i.receiptedQuantity, 0),
  blocked: items.reduce((n, i) => n + i.blockedQuantity, 0),
}))
