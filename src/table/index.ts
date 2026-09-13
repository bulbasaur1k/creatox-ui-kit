/**
 * creatox-ui-kit/table
 *
 * A data table on a headless engine. Separate entry point on purpose: the
 * engine and the virtualizer together weigh more than the rest of the kit,
 * and a product with three short tables should not pay for them. Both are
 * optional peer dependencies — install them alongside the kit to use this.
 *
 *   import { DataTable, defineColumns } from 'creatox-ui-kit/table'
 */

export {
  DataTable,
  type DataTableProps,
  type DataTableRowProps,
  type SortingState,
  type RowSelectionState,
} from './DataTable'
export {
  defineColumns,
  dataTableFeatures,
  type DataTableColumn,
  type DataTableColumnMeta,
  type DataTableFeatures,
} from './features'
