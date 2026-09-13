import type { Story } from '@ladle/react'
import { useState } from 'react'
import { DataTable, defineColumns, type SortingState } from './index'
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
