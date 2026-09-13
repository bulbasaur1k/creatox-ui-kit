import type { Story } from '@ladle/react'
import { useMemo, useState } from 'react'
import { DataTable, defineColumns, type SortingState } from './index'
import { Input } from '../primitives/Field'
import { Status } from '../primitives/Status'
import { Text } from '../primitives/Text'
import { Stack } from '../layout/Stack'
import type { Tone } from '../primitives/Badge'

export default { title: 'Table / DataTable' }

interface Deployment {
  id: string
  version: string
  actor: string
  status: string
  tone: Tone
  seconds: number
}

const ROWS: Deployment[] = Array.from({ length: 2000 }, (_, i) => ({
  id: `#${1000 - i}`,
  version: `v1.${Math.floor(i / 40)}.${i % 40}`,
  actor: ['pipeline', 'd.kozin', 'release-bot'][i % 3]!,
  status: ['Succeeded', 'Failed', 'Running'][i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0]!,
  tone: i % 5 === 0 ? 'danger' : i % 7 === 0 ? 'info' : 'success',
  seconds: 30 + ((i * 37) % 400),
}))

const col = defineColumns<Deployment>()
const COLUMNS = col.columns([
  col.accessor('id', { header: 'Deployment', size: 120, meta: { mono: true } }),
  col.accessor('version', { header: 'Version', size: 110, meta: { mono: true } }),
  col.accessor('actor', { header: 'Triggered by', size: 140 }),
  col.accessor('status', {
    header: 'Status',
    size: 130,
    cell: ({ row, getValue }) => <Status tone={row.original.tone}>{getValue()}</Status>,
  }),
  col.accessor('seconds', {
    header: 'Duration',
    size: 110,
    meta: { align: 'end', mono: true },
    cell: ({ getValue }) => `${Math.floor(getValue() / 60)}m ${getValue() % 60}s`,
  }),
])

const getRowId = (d: Deployment) => d.id

/**
 * Two thousand rows in a box of its own. Scroll it: the body never holds
 * more than a screenful, and the header stays where it is.
 */
export const Virtualized: Story = () => (
  <DataTable
    rows={ROWS}
    columns={COLUMNS}
    getRowId={getRowId}
    density="compact"
    bounded
    maxHeight="24rem"
    pinned={{ start: ['id'] }}
    rowProps={(d) => (d.tone === 'danger' ? { tone: 'danger' } : undefined)}
  />
)

/**
 * The state lives outside: sorting is reported and applied by whoever owns
 * the rows — here a `useState`, in a product an Effector store. The table
 * never reorders anything itself unless told `sortMode="client"`.
 */
export const ServerSorting: Story = () => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selection, setSelection] = useState<Record<string, true>>({})
  const sorted = ROWS.slice(0, 40).sort((a, b) => {
    const [first] = sorting
    if (!first) return 0
    const x = a[first.id as keyof Deployment]
    const y = b[first.id as keyof Deployment]
    const order =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y))
    return first.desc ? -order : order
  })
  return (
    <Stack gap={3}>
      <Text variant="meta" tone="muted">
        sorting: {JSON.stringify(sorting)} · selected: {Object.keys(selection).length}
      </Text>
      <DataTable
        rows={sorted}
        columns={COLUMNS}
        getRowId={getRowId}
        bounded
        maxHeight="20rem"
        sorting={sorting}
        onSortingChange={setSorting}
        selectable
        selection={selection}
        onSelectionChange={setSelection}
      />
    </Stack>
  )
}

