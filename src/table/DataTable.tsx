import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import {
  flexRender,
  useTable,
  type Column,
  type ExpandedState,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import {
  measureElement,
  useVirtualizer,
  useWindowVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import { cx } from '../util/cx'
import { useLabels, type Labels } from '../util/intl'
import { useSettled } from '../util/settle'
import { chevronRight } from '../icons'
import { Icon } from '../primitives/Icon'
import { Checkbox } from '../primitives/Choice'
import { EmptyState, Skeleton } from '../primitives/Feedback'
import { SortButton, Table, Td, Th, Tr, type TableProps } from '../primitives/Table'
import type { Tone } from '../primitives/Badge'
import {
  dataTableFeatures,
  type DataTableColumn,
  type DataTableColumnMeta,
  type DataTableFeatures,
} from './features'

export type { SortingState, RowSelectionState, ExpandedState }

/* ── DataTable ─────────────────────────────────────────────────────────────
   Every row is a component, and every visible row is the only kind there is.

   The first half is what keeps a scan cheap: a product updates one object,
   its store hands the table a new array with one new element, and the one
   row whose object changed is the one row React touches. Nothing here asks a
   column which fields it depends on — object identity already says it.

   The second half is what keeps the page cheap: eight hundred rows of twelve
   cells is ten thousand nodes for the browser to lay out and paint, and
   scrolling past them all is what a user actually does with a long table.
   So the body holds only what is on screen, plus two spacer rows that stand
   in for the rest. The table stays a real <table> — a screen reader, a
   column width and a sticky header all keep working — which is why the rows
   are not absolutely positioned the way the engine's own example does it.

   Sorting, filtering and pagination are the server's. The table reports
   what the user asked for through plain handlers and draws whatever comes
   back, so the state can live wherever the product keeps state — an
   Effector store needs nothing more than `useUnit` on both ends.          */

export interface DataTableRowProps {
  tone?: Tone
  /** Cursor and press feedback — for rows that open something. */
  interactive?: boolean
  className?: string
}

export interface DataTableProps<T extends RowData> extends Omit<
  TableProps,
  'children' | 'onSelect' | 'wrapperProps'
> {
  rows: readonly T[]
  /** Build once — at module scope or in a `useMemo`. See `defineColumns`. */
  columns: readonly DataTableColumn<T>[]
  /** A stable identity: selection, keys and row measurement all hang off it. */
  getRowId: (row: T) => string

  /* Sorting. Controlled when `sorting` is given, otherwise kept inside. */
  sorting?: SortingState
  defaultSorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  /**
   * `server` (default): the rows arrive in order and the table only reports
   * what was asked. `client`: the table sorts what it was given — for a
   * short list that came in one response and has no server to ask.
   */
  sortMode?: 'server' | 'client'
  /** Shift+click adds a column to the sort instead of replacing it. */
  multiSort?: boolean

  /* Selection. Controlled when `selection` is given. */
  selectable?: boolean | 'single'
  selection?: RowSelectionState
  defaultSelection?: RowSelectionState
  onSelectionChange?: (selection: RowSelectionState) => void

  /* Nested rows. Either a tree — `getSubRows` returns the children of a row
     — or a detail panel drawn under an open row by `renderDetail`. Both are
     opt-in: a table that wants neither has no expander column. */
  getSubRows?: (row: T) => readonly T[] | undefined
  renderDetail?: (row: T) => ReactNode
  expanded?: ExpandedState
  defaultExpanded?: ExpandedState
  onExpandedChange?: (expanded: ExpandedState) => void

  /** Columns that stay put while the rest scrolls sideways. They need a `size`. */
  pinned?: { start?: readonly string[]; end?: readonly string[] }

  onRowClick?: (row: T, event: MouseEvent<HTMLTableRowElement>) => void
  /** Per-row presentation: a fill for a finished object, a cursor for an openable one. */
  rowProps?: (row: T) => DataTableRowProps | undefined

  /**
   * Draw only the rows on screen. On by default; turn it off for a table
   * that is printed, or short enough that a scrollbar never appears.
   */
  virtual?: boolean
  /**
   * Makes the table its own scrolling box. Without it the page scrolls and
   * the table follows the window — which is what a table that owns the page
   * wants, and what a table inside a panel does not.
   */
  maxHeight?: string
  /** A guess at row height in px; rows are measured once drawn. */
  estimateRowHeight?: number
  /** Rows drawn beyond the visible edge, so a scroll does not show blank. */
  overscan?: number

  /**
   * Shown late and held once shown — see `useSettled`: a table that answers
   * inside ~150ms never dims, one that took longer stays dimmed ~400ms.
   */
  loading?: boolean
  empty?: ReactNode
}

const NO_SORTING: SortingState = []
const NO_SELECTION: RowSelectionState = {}
const NO_EXPANDED: ExpandedState = {}
const NO_PINNING = { start: [] as string[], end: [] as string[] }
/* The table controls its own state through props, so the hook has nothing
   to subscribe to: a state change reaches it as a prop, not as a store
   notification, and subscribing to both would render everything twice. */
const selectNothing = () => null

const ESTIMATE: Record<NonNullable<TableProps['density']>, number> = {
  compact: 28,
  default: 36,
  comfortable: 44,
}

const SELECT_COLUMN = '__select'
const EXPAND_COLUMN = '__expand'

/**
 * Value or updater, the way the engine calls its change handlers, resolved
 * against the latest state and handed on as a value. Products want values:
 * an Effector event takes the payload as is.
 */
function useControllable<S>(
  controlled: S | undefined,
  initial: S,
  onChange: ((next: S) => void) | undefined,
): [S, (updater: Updater<S>) => void] {
  const [inner, setInner] = useState(initial)
  const current = controlled ?? inner
  const latest = useRef({ current, controlled: controlled !== undefined, onChange })
  latest.current = { current, controlled: controlled !== undefined, onChange }

  const set = useCallback((updater: Updater<S>) => {
    const { current, controlled, onChange } = latest.current
    const next =
      typeof updater === 'function' ? (updater as (old: S) => S)(current) : updater
    if (!controlled) setInner(next)
    onChange?.(next)
  }, [])

  return [current, set]
}

/** The latest value of a callback behind a stable identity, so memoised rows do not re-render when a parent recreates its closures. */
function useStable<A extends unknown[]>(fn: ((...args: A) => void) | undefined) {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: A) => ref.current?.(...args), [])
}

