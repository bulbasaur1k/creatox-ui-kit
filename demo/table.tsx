import { Profiler, StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useUnit } from 'effector-react'
import '../src/styles/index.css'
import './perf'
import {
  Button,
  Field,
  Icon,
  IconButton,
  Input,
  Root,
  RowActions,
  Select,
  Status,
  Text,
  Toggle,
  LABELS_RU,
} from '../src/index'
import { pencil, refreshCw, triangleAlert } from '../src/icons'
import { DataTable, defineColumns } from '../src/table'
import { remainingOf, type InvoiceItem } from './table-data'
import * as model from './table-model'

/* Стенд таблицы: страница приёмки из WMS на 857 позиций, только вместо antd
   — DataTable, а вместо сервера — эффект с задержкой. Цифры сверху — не
   секундомер, а профилировщик React: сколько занял коммит на монтирование,
   на скан, на сортировку, и сколько строк при этом реально лежит в DOM.   */

const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
})
const num = new Intl.NumberFormat('ru-RU')

const col = defineColumns<InvoiceItem>()

/* Колонки — на уровне модуля, один раз. Тот же набор, что в WMS. */
const COLUMNS = col.columns([
  col.display({
    id: 'n',
    header: '№',
    size: 56,
    meta: { align: 'end', mono: true },
    cell: ({ row }) => {
      const i = row.getDisplayIndex()
      return (
        <span className="inline-flex items-center gap-1">
          {i === -1 ? '' : i + 1}
          {row.original.isChznTraceable && (
            <Status
              tone={row.original.isChznCodeAvailable ? 'success' : 'warning'}
              markOnly
            >
              {row.original.isChznCodeAvailable ? 'Код маркировки есть' : 'Кода нет'}
            </Status>
          )}
        </span>
      )
    },
  }),
  col.display({
    id: 'order',
    header: 'Заказ',
    size: 90,
    cell: () => <span className="text-fg-muted">—</span>,
  }),
  col.accessor('brand', {
    header: 'Бренд',
    size: 130,
    cell: ({ getValue }) => <span className="font-medium">{getValue() || '—'}</span>,
  }),
  col.accessor('article', { header: 'Артикул', size: 130, meta: { mono: true } }),
  col.accessor('name', {
    header: 'Наименование',
    cell: ({ getValue }) => <span className="line-clamp-2">{getValue()}</span>,
  }),
  col.accessor('client', {
    header: 'Клиент',
    size: 150,
    cell: ({ getValue }) => getValue() ?? <span className="text-fg-muted">—</span>,
  }),
  col.accessor('price', {
    header: 'Цена, ₽',
    size: 120,
    meta: { align: 'end', mono: true },
    cell: ({ getValue }) => rub.format(getValue()),
  }),
  col.accessor('quantity', {
    header: 'Кол-во',
    size: 90,
    meta: { align: 'end', mono: true },
    enableSorting: false,
    cell: ({ getValue }) => num.format(getValue()),
  }),
  col.accessor('receiptedQuantity', {
    header: 'Принято',
    size: 100,
    enableSorting: false,
    meta: {
      align: 'end',
      mono: true,
      tone: (row) => (row.receiptedQuantity > 0 ? 'success' : undefined),
    },
    cell: ({ getValue }) =>
      getValue() > 0 ? (
        <span className="font-medium text-success-fg">{num.format(getValue())}</span>
      ) : (
        <span className="text-fg-muted">0</span>
      ),
  }),
  col.accessor('blockedQuantity', {
    header: 'Блок',
    size: 90,
    enableSorting: false,
    meta: {
      align: 'end',
      mono: true,
      tone: (row) => (row.blockedQuantity > 0 ? 'danger' : undefined),
    },
    cell: ({ getValue }) =>
      getValue() > 0 ? (
        <span className="font-medium text-danger-fg">{num.format(getValue())}</span>
      ) : (
        <span className="text-fg-muted">0</span>
      ),
  }),
  col.display({
    id: 'comment',
    header: '',
    size: 44,
    meta: { align: 'center' },
    cell: ({ row }) =>
      row.original.comment ? (
        <IconButton
          size="sm"
          label={row.original.comment}
          tooltip
          tooltipSide="start"
          icon={<Icon>{pencil}</Icon>}
        />
      ) : null,
  }),
  col.display({
    id: 'actions',
    header: '',
    size: 88,
    cell: ({ row }) => {
      const item = row.original
      const processed = item.receiptedQuantity > 0 || item.blockedQuantity > 0
      return (
        <RowActions>
          {remainingOf(item) > 0 && (
            <IconButton
              size="sm"
              variant="danger"
              label="Заблокировать"
              tooltip
              icon={<Icon>{triangleAlert}</Icon>}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {processed && (
            <IconButton
              size="sm"
              label="Отменить"
              tooltip
              icon={<Icon>{refreshCw}</Icon>}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </RowActions>
      )
    },
  }),
])

const rowProps = (item: InvoiceItem) => {
  if (item.blockedQuantity >= item.quantity) return { tone: 'danger' as const }
  if (item.receiptedQuantity >= item.quantity) return { tone: 'success' as const }
  return { interactive: remainingOf(item) > 0 }
}

const getRowId = (item: InvoiceItem) => String(item.id)

/* ── Замеры ─────────────────────────────────────────────────────────────── */

interface Sample {
  label: string
  commit: number
  toCommit: number
  toIdle: number
}

const pending: { label: string; started: number }[] = []

/** Помечает начало действия; ближайший коммит React припишется ему. */
function mark(label: string) {
  pending.push({ label, started: performance.now() })
}

function Stand() {
  const {
    rows,
    sorting,
    selection,
    loading,
    count,
    search,
    scans,
    summary,
    lastClicked,
  } = useUnit({
    rows: model.$filteredItems,
    sorting: model.$sorting,
    selection: model.$selection,
    loading: model.$loading,
    count: model.$count,
    search: model.$search,
    scans: model.$scans,
    summary: model.$summary,
    lastClicked: model.$lastClicked,
  })
  const on = useUnit({
    sortingChanged: model.sortingChanged,
    selectionChanged: model.selectionChanged,
    rowClicked: model.rowClicked,
    countChanged: model.countChanged,
    searchChanged: model.searchChanged,
    scanned: model.scanned,
  })

  const params = new URLSearchParams(location.search)
  const [virtual, setVirtual] = useState(!params.has('plain'))
  const [boxed, setBoxed] = useState(params.has('box'))
  const [selectable, setSelectable] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [dom, setDom] = useState({ rows: 0, nodes: 0 })
  const burst = useRef<number | null>(null)
  const ownCommit = useRef(false)

  /* `?count=5000` — чтобы стенд можно было открыть сразу на нужном объёме. */
  useEffect(() => {
    const wanted = Number(new URLSearchParams(location.search).get('count'))
    if (wanted > 0) {
      mark(`загрузка ${wanted}`)
      model.countChanged(wanted)
    } else {
      mark('загрузка 857')
      model.reset()
    }
  }, [])

  /* Запись метрик перерисовывает стенд, а с ним и таблицу — этот коммит
     свой, он не измеряется и метку действия не забирает. Запись откладывается
     на следующий тик, иначе стенд перерисовывается из своего же коммита. */
  const record = (label: string, commit: number, commitTime: number) => {
    if (ownCommit.current) {
      ownCommit.current = false
      return
    }
    const started = pending.shift()
    const toCommit = started ? commitTime - started.started : 0
    setTimeout(() => {
      // Первый свободный тик после коммита и всего, что он потянул за собой:
      // это и есть момент, когда страница снова отвечает.
      const toIdle = started ? performance.now() - started.started : 0
      ownCommit.current = true
      setSamples((s) =>
        [{ label: started?.label ?? label, commit, toCommit, toIdle }, ...s].slice(0, 12),
      )
      setDom({
        rows: document.querySelectorAll('tbody tr[data-index]').length,
        nodes: document.getElementsByTagName('*').length,
      })
    })
  }

  const startBurst = () => {
    if (burst.current !== null) {
      clearInterval(burst.current)
      burst.current = null
      return
    }
    burst.current = window.setInterval(() => {
      mark('скан')
      on.scanned()
    }, 100)
  }

  const worst = useMemo(() => Math.max(0, ...samples.map((s) => s.commit)), [samples])

  return (
    <Root locale="ru" labels={LABELS_RU} className="min-h-dvh bg-canvas">
      <div className="border-b border-line bg-subtle px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Позиций">
            {(field) => (
              <Select
                {...field}
                value={String(count)}
                onValueChange={(v) => {
                  mark(`загрузка ${v}`)
                  on.countChanged(Number(v))
                }}
                options={['50', '211', '857', '5000', '20000'].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
            )}
          </Field>
          <Field label="Поиск">
            {(field) => (
              <Input
                {...field}
                value={search}
                placeholder="артикул, бренд, наименование"
                onChange={(e) => {
                  mark('поиск')
                  on.searchChanged(e.target.value)
                }}
              />
            )}
          </Field>
          <Button
            onClick={() => {
              mark('скан')
              on.scanned()
            }}
          >
            Скан ШК
          </Button>
          <Button variant="primary" onClick={startBurst}>
            Сканы каждые 100 мс
          </Button>
          <Toggle
            label="Виртуализация"
            checked={virtual}
            onChange={(e) => setVirtual(e.target.checked)}
          />
          <Toggle
            label="Своя прокрутка"
            checked={boxed}
            onChange={(e) => setBoxed(e.target.checked)}
          />
          <Toggle
            label="Выбор строк"
            checked={selectable}
            onChange={(e) => setSelectable(e.target.checked)}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-meta text-fg-secondary">
          <span>
            строк в DOM: <b>{dom.rows}</b> из <b>{rows.length}</b>
          </span>
          <span>
            узлов: <b>{dom.nodes}</b>
          </span>
          <span>
            сканов: <b>{scans}</b>
          </span>
          <span>
            худший коммит: <b>{worst.toFixed(1)} мс</b>
          </span>
          <span>
            выбрано: <b>{Object.keys(selection).length}</b>
          </span>
          <span>
            клик: <b>{lastClicked ? lastClicked.article : '—'}</b>
          </span>
          <span>
            принято {summary.receipted} / {summary.quantity}, блок {summary.blocked}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 font-mono text-micro text-fg-muted">
          {samples.map((s, i) => (
            <span key={i}>
              {s.label}: коммит {s.commit.toFixed(1)} мс
              {s.toCommit > 0 &&
                `, от события до коммита ${s.toCommit.toFixed(0)} мс, до свободного потока ${s.toIdle.toFixed(0)} мс`}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <Text variant="label" className="mb-2 block">
          Накладная 167877 — {rows.length} позиций
        </Text>
        <Profiler
          id="table"
          onRender={(_id, _phase, actual, _base, _start, commitTime) =>
            record('коммит', actual, commitTime)
          }
        >
          <DataTable
            rows={rows}
            columns={COLUMNS}
            getRowId={getRowId}
            density="compact"
            bounded
            virtual={virtual}
            maxHeight={boxed ? 'calc(100dvh - 12rem)' : undefined}
            sorting={sorting}
            onSortingChange={(s) => {
              mark('сортировка')
              on.sortingChanged(s)
            }}
            selectable={selectable}
            selection={selection}
            onSelectionChange={on.selectionChanged}
            onRowClick={(item) => remainingOf(item) > 0 && on.rowClicked(item)}
            rowProps={rowProps}
            loading={loading}
            estimateRowHeight={Number(params.get('est')) || undefined}
            pinned={{ start: ['n'] }}
          />
        </Profiler>
      </div>
    </Root>
  )
}

/* Без StrictMode: двойной рендер в dev удваивает и цифры профилировщика. */
createRoot(document.getElementById('root')!).render(<Stand />)
void StrictMode
