# DataTable

Таблица данных на headless-движке: тысячи строк, сортировка и выбор снаружи, одна перерисованная строка на одно изменение. Живёт в отдельной точке входа `creatox-ui-kit/table`.

## Установка

```bash
npm i creatox-ui-kit @tanstack/react-table @tanstack/react-virtual
```

Движок (TanStack Table v9) и виртуализатор (TanStack Virtual) — необязательные peer-зависимости. Основная точка входа `creatox-ui-kit` их не импортирует, поэтому продукту без `DataTable` ставить их не нужно.

```tsx
import { DataTable, defineColumns } from 'creatox-ui-kit/table'
```

Стили те же, что у всего кита: `creatox-ui-kit/styles.css` либо свой Tailwind с `@source` на `node_modules/creatox-ui-kit/dist`.

## Колонки

`defineColumns<T>()` возвращает типизированный билдер. `accessor` — колонка со значением из строки, `display` — колонка без значения: номер, действия, чекбокс.

```tsx
interface Invoice {
  id: number
  number: string
  supplier: string
  total: number
  state: 'draft' | 'paid' | 'overdue'
}

const col = defineColumns<Invoice>()

const COLUMNS = col.columns([
  col.accessor('number', { header: 'Накладная', size: 120, meta: { mono: true } }),
  col.accessor('supplier', { header: 'Поставщик' }),
  col.accessor('total', {
    header: 'Сумма',
    size: 120,
    meta: {
      align: 'end',
      mono: true,
      tone: (row) => (row.state === 'overdue' ? 'danger' : undefined),
    },
    cell: ({ getValue }) => rub.format(getValue()),
  }),
  col.accessor('state', {
    header: 'Состояние',
    size: 130,
    enableSorting: false,
    cell: ({ getValue }) => <Status tone={TONE[getValue()]}>{LABEL[getValue()]}</Status>,
  }),
  col.display({
    id: 'actions',
    size: 80,
    cell: ({ row }) => (
      <RowActions>
        <IconButton size="sm" label="Открыть" tooltip icon={<Icon>{arrowRight}</Icon>} />
      </RowActions>
    ),
  }),
])
```

Что доступно в описании колонки:

| Поле                 | Что делает                                                                             |
| -------------------- | -------------------------------------------------------------------------------------- |
| `header`             | Строка или рендер-функция. Пустая строка — колонка без заголовка                       |
| `cell`               | Рендер ячейки: `({ getValue, row }) => …`. Без него — значение как есть                |
| `size`               | Ширина в px. Колонки без `size` делят остаток. Закреплённым колонкам `size` обязателен |
| `enableSorting`      | `false` — колонка не сортируется. По умолчанию сортируются все `accessor`              |
| `meta.align`         | `'start' \| 'center' \| 'end'` — выравнивание ячейки и заголовка                       |
| `meta.mono`          | Моноширинный шрифт: артикулы, суммы, идентификаторы                                    |
| `meta.tone`          | `(row) => Tone \| undefined` — заливка одной ячейки                                    |
| `meta.cellClassName` | Классы на каждую ячейку колонки                                                        |

**Массив колонок создаётся один раз** — на уровне модуля или в `useMemo`. Движок кэширует модель по identity массива; новый массив на каждый рендер — новая модель на каждый рендер.

## Строки

```tsx
<DataTable
  rows={rows}
  columns={COLUMNS}
  getRowId={(row) => String(row.id)}
  density="compact"
  bounded
/>
```

`getRowId` обязателен: на нём держатся ключи, выбор и замер высот. Индекс не годится — при сортировке строка с индексом 3 становится другой строкой.

Строка перерисовывается только когда меняется её объект. Обновление одной позиции в сторе должно давать новый массив с одним новым объектом:

```ts
$items.on(scanned, (items, id) =>
  items.map((item) => (item.id === id ? { ...item, received: item.received + 1 } : item)),
)
```

Остальные строки таблица не тронет. Никаких `shouldCellUpdate` и списков зависимостей по полям — identity объекта говорит всё сама.

`rowProps` задаёт вид строки:

```tsx
rowProps={(row) =>
  row.state === 'overdue' ? { tone: 'danger' } : { interactive: row.state === 'draft' }
}
```

- `tone` — заливка всей строки (`tone` ячейки в `meta` сильнее);
- `interactive` — курсор и отклик на нажатие; без него подставляется `onRowClick !== undefined`;
- `className` — свои классы.

`onRowClick={(row, event) => …}` получает объект строки. Клик по чекбоксу выбора до него не доходит.

## Сортировка

По умолчанию `sortMode="server"`: таблица **не переставляет** строки, а сообщает, что попросили. Порядок — ответственность того, кто отдаёт `rows`.

```tsx
const [sorting, setSorting] = useState<SortingState>([])

<DataTable sorting={sorting} onSortingChange={setSorting} … />
```

`SortingState` — массив `{ id: string; desc: boolean }`, `id` — идентификатор колонки (`accessorKey` или `id`). Обычно там один элемент; `multiSort` включает Shift+клик, добавляющий колонку к сортировке.

Цикл клика по заголовку: по возрастанию → по убыванию → без сортировки.