export function DataTable<T extends RowData>({
  rows,
  columns,
  getRowId,
  sorting: sortingProp,
  defaultSorting = NO_SORTING,
  onSortingChange,
  sortMode = 'server',
  multiSort = false,
  selectable = false,
  selection: selectionProp,
  defaultSelection = NO_SELECTION,
  onSelectionChange,
  getSubRows,
  renderDetail,
  expanded: expandedProp,
  defaultExpanded = NO_EXPANDED,
  onExpandedChange,
  pinned,
  onRowClick,
  rowProps,
  virtual = true,
  maxHeight,
  estimateRowHeight,
  overscan = 8,
  loading = false,
  empty,
  density = 'default',
  className,
  ...tableProps
}: DataTableProps<T>) {
  const labels = useLabels()
  const [sorting, setSorting] = useControllable(
    sortingProp,
    defaultSorting,
    onSortingChange,
  )
  const [selection, setSelection] = useControllable(
    selectionProp,
    defaultSelection,
    onSelectionChange,
  )
  const expandable = getSubRows !== undefined || renderDetail !== undefined
  const [expanded, setExpanded] = useControllable(
    expandedProp,
    defaultExpanded,
    onExpandedChange,
  )
  const busy = useSettled(loading)

  /* Keyed on the column ids, not on the object: `pinned={{ start: ['id'] }}`
     is a new object every render of the parent, and a new pinning state is
     a new column order — which every row's memo would take as a change. */
  const pinStart = pinned?.start?.join('\0') ?? ''
  const pinEnd = pinned?.end?.join('\0') ?? ''
  const columnPinning = useMemo(() => {
    const start = pinStart ? pinStart.split('\0') : []
    const end = pinEnd ? pinEnd.split('\0') : []
    if (expandable) start.unshift(EXPAND_COLUMN)
    if (selectable) start.unshift(SELECT_COLUMN)
    return start.length === 0 && end.length === 0 ? NO_PINNING : { start, end }
  }, [pinStart, pinEnd, selectable, expandable])

  const allColumns = useMemo<readonly DataTableColumn<T>[]>(
    () => [
      ...(selectable ? [selectColumn as DataTableColumn<T>] : []),
      ...(expandable ? [expandColumn as DataTableColumn<T>] : []),
      ...columns,
    ],
    [columns, selectable, expandable],
  )

  const table = useTable<DataTableFeatures<T>, T, null>(
    {
      features: dataTableFeatures as DataTableFeatures<T>,
      data: rows,
      columns: allColumns,
      getRowId,
      getSubRows: getSubRows ? (row) => getSubRows(row) : undefined,
      state: { sorting, rowSelection: selection, columnPinning, expanded },
      onSortingChange: setSorting,
      onRowSelectionChange: setSelection,
      onExpandedChange: setExpanded,
      enableExpanding: expandable,
      // A detail panel opens on any row; a tree opens on rows with children.
      getRowCanExpand: renderDetail ? () => true : undefined,
      manualSorting: sortMode === 'server',
      enableMultiSort: multiSort,
      enableSortingRemoval: true,
      enableRowSelection: selectable !== false,
      enableMultiRowSelection: selectable !== 'single',
    },
    selectNothing,
  )

  /* Pinned first, then the rest, then pinned to the end: one ordered list of
     leaf columns that header and body both walk, so they can never disagree
     about where a column is.

     Keyed on the three lists, not on `table`: the hook hands back a fresh
     wrapper object every render, while the lists underneath are memoised by
     the engine and only change when the definitions or the pinning do. The
     identity of `ordered` is what every row's memo compares against, so a
     new array here would be every row drawn again. */
  const startColumns = table.getStartLeafColumns()
  const centerColumns = table.getCenterLeafColumns()
  const endColumns = table.getEndLeafColumns()
  const ordered = useMemo(
    () => [...startColumns, ...centerColumns, ...endColumns],
    [startColumns, centerColumns, endColumns],
  )
  const flatHeaders = table.getFlatHeaders()
  const headersById = useMemo(() => {
    const map = new Map<string, (typeof flatHeaders)[number]>()
    for (const header of flatHeaders) map.set(header.column.id, header)
    return map
  }, [flatHeaders])

  const modelRows = table.getRowModel().rows

  const clickRow = useStable(onRowClick)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const estimate = estimateRowHeight ?? ESTIMATE[density]

  const renderRow = (
    row: Row<DataTableFeatures<T>, T>,
    index: number,
    measure?: Measure,
  ) => {
    const extra = rowProps?.(row.original)
    return (
      <BodyRow
        key={row.id}
        row={row}
        index={index}
        columns={ordered}
        selected={selectable !== false && selection[row.id] === true}
        selectable={selectable !== false}
        onClick={onRowClick ? clickRow : undefined}
        tone={extra?.tone}
        interactive={extra?.interactive}
        className={extra?.className}
        measure={measure}
        expandable={expandable}
        expanded={expandable && row.getIsExpanded()}
        depth={row.depth}
        detail={renderDetail}
        labels={labels}
      />
    )
  }

  const colSpan = ordered.length
  // An empty table that is loading shows the skeleton once the wait has
  // settled, and nothing at all before that: a "nothing found" that flashes
  // for a hundred milliseconds ahead of the rows is a lie told briefly.
  const showSkeleton = busy && modelRows.length === 0
  const showBlank = loading && !busy && modelRows.length === 0
  const showEmpty = !loading && modelRows.length === 0

  return (
    <Table
      density={density}
      aria-busy={busy || undefined}
      aria-rowcount={modelRows.length}
      aria-multiselectable={selectable === true || undefined}
      wrapperProps={{
        ref: wrapperRef,
        style: maxHeight ? { maxHeight } : undefined,
        // A scrolling box of its own only when asked. Any overflow but
        // `visible` makes the wrapper a scroll container, and the sticky header
        // would then stick to the wrapper — which is not scrolling — instead of
        // to the window that is. A table wider than the page scrolls the page.
        className: maxHeight ? undefined : 'overflow-visible',
      }}
      className={cx('table-fixed', className)}
      {...tableProps}
    >
      <colgroup>
        {ordered.map((column) => (
          <col
            key={column.id}
            style={
              column.columnDef.size !== undefined
                ? { width: column.getSize() }
                : undefined
            }
          />
        ))}
      </colgroup>
      <thead>
        <tr>
          {ordered.map((column) => {
            const header = headersById.get(column.id)
            const meta = column.columnDef.meta as DataTableColumnMeta<T> | undefined
            const sortable = column.getCanSort()
            const sorted = column.getIsSorted()
            const content = header
              ? flexRender(column.columnDef.header, header.getContext())
              : null
            return (
              <Th
                key={column.id}
                align={meta?.align}
                className={pinnedClass(column, 'z-20')}
                style={pinnedStyle(column)}
                aria-sort={
                  sorted === 'asc'
                    ? 'ascending'
                    : sorted === 'desc'
                      ? 'descending'
                      : undefined
                }
              >
                {sortable ? (
                  <SortButton
                    direction={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                    onClick={column.getToggleSortingHandler()}
                  >
                    {content}
                  </SortButton>
                ) : column.id === SELECT_COLUMN ? (
                  selectable === true && (
                    <HeaderCheckbox
                      all={table.getIsAllRowsSelected()}
                      some={table.getIsSomeRowsSelected()}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                      label={labels.selectAll}
                    />
                  )
                ) : (
                  content
                )}
              </Th>
            )
          })}
        </tr>
      </thead>
      {showSkeleton ? (
        <tbody aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {ordered.map((column) => (
                <Td key={column.id}>
                  <Skeleton width={i % 2 ? '60%' : '80%'} />
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      ) : showBlank ? (
        <tbody />
      ) : showEmpty ? (
        <tbody>
          <tr>
            <td colSpan={colSpan}>
              {typeof empty === 'string' || empty === undefined ? (
                <EmptyState size="inline" title={empty ?? labels.empty} />
              ) : (
                empty
              )}
            </td>
          </tr>
        </tbody>
      ) : !virtual ? (
        <tbody className={cx(busy && 'opacity-60 transition-opacity duration-snap')}>
          {modelRows.map((row, index) => renderRow(row, index))}
        </tbody>
      ) : maxHeight ? (
        <ContainerBody
          rows={modelRows}
          colSpan={colSpan}
          estimate={estimate}
          overscan={overscan}
          scrollRef={wrapperRef}
          loading={busy}
          renderRow={renderRow}
        />
      ) : (
        <WindowBody
          rows={modelRows}
          colSpan={colSpan}
          estimate={estimate}
          overscan={overscan}
          loading={busy}
          renderRow={renderRow}
        />
      )}
    </Table>
  )
}

/* ── Virtual bodies ────────────────────────────────────────────────────────
   Two components rather than one with a flag, because the two virtualizer
   hooks cannot be swapped inside a single component and the switch happens
   once, at mount. Both hand the same three things to the same renderer: the
   visible items, the height of what is above them, the height of what is
   below.                                                                    */

type Measure = (node: HTMLTableRowElement | null) => void

/**
 * Row heights come from the ResizeObserver, never from a synchronous read.
 * The virtualizer's default measures a row the moment its ref attaches, which
 * is a forced layout per row — twenty-eight of them on a first paint and one
 * for every row that scrolls in. The observer reports the same sizes a frame
 * later in one batch, and until then the estimate stands.
 */
function measureLazily<S extends Element | Window>(
  node: HTMLTableRowElement,
  entry: ResizeObserverEntry | undefined,
  instance: Virtualizer<S, HTMLTableRowElement>,
): number {
  const index = instance.indexFromElement(node)
  let size: number
  if (entry) {
    size = measureElement(node, entry, instance)
  } else if (instance.itemSizeCache.has(instance.options.getItemKey(index))) {
    // Attached again after a first measurement: a detail panel opened or
    // closed under the row, and the observer, which watches the row alone,
    // would not say. One forced read, on the one row that changed.
    size = node.offsetHeight
  } else {
    size = instance.options.estimateSize(index)
  }
  // The detail panel is a second <tr>: it belongs to the same item as far as
  // the scroll geometry is concerned, so its height counts here.
  const detail = node.nextElementSibling
  if (detail instanceof HTMLElement && detail.hasAttribute('data-detail')) {
    size += detail.offsetHeight
  }
  return size
}

interface BodyProps<T extends RowData> {
  rows: Row<DataTableFeatures<T>, T>[]
  colSpan: number
  estimate: number
  overscan: number
  loading: boolean
  renderRow: (
    row: Row<DataTableFeatures<T>, T>,
    index: number,
    measure: Measure,
  ) => ReactNode
}

function ContainerBody<T extends RowData>({
  rows,
  scrollRef,
  estimate,
  overscan,
  ...rest
}: BodyProps<T> & { scrollRef: RefObject<HTMLDivElement | null> }) {
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimate,
    overscan,
    getItemKey: (index) => rows[index]!.id,
    measureElement: measureLazily,
  })
  return (
    <VirtualRows
      rows={rows}
      items={virtualizer.getVirtualItems()}
      total={virtualizer.getTotalSize()}
      offset={0}
      measure={virtualizer.measureElement}
      {...rest}
    />
  )
}

function WindowBody<T extends RowData>({
  rows,
  estimate,
  overscan,
  ...rest
}: BodyProps<T>) {
  /* Where the body starts on the page. The window virtualizer counts from
     the top of the document, so it has to be told how far down the table
     sits. Read after every commit — whatever moved the table is a render
     of something — and on resize, which moves it without one. Setting the
     same value again is a no-op, so this does not loop. */
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const [margin, setMargin] = useState(0)
  const measure = useCallback(() => {
    const node = bodyRef.current
    if (!node) return
    const top = node.getBoundingClientRect().top + window.scrollY
    setMargin((current) => (Math.abs(current - top) < 1 ? current : top))
  }, [])
  useLayoutEffect(measure)
  useLayoutEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const virtualizer = useWindowVirtualizer<HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => estimate,
    overscan,
    scrollMargin: margin,
    getItemKey: (index) => rows[index]!.id,
    measureElement: measureLazily,
  })
  return (
    <VirtualRows
      ref={bodyRef}
      rows={rows}
      items={virtualizer.getVirtualItems()}
      total={virtualizer.getTotalSize()}
      offset={margin}
      measure={virtualizer.measureElement}
      {...rest}
    />
  )
}

