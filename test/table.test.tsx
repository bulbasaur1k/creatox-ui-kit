import { expect, test } from 'bun:test'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DataTable, defineColumns, type SortingState } from '../src/table'

/* ── Бюджеты таблицы ───────────────────────────────────────────────────────
   Как и в perf.test.tsx, здесь ловятся не проценты, а возврат к другому
   классу решений: строка, которая перерисовывается от чужого обновления;
   сортировка, которую таблица делает сама вместо того, чтобы спросить;
   хэндлер, в который прилетает updater вместо значения.

   happy-dom не считает раскладку, поэтому виртуализация здесь выключена —
   виртуализатор без прямоугольника рисует только запас. Сколько строк лежит
   в DOM на настоящем движке, смотрит стенд demo/table.html.              */

interface Item {
  id: number
  name: string
  qty: number
}

const col = defineColumns<Item>()
let cellRenders = 0

const COLUMNS = col.columns([
  col.accessor('name', { header: 'Name' }),
  col.accessor('qty', {
    header: 'Qty',
    enableSorting: false,
    cell: ({ getValue }) => {
      cellRenders++
      return getValue()
    },
  }),
])

const getRowId = (item: Item) => String(item.id)

function items(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: i, name: `item-${i}`, qty: i }))
}

function mount(node: React.ReactNode): { root: Root; host: HTMLElement } {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => root.render(node))
  return { root, host }
}

test('обновление одного объекта перерисовывает одну строку', () => {
  const rows = items(800)
  const { root, host } = mount(
    <DataTable rows={rows} columns={COLUMNS} getRowId={getRowId} virtual={false} />,
  )
  expect(host.querySelectorAll('tbody tr').length).toBe(800)

  cellRenders = 0
  // Новый массив, в нём один новый объект — так отдаёт стор после точечного
  // обновления. Остальные 799 строк таблица трогать не должна.
  const next = rows.map((item) => (item.id === 400 ? { ...item, qty: 999 } : item))
  act(() =>
    root.render(
      <DataTable rows={next} columns={COLUMNS} getRowId={getRowId} virtual={false} />,
    ),
  )
  expect(cellRenders).toBe(1)
  expect(host.querySelectorAll('tbody tr')[400]!.textContent).toContain('999')
  act(() => root.unmount())
})

test('сортировка по умолчанию не трогает порядок, а спрашивает', () => {
  const rows = items(5).reverse()
  const seen: SortingState[] = []
  const { root, host } = mount(
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      virtual={false}
      onSortingChange={(sorting) => seen.push(sorting)}
    />,
  )
  const button = host.querySelector('thead button')!
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))

  // Хэндлер получил значение, не функцию: Effector-событию нужен payload.
  expect(seen).toEqual([[{ id: 'name', desc: false }]])
  expect(host.querySelector('thead th')!.getAttribute('aria-sort')).toBe('ascending')
  // Строки остались в том порядке, в каком пришли: сортирует сервер.
  expect(host.querySelector('tbody tr')!.textContent).toContain('item-4')
  act(() => root.unmount())
})

test('sortMode="client" сортирует на месте', () => {
  const rows = items(5).reverse()
  const { root, host } = mount(
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      virtual={false}
      sortMode="client"
      defaultSorting={[{ id: 'name', desc: false }]}
    />,
  )
  expect(host.querySelector('tbody tr')!.textContent).toContain('item-0')
  act(() => root.unmount())
})

test('выбор строк отдаёт значение и держится на id, а не на индексе', () => {
  const rows = items(3)
  const seen: Record<string, true>[] = []
  const { root, host } = mount(
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      virtual={false}
      selectable
      onSelectionChange={(selection) => seen.push(selection)}
    />,
  )
  const boxes = host.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox]')
  expect(boxes.length).toBe(3)
  act(() => boxes[1]!.click())
  expect(seen.at(-1)).toEqual({ '1': true })
  expect(host.querySelectorAll('tbody tr')[1]!.getAttribute('aria-selected')).toBe('true')
  act(() => root.unmount())
})

test('пустая таблица говорит об этом словами, а не пустотой', () => {
  const { root, host } = mount(
    <DataTable rows={[]} columns={COLUMNS} getRowId={getRowId} virtual={false} />,
  )
  expect(host.textContent).toContain('Nothing found')
  act(() => root.unmount())
})

test('перерисовка родителя с теми же строками не трогает ячейки', () => {
  const rows = items(800)
  const render = (rowProps: (item: Item) => { interactive: boolean }) => (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      virtual={false}
      selectable
      rowProps={rowProps}
      onRowClick={() => {}}
    />
  )
  const { root } = mount(render((item) => ({ interactive: item.qty > 0 })))
  cellRenders = 0
  // Родитель отрисовался заново и передал новые замыкания — обычное дело в
  // продукте. Строкам достаются те же объекты и те же примитивы, и ни одна
  // ячейка не должна пересчитаться.
  act(() => root.render(render((item) => ({ interactive: item.qty > 0 }))))
  expect(cellRenders).toBe(0)
  act(() => root.unmount())
})

test('inline-объект pinned не считается сменой колонок', () => {
  const rows = items(300)
  const render = () => (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      virtual={false}
      pinned={{ start: ['name'] }}
    />
  )
  const { root, host } = mount(render())
  expect(host.querySelector('tbody td')!.className).toContain('sticky')
  cellRenders = 0
  act(() => root.render(render()))
  expect(cellRenders).toBe(0)
  act(() => root.unmount())
})

test('строка-деталь появляется по кнопке и уходит по ней же', () => {
  const rows = items(3)
  const { root, host } = mount(
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      virtual={false}
      renderDetail={(item) => <div data-testid="detail">about {item.name}</div>}
    />,
  )
  expect(host.querySelectorAll('tbody tr').length).toBe(3)
  const toggle = host.querySelector<HTMLButtonElement>('tbody button[aria-expanded]')!
  act(() => toggle.click())
  expect(host.querySelectorAll('tbody tr').length).toBe(4)
  expect(host.querySelector('[data-detail]')!.textContent).toContain('about item-0')
  act(() => host.querySelector<HTMLButtonElement>('tbody button[aria-expanded]')!.click())
  expect(host.querySelectorAll('tbody tr').length).toBe(3)
  act(() => root.unmount())
})

test('дерево: дети появляются под родителем с отступом', () => {
  interface Node {
    id: number
    name: string
    qty: number
    kids?: Node[]
  }
  const tree: Node[] = [
    { id: 1, name: 'root', qty: 0, kids: [{ id: 2, name: 'child', qty: 1 }] },
    { id: 3, name: 'leaf', qty: 2 },
  ]
  const seen: unknown[] = []
  const { root, host } = mount(
    <DataTable
      rows={tree}
      columns={COLUMNS as never}
      getRowId={(n: Node) => String(n.id)}
      getSubRows={(n: Node) => n.kids}
      onExpandedChange={(e) => seen.push(e)}
      virtual={false}
    />,
  )
  expect(host.querySelectorAll('tbody tr').length).toBe(2)
  act(() => host.querySelector<HTMLButtonElement>('tbody button[aria-expanded]')!.click())
  expect(seen).toEqual([{ '1': true }])
  const trs = host.querySelectorAll<HTMLElement>('tbody tr')
  expect(trs.length).toBe(3)
  expect(trs[1]!.textContent).toContain('child')
  expect(trs[1]!.querySelector('td')!.style.paddingInlineStart).toBe('1.5rem')
  act(() => root.unmount())
})
