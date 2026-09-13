import {
  columnPinningFeature,
  columnSizingFeature,
  createColumnHelper,
  createExpandedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type ColumnHelper,
  type RowData,
} from '@tanstack/react-table'
import type { Tone } from '../primitives/Badge'

/* ── The engine ────────────────────────────────────────────────────────────
   TanStack Table v9, registered feature by feature. Each plugin brings its
   own state slice and instance methods and nothing else ships, which is why
   this list is short: sorting, selection, pinning and sizing are what a table
   of objects needs, and filtering, grouping and pagination are left out on
   purpose — those run on the server in every product this kit serves, and a
   client-side copy of them would only sort the page it can see.

   Expanding is here for nested rows — a tree of sub-rows, or a detail panel
   under an open row — and costs a column only when a table asks for it.

   Sorting is registered with a client row model all the same, because a
   table of a few hundred rows that arrived in one response has no server to
   ask. The default is still `server`: see DataTable's `sortMode`.          */

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, text: sortFn_text },
  rowSelectionFeature,
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
  columnSizingFeature,
  columnPinningFeature,
})

/**
 * What a column can say about how its cells are drawn. Everything here maps
 * onto a `Td` prop; the engine carries it through untouched.
 */
export interface DataTableColumnMeta<T extends RowData> {
  align?: 'start' | 'center' | 'end'
  /** Machine values: ids, sizes, durations, hashes. */
  mono?: boolean
  /** Marks one cell out of the column — the `-surface` fills, see Td. */
  tone?: (row: T) => Tone | undefined
  /** Extra classes on every cell of the column. */
  cellClassName?: string
}

/**
 * The feature set, with the meta type threaded through so `meta.tone` sees
 * the row type. The value is the same object; only the type differs, and
 * the phantom `columnMeta` slot is exactly what TanStack provides for this.
 */
export type DataTableFeatures<T extends RowData> = typeof dataTableFeatures & {
  columnMeta: DataTableColumnMeta<T>
}

export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures<T>, T, any>

/**
 * Typed column builder. `accessor` for a value out of the row, `display` for
 * a column that is not a value — actions, a checkbox, a row number.
 *
 *   const col = defineColumns<Invoice>()
 *   const columns = col.columns([
 *     col.accessor('number', { header: 'Invoice', size: 120 }),
 *     col.display({ id: 'actions', cell: ({ row }) => <RowActions>…</RowActions> }),
 *   ])
 *
 * Build the array once, at module scope or in a `useMemo`: the engine keys
 * its caches on the array's identity, and a new array every render means a
 * new column model every render.
 */
export function defineColumns<T extends RowData>(): ColumnHelper<
  DataTableFeatures<T>,
  T
> {
  return createColumnHelper<DataTableFeatures<T>, T>()
}