interface VirtualRowsProps<T extends RowData> extends Omit<
  BodyProps<T>,
  'estimate' | 'overscan'
> {
  ref?: Ref<HTMLTableSectionElement>
  items: VirtualItem[]
  total: number
  /** What the item starts are measured from; the window virtualizer counts from the page top. */
  offset: number
  measure: Measure
}

function VirtualRows<T extends RowData>({
  ref,
  rows,
  items,
  total,
  offset,
  measure,
  colSpan,
  loading,
  renderRow,
}: VirtualRowsProps<T>) {
  const first = items[0]
  const last = items[items.length - 1]
  const before = first ? first.start - offset : 0
  const after = last ? total - (last.end - offset) : 0

  return (
    <tbody
      ref={ref}
      className={cx(loading && 'opacity-60 transition-opacity duration-snap')}
    >
      {before > 0 && <Spacer height={before} colSpan={colSpan} />}
      {items.map((item) => renderRow(rows[item.index]!, item.index, measure))}
      {after > 0 && <Spacer height={after} colSpan={colSpan} />}
    </tbody>
  )
}

/* Border-less on purpose: a spacer is not a row, and the ruled line under
   every cell would draw one at the top and bottom of the visible window. */
function Spacer({ height, colSpan }: { height: number; colSpan: number }) {
  return (
    <tr aria-hidden="true" style={{ height }}>
      <td colSpan={colSpan} className="p-0" />
    </tr>
  )
}