export const States: Story = () => (
  <Stack gap={6}>
    <Stack gap={2}>
      <Text variant="label">Loading, nothing yet</Text>
      <DataTable rows={[]} columns={COLUMNS} getRowId={getRowId} bounded loading />
    </Stack>
    <Stack gap={2}>
      <Text variant="label">Empty</Text>
      <DataTable
        rows={[]}
        columns={COLUMNS}
        getRowId={getRowId}
        bounded
        empty="No deployments match the filter"
      />
    </Stack>
    <Stack gap={2}>
      <Text variant="label">Refreshing over existing rows</Text>
      <DataTable
        rows={ROWS.slice(0, 4)}
        columns={COLUMNS}
        getRowId={getRowId}
        bounded
        loading
        virtual={false}
      />
    </Stack>
  </Stack>
)

/* ── Nested rows ─────────────────────────────────────────────────────────── */

interface Cell {
  id: string
  name: string
  items: number
  children?: Cell[]
}

const CELLS: Cell[] = [
  {
    id: 'A',
    name: 'Building A',
    items: 1240,
    children: [
      {
        id: 'A-1',
        name: 'Row 1',
        items: 800,
        children: [{ id: 'A-1-3', name: 'Shelf 3', items: 120 }],
      },
      { id: 'A-2', name: 'Row 2', items: 440 },
    ],
  },
  {
    id: 'B',
    name: 'Building B',
    items: 310,
    children: [{ id: 'B-1', name: 'Row 1', items: 310 }],
  },
]

const cell = defineColumns<Cell>()
const CELL_COLUMNS = cell.columns([
  cell.accessor('name', { header: 'Location' }),
  cell.accessor('items', {
    header: 'Items',
    size: 100,
    meta: { align: 'end', mono: true },
  }),
])

/**
 * A tree: `getSubRows` says where the children are, the expander column
 * appears on its own, and the indent says the rest. Expansion state is a
 * controlled prop like sorting — an Effector store can own it.
 */
export const Tree: Story = () => (
  <DataTable
    rows={CELLS}
    columns={CELL_COLUMNS}
    getRowId={(c) => c.id}
    getSubRows={(c) => c.children}
    defaultExpanded={{ A: true }}
    bounded
    virtual={false}
  />
)

/**
 * A detail panel under a row — for what does not fit in the columns. The
 * panel is whatever the product draws; the table only makes room for it.
 */
export const DetailRows: Story = () => (
  <DataTable
    rows={ROWS.slice(0, 6)}
    columns={COLUMNS}
    getRowId={getRowId}
    renderDetail={(d) => (
      <Text variant="meta" tone="muted">
        {d.id} was triggered by {d.actor} and ran for {d.seconds}s. Logs, diff and the
        rollback control would go here.
      </Text>
    )}
    bounded
  />
)

/* ── Editable cells ──────────────────────────────────────────────────────── */

/**
 * Editing is the cell's business, not the table's. A cell component holds
 * its draft locally, commits on Enter or blur, and the row is drawn again
 * only when the committed value comes back through the rows. The table
 * guarantees one thing: a row whose object did not change keeps its cells
 * mounted, so the draft survives every other row's update.
 */
function EditableNumber({
  value,
  onCommit,
}: {
  value: number
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null && draft !== '' && Number(draft) !== value) onCommit(Number(draft))
    setDraft(null)
  }
  return (
    <Input
      controlSize="sm"
      type="number"
      mono
      className="w-24 text-right"
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

export const EditableCells: Story = () => {
  const [rows, setRows] = useState(() => ROWS.slice(0, 5))
  const columns = useMemo(
    () =>
      col.columns([
        col.accessor('id', { header: 'Deployment', size: 120, meta: { mono: true } }),
        col.accessor('actor', { header: 'Triggered by' }),
        col.accessor('seconds', {
          header: 'Duration, s',
          size: 140,
          meta: { align: 'end' },
          cell: ({ row, getValue }) => (
            <EditableNumber
              value={getValue()}
              onCommit={(seconds) =>
                setRows((list) =>
                  list.map((d) => (d.id === row.original.id ? { ...d, seconds } : d)),
                )
              }
            />
          ),
        }),
      ]),
    [],
  )
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      bounded
      virtual={false}
    />
  )
}