Без `sorting` состояние держится внутри, `defaultSorting` задаёт начальное. Хэндлер всё равно вызывается.

`sortMode="client"` — таблица сортирует сама. Для короткого списка, пришедшего одним ответом и не имеющего сервера, у которого можно спросить.

## Выбор строк

```tsx
<DataTable selectable selection={selection} onSelectionChange={setSelection} … />
```

`selectable` добавляет колонку с чекбоксами и чекбокс «выбрать все» в шапку; `selectable="single"` — один за раз, без шапочного. `RowSelectionState` — `Record<string, true>` по `getRowId`. Shift+клик выбирает диапазон.

Выбор — отдельное состояние: удалили строку из `rows` — её id из `selection` уберите сами.

## Закреплённые колонки

```tsx
pinned={{ start: ['number'], end: ['actions'] }}
```

Закреплённые колонки остаются на месте при горизонтальной прокрутке. Им нужен `size`: смещения считаются из ширин.

## Прокрутка и виртуализация

Виртуализация включена всегда (`virtual={false}` выключает): в DOM лежат строки на экране плюс запас в `overscan` строк (по умолчанию 8), остальное изображают две строки-распорки. Таблица остаётся настоящим `<table>` — ширины колонок, липкая шапка, семантика для скринридера.

Два режима:

- **Без `maxHeight`** прокручивается страница, таблица следует за окном. Для экрана, который таблица занимает целиком.
- **С `maxHeight`** (`"calc(100dvh - 12rem)"`, `"24rem"`) таблица — своя прокручиваемая область. Для таблицы внутри панели или рядом с чем-то ещё.

Высоты строк снимаются с реальных элементов, `estimateRowHeight` — стартовая оценка (по плотности: 28 / 36 / 44 px). Точная оценка убирает дрожание полосы прокрутки на первом кадре; в остальном она не важна.

`virtual={false}` уместен для печати и для таблиц, у которых полосы прокрутки не бывает.

## Состояния

- `loading` без строк — пять строк скелета; с строками — тело приглушается, таблица помечается `aria-busy`.
- `empty` — текст или элемент вместо строк; без него — «Ничего не найдено» на языке `<Root>`.
- `density`, `bounded`, `caption` — как у `Table`.

## Effector

Хэндлеры получают значения, не updater-функции, поэтому события подключаются напрямую:

```ts
// model.ts
export const sortingChanged = createEvent<SortingState>()
export const selectionChanged = createEvent<RowSelectionState>()
export const rowClicked = createEvent<Invoice>()

export const $sorting = createStore<SortingState>([]).on(sortingChanged, (_, s) => s)
export const $selection = createStore<RowSelectionState>({}).on(selectionChanged, (_, s) => s)

export const invoicesQuery = createQuery({ … })  // farfetched, параметры — из $sorting
sample({ clock: $sorting, fn: (sorting) => ({ sorting }), target: invoicesQuery.start })
```

```tsx
// ui.tsx
const { rows, sorting, selection, loading } = useUnit({
  rows: invoicesQuery.$data,
  sorting: $sorting,
  selection: $selection,
  loading: invoicesQuery.$pending,
})
const on = useUnit({ sortingChanged, selectionChanged, rowClicked })

<DataTable
  rows={rows ?? EMPTY}
  columns={COLUMNS}
  getRowId={getRowId}
  sorting={sorting}
  onSortingChange={on.sortingChanged}
  selectable
  selection={selection}
  onSelectionChange={on.selectionChanged}
  onRowClick={on.rowClicked}
  loading={loading}
/>
```

Фильтрация и пагинация в таблице не живут: поиск — `combine($items, $search, …)` или параметр запроса, страницы — `Pagination` рядом и `$page` в запросе. Таблица рисует то, что пришло.

`EMPTY` — константа на уровне модуля: `rows={data ?? []}` создаёт новый массив на каждый рендер, и движок каждый раз пересобирает модель.

## Что не делать

- **Колонки внутри компонента.** Новый массив — новая модель. Модуль или `useMemo`.
- **Новый объект строки на каждый рендер.** Пересобранный `rows.map((r) => ({ ...r }))` перерисует всё. Меняйте только то, что изменилось.
- **Индекс в `getRowId`.** Сломает выбор и замер при сортировке.
- **Закреплённая колонка без `size`.** Смещение посчитается от ширины по умолчанию, и колонки наедут друг на друга.
- **Tooltip/Popover с состоянием в каждой ячейке.** `IconButton tooltip` в ките — чистый CSS, его можно; всё, что вешает слушатели и состояние на каждую строку, умножается на число видимых строк.

## Замеры

`npm run dev` → `/table.html` — стенд с приёмкой из WMS: 857 позиций, Effector-модель, симуляция сканов. Параметры: `?count=5000`, `?plain` (без виртуализации), `?box` (своя прокрутка). Панель сверху показывает коммиты React, число строк и узлов в DOM, время от события до коммита и до первого свободного тика.

Тесты бюджета — `test/table.test.tsx`: одна ячейка на одно изменение среди восьмисот строк, ноль — на перерисовку родителя.