/* ── Rows ──────────────────────────────────────────────────────────────────*/

interface BodyRowProps<T extends RowData> {
  row: Row<DataTableFeatures<T>, T>
  index: number
  columns: Column<DataTableFeatures<T>, T, unknown>[]
  selected: boolean
  selectable: boolean
  onClick?: (row: T, event: MouseEvent<HTMLTableRowElement>) => void
  tone?: Tone
  interactive?: boolean
  className?: string
  measure?: Measure
  expandable: boolean
  expanded: boolean
  depth: number
  detail?: (row: T) => ReactNode
  labels: Labels
}

/**
 * Compared on the object, not on the engine's row: the engine rebuilds its
 * row objects whenever the array changes, and a rebuilt row over the same
 * object draws the same cells. `index` is in the list for the display-index
 * column, which is the one thing a row can show that is not in its object.
 */
const BodyRow = memo(BodyRowImpl, (a, b) => {
  return (
    a.row.original === b.row.original &&
    a.index === b.index &&
    a.columns === b.columns &&
    a.selected === b.selected &&
    a.selectable === b.selectable &&
    a.onClick === b.onClick &&
    a.tone === b.tone &&
    a.interactive === b.interactive &&
    a.className === b.className &&
    a.measure === b.measure &&
    a.expandable === b.expandable &&
    a.expanded === b.expanded &&
    a.depth === b.depth &&
    a.detail === b.detail &&
    a.labels === b.labels
  )
}) as typeof BodyRowImpl

function BodyRowImpl<T extends RowData>({
  row,
  index,
  columns,
  selected,
  selectable,
  onClick,
  tone,
  interactive,
  className,
  measure,
  expandable,
  expanded,
  depth,
  detail,
  labels,
}: BodyRowProps<T>) {
  const cells = row.getAllCellsByColumnId()
  // A new callback whenever the panel toggles, so React attaches the ref
  // again and the virtualizer measures the row with or without it.
  const measureRow = useMemo(
    () => (measure ? (node: HTMLTableRowElement | null) => measure(node) : undefined),
    [measure, expanded],
  )
  const canExpand = expandable && row.getCanExpand()
  return (
    <>
      <Tr
        ref={measureRow}
        data-index={index}
        aria-rowindex={index + 1}
        selected={selectable ? selected : undefined}
        interactive={interactive ?? onClick !== undefined}
        tone={tone}
        className={className}
        onClick={onClick ? (event) => onClick(row.original, event) : undefined}
      >
        {columns.map((column) => {
          const cell = cells[column.id]!
          const meta = column.columnDef.meta as DataTableColumnMeta<T> | undefined
          if (column.id === SELECT_COLUMN) {
            return (
              <Td
                key={column.id}
                align="center"
                className={cx(pinnedClass(column, 'z-[1]'), 'w-0')}
                style={pinnedStyle(column)}
                onClick={stop}
              >
                <Checkbox
                  className="items-center align-middle"
                  checked={selected}
                  onChange={row.getToggleSelectedHandler()}
                  aria-label={String(row.id)}
                />
              </Td>
            )
          }
          if (column.id === EXPAND_COLUMN) {
            return (
              <Td
                key={column.id}
                className={cx(pinnedClass(column, 'z-[1]'), 'w-0 py-0')}
                // Children sit one step in from their parent: the tree reads
                // from the indent alone, before anyone looks at a chevron.
                style={{
                  ...pinnedStyle(column),
                  paddingInlineStart: `${0.5 + depth}rem`,
                }}
                onClick={stop}
              >
                {canExpand && (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={expanded ? labels.collapseRow : labels.expandRow}
                    onClick={row.getToggleExpandedHandler()}
                    className={cx(
                      'inline-flex size-6 cursor-pointer items-center justify-center rounded-control',
                      'border-0 bg-transparent p-0 text-fg-muted hover:bg-hover hover:text-fg',
                    )}
                  >
                    <Icon
                      className={cx(
                        'transition-transform duration-snap ease-snap',
                        expanded && 'rotate-90',
                      )}
                    >
                      {chevronRight}
                    </Icon>
                  </button>
                )}
              </Td>
            )
          }
          return (
            <Td
              key={column.id}
              align={meta?.align}
              mono={meta?.mono}
              tone={meta?.tone?.(row.original)}
              className={cx(pinnedClass(column, 'z-[1]'), meta?.cellClassName)}
              style={pinnedStyle(column)}
            >
              {flexRender(column.columnDef.cell, cell.getContext())}
            </Td>
          )
        })}
      </Tr>
      {expanded && detail !== undefined && (
        <tr data-detail="">
          <td
            colSpan={columns.length}
            className="border-b-[length:var(--cx-hairline)] border-line bg-subtle px-3 py-3"
          >
            {detail(row.original)}
          </td>
        </tr>
      )}
    </>
  )
}

/* A click on the checkbox cell is a selection, not a row opening. */
function stop(event: MouseEvent) {
  event.stopPropagation()
}

/* ── Selection column ──────────────────────────────────────────────────────*/

const selectColumn: DataTableColumn<object> = {
  id: SELECT_COLUMN,
  header: '',
  size: 36,
  enableSorting: false,
}

const expandColumn: DataTableColumn<object> = {
  id: EXPAND_COLUMN,
  header: '',
  size: 36,
  enableSorting: false,
}

function HeaderCheckbox({
  all,
  some,
  onChange,
  label,
}: {
  all: boolean
  some: boolean
  onChange: (event: unknown) => void
  label: string
}) {
  // `indeterminate` is a DOM property, not an attribute — there is no
  // markup for it, so it is set on the node.
  const ref = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = some && !all
    },
    [some, all],
  )
  return (
    <Checkbox
      ref={ref}
      className="items-center align-middle"
      checked={all}
      onChange={onChange}
      aria-label={label}
    />
  )
}

/* ── Pinning ───────────────────────────────────────────────────────────────
   The engine computes where a pinned column starts; sticky positioning does
   the rest. `bg-raised` because a sticky cell with no fill shows the cells
   sliding under it.                                                         */

function pinnedClass<T extends RowData>(
  column: Column<DataTableFeatures<T>, T, unknown>,
  z: string,
) {
  return column.getIsPinned() ? cx('sticky bg-raised', z) : undefined
}

function pinnedStyle<T extends RowData>(
  column: Column<DataTableFeatures<T>, T, unknown>,
): CSSProperties | undefined {
  const position = column.getIsPinned()
  if (position === 'start') return { insetInlineStart: column.getStart('start') }
  if (position === 'end') return { insetInlineEnd: column.getAfter('end') }
  return undefined
}
