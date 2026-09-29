import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'
import './sheet.css'
import {
  ActivityStream,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Calendar,
  Checkbox,
  Code,
  Combobox,
  DatePicker,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Input,
  KeyValue,
  List,
  ListItem,
  ObjectHeader,
  ObjectRef,
  Pagination,
  PinInput,
  Progress,
  Radio,
  RelationshipList,
  Root,
  RowActions,
  SegmentedControl,
  Select,
  Separator,
  SideNav,
  SideNavGroup,
  SideNavItem,
  SideNavLabel,
  Skeleton,
  Slider,
  Status,
  Tab,
  TabNav,
  Table,
  Td,
  Text,
  Textarea,
  Th,
  TimePicker,
  Toggle,
  Tr,
  Tree,
  TreeLeaf,
  TreeNode,
  TreeSelect,
  Upload,
  UploadItem,
  UploadList,
  applyTheme,
  Cluster,
  Container,
  DateRangePicker,
  Dialog,
  Grid,
  Grow,
  Inline,
  InputGroup,
  Link,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  ObjectActions,
  Panel,
  Popover,
  ScrollArea,
  Sheet,
  Sidebar,
  SortButton,
  Spinner,
  Split,
  Stack,
  Tabs,
  Toaster,
  toast,
  usePopover,
  cx,
  Section as KitSection,
  type DateRange,
  type Tone,
} from '../src/index'
import {
  bell,
  check,
  ellipsis,
  menu,
  pencil,
  plus,
  search,
  settings,
  triangleAlert,
  x,
} from '../src/icons'
import { DataTable, defineColumns } from '../src/table'
import { snapshotSheet } from './snapshot'
import { snapshotToSvg } from './svg'

/* Лист компонентов для переноса в Figma. Не витрина и не стори: каждый
   компонент в каждом состоянии, размере и тоне, подписанный, на одном
   длинном листе. Секции — это будущие фреймы; `?theme=dark` даёт тот же лист
   в тёмной теме. Плагин из figma/ открывает лист у себя в iframe и просит
   снимок сообщением `cx-snapshot`; кнопки в шапке отдают тот же снимок
   файлом — JSON для плагина или SVG, который веб-Figma открывает без
   плагинов. Дальше дизайнер режет на компоненты. */

const params = new URLSearchParams(location.search)
// Pinned, not `auto`: the sheet has to come out the same on any machine that
// imports it, whatever the OS preference there.
const theme = params.get('theme') === 'dark' ? 'dark' : 'light'
applyTheme(theme)

const embedded = window.parent !== window

window.addEventListener('message', async (event) => {
  if (
    !event.data ||
    event.data.type !== 'cx-snapshot' ||
    !(event.source instanceof Window)
  ) {
    return
  }
  const snapshot = await snapshotSheet()
  event.source.postMessage({ type: 'cx-snapshot', snapshot }, '*')
})

function save(content: string, type: string, name: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type }))
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

async function downloadSnapshot() {
  const snapshot = await snapshotSheet()
  save(JSON.stringify(snapshot), 'application/json', `sheet.${theme}.figma.json`)
}

async function downloadSvg() {
  const snapshot = await snapshotSheet()
  save(snapshotToSvg(snapshot), 'image/svg+xml', `creatox-ui-kit.${theme}.svg`)
}

const TONES: Tone[] = ['neutral', 'accent', 'success', 'warning', 'danger', 'info']
const SIZES = ['sm', 'md', 'lg'] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      data-figma-frame={title}
      className="flex flex-col gap-4 border-b border-line py-8"
    >
      <h2 className="m-0 text-title font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div data-figma-name={label} className="grid grid-cols-[10rem_1fr] items-start gap-4">
      <span className="pt-1 text-meta text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/* Слои кита — список Select, календарь DatePicker, меню, диалог, шторка,
   тосты — показываются только по действию, и на листе их не было бы вовсе.
   Внутри Opened они стоят раскрытыми там, где объявлены (sheet.css). Тостер
   сам поднимает себя в top layer при монтировании, поэтому здесь его
   опускают обратно — эффект родителя идёт после эффектов детей. `inert`,
   потому что это картинка состояния: клик по раскрытому списку открыл бы
   его ещё раз, уже как настоящий поповер. */
function Opened({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    for (const node of ref.current?.querySelectorAll<HTMLElement>('[popover]') ?? []) {
      if (node.matches(':popover-open')) node.hidePopover()
    }
  }, [])
  return (
    <div ref={ref} inert className={cx('sheet-open', className)}>
      {children}
    </div>
  )
}

/** Заглушка для макетов: показывает, куда что встало. */
function Block({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-sm border border-line bg-subtle px-3 py-2 text-meta text-fg-secondary',
        className,
      )}
    >
      {children}
    </div>
  )
}

// Тосты без таймера: лист — снимок, и уходить им некуда.
toast({ title: 'Накладная принята', description: '12 позиций на складе', duration: 0 })
toast({ title: 'Сохранено', tone: 'success', duration: 0 })
toast({ title: 'Принтер не отвечает', tone: 'warning', duration: 0 })
toast({ title: 'Не удалось отправить', tone: 'danger', duration: 0 })

const RUB = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })

interface Invoice {
  id: number
  number: string
  supplier: string
  total: number
  state: 'draft' | 'paid' | 'overdue'
}

const INVOICES: Invoice[] = [
  { id: 1, number: 'УПД-4471', supplier: 'Причал', total: 184_300, state: 'paid' },
  { id: 2, number: 'УПД-4472', supplier: 'Автодом', total: 12_990, state: 'overdue' },
  { id: 3, number: 'УПД-4473', supplier: 'Bosch RU', total: 401_050.5, state: 'draft' },
  { id: 4, number: 'УПД-4474', supplier: 'Причал', total: 8_400, state: 'paid' },
]
const STATE_TONE: Record<Invoice['state'], Tone> = {
  draft: 'neutral',
  paid: 'success',
  overdue: 'danger',
}
const STATE_LABEL: Record<Invoice['state'], string> = {
  draft: 'Черновик',
  paid: 'Оплачена',
  overdue: 'Просрочена',
}
const col = defineColumns<Invoice>()
const COLUMNS = col.columns([
  col.accessor('number', { header: 'Накладная', size: 130, meta: { mono: true } }),
  col.accessor('supplier', { header: 'Поставщик' }),
  col.accessor('state', {
    header: 'Состояние',
    size: 140,
    enableSorting: false,
    cell: ({ getValue }) => (
      <Status tone={STATE_TONE[getValue()]}>{STATE_LABEL[getValue()]}</Status>
    ),
  }),
  col.accessor('total', {
    header: 'Сумма',
    size: 140,
    meta: { align: 'end', mono: true },
    cell: ({ getValue }) => RUB.format(getValue()),
  }),
  col.display({
    id: 'actions',
    size: 72,
    cell: () => (
      <RowActions>
        <IconButton size="sm" label="Открыть" icon={<Icon>{ellipsis}</Icon>} />
      </RowActions>
    ),
  }),
])

function ComponentSheet() {
  const [pin, setPin] = useState('12')
  const [date, setDate] = useState('2026-03-20')
  const [time, setTime] = useState('18:00')
  const [span, setSpan] = useState<DateRange | null>({
    start: '2026-03-09',
    end: '2026-03-13',
  })
  const [day, setDay] = useState('2026-03-20')
  const [range, setRange] = useState<DateRange | null>({
    start: '2026-03-09',
    end: '2026-03-13',
  })
  const [page, setPage] = useState(7)
  const [smallPage, setSmallPage] = useState(1)
  return (
    <Root className="min-h-dvh bg-canvas px-8 pb-16">
      <header
        data-figma-frame="Header"
        className="flex items-baseline justify-between py-8"
      >
        <Text variant="identity" as="h1" className="m-0">
          creatox-ui-kit
        </Text>
        <div className="flex items-baseline gap-4">
          <Text variant="meta" tone="muted">
            {theme} · sheet for Figma
          </Text>
          {!embedded && (
            <div data-figma-skip className="flex gap-2">
              <Button size="sm" variant="primary" onClick={downloadSvg}>
                SVG для Figma
              </Button>
              <Button size="sm" onClick={downloadSnapshot}>
                Снимок для плагина
              </Button>
            </div>
          )}
        </div>
      </header>

      <Section title="Typography">
        <Row label="identity">
          <Text variant="identity">Накладная УПД-4471</Text>
        </Row>
        <Row label="title">
          <Text variant="title">Позиции накладной</Text>
        </Row>
        <Row label="heading">
          <Text variant="heading">Реквизиты</Text>
        </Row>
        <Row label="body">
          <Text variant="body">
            Основной текст интерфейса, 13px — плотный, но читаемый.
          </Text>
        </Row>
        <Row label="label">
          <Text variant="label">Подпись поля</Text>
        </Row>
        <Row label="meta">
          <Text variant="meta" tone="muted">
            Вторичный текст, 12px
          </Text>
        </Row>
        <Row label="code">
          <Code>booking-api</Code>
          <Code block>{'{ "status": "ok" }'}</Code>
        </Row>
        <Row label="link">
          <Link href="#">Накладная УПД-4471</Link>
          <Text>
            Текст со{' '}
            <Link href="#" variant="inline">
              ссылкой внутри
            </Link>{' '}
            абзаца
          </Text>
          <Link href="#" variant="quiet">
            booking-api
          </Link>
          <Link href="#" external>
            Документация
          </Link>
        </Row>
      </Section>

      <Section title="Button">
        {(['default', 'primary', 'quiet', 'danger'] as const).map((variant) => (
          <Row key={variant} label={variant}>
            <Button variant={variant}>Сохранить</Button>
            <Button variant={variant} icon={<Icon>{plus}</Icon>}>
              Добавить
            </Button>
            <Button variant={variant} disabled>
              Недоступно
            </Button>
            <Button variant={variant} loading="immediate">
              Сохранить
            </Button>
            <Button variant={variant} result="success" resultSticky>
              Сохранено
            </Button>
            <Button variant={variant} result="error" resultSticky>
              Ошибка
            </Button>
          </Row>
        ))}
        <Row label="sizes">
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              Размер {size}
            </Button>
          ))}
        </Row>
        <Row label="icon button">
          {SIZES.map((size) => (
            <IconButton
              key={size}
              size={size}
              label="Ещё"
              icon={<Icon>{ellipsis}</Icon>}
            />
          ))}
          <IconButton variant="bordered" label="Изменить" icon={<Icon>{pencil}</Icon>} />
          <IconButton variant="danger" label="Удалить" icon={<Icon>{x}</Icon>} />
        </Row>
        <Row label="icon tooltip">
          <IconButton
            variant="bordered"
            label="Изменить"
            icon={<Icon>{pencil}</Icon>}
            tooltip
          />
        </Row>
        <Row label="spinner">
          <Spinner />
          <Text variant="meta" tone="muted" className="inline-flex items-center gap-2">
            <Spinner /> Загружаю
          </Text>
        </Row>
      </Section>

      <Section title="Fields">
        <div className="grid max-w-2xl grid-cols-2 gap-4">
          <Field label="Текстовое поле" help="Подсказка под полем">
            {(p) => <Input {...p} placeholder="Введите значение" />}
          </Field>
          <Field label="Заполненное" required>
            {(p) => <Input {...p} defaultValue="booking-api" />}
          </Field>
          <Field label="Моноширинное">
            {(p) => <Input {...p} mono defaultValue="9808867880" />}
          </Field>
          <Field label="С ошибкой" error="Артикул не найден">
            {(p) => <Input {...p} defaultValue="0000" />}
          </Field>
          <Field label="Недоступное">
            {(p) => <Input {...p} disabled defaultValue="Нельзя менять" />}
          </Field>
          <Field label="Необязательное" optional>
            {(p) => <Input {...p} />}
          </Field>
          <Field label="Многострочное" className="col-span-2">
            {(p) => <Textarea {...p} defaultValue="Упаковка вскрыта, пересчитать." />}
          </Field>
          <Field label="Select">
            {(p) => (
              <Select
                {...p}
                defaultValue="prod"
                options={[
                  { value: 'prod', label: 'production' },
                  { value: 'stage', label: 'staging' },
                ]}
              />
            )}
          </Field>
          <Field label="Select, пустой">
            {(p) => (
              <Select
                {...p}
                placeholder="Выберите…"
                options={[
                  { value: 'a', label: 'Первый' },
                  { value: 'b', label: 'Второй' },
                ]}
              />
            )}
          </Field>
          <Field label="Combobox">
            {(p) => <Combobox {...p} defaultValue="eu-west-1" options={['eu-west-1']} />}
          </Field>
          <Field label="TreeSelect">
            {(p) => (
              <TreeSelect
                {...p}
                defaultValue="a-1"
                nodes={[
                  {
                    value: 'a',
                    label: 'Склад А',
                    children: [{ value: 'a-1', label: 'Ряд 1' }],
                  },
                ]}
              />
            )}
          </Field>
          <Field label="Дата">
            {(p) => <DatePicker {...p} value={date} onValueChange={setDate} />}
          </Field>
          <Field label="Время">
            {(p) => <TimePicker {...p} value={time} onValueChange={setTime} />}
          </Field>
          <Field label="Период" className="col-span-2">
            {(p) => <DateRangePicker {...p} value={span} onValueChange={setSpan} />}
          </Field>
          <Field label="Поиск">
            {(p) => (
              <InputGroup prefix={<Icon>{search}</Icon>}>
                <Input {...p} placeholder="Артикул или название" />
              </InputGroup>
            )}
          </Field>
          <Field label="С единицей">
            {(p) => (
              <InputGroup suffix="шт.">
                <Input {...p} defaultValue="12" />
              </InputGroup>
            )}
          </Field>
        </div>
        <Row label="sizes">
          {SIZES.map((size) => (
            <Input
              key={size}
              controlSize={size}
              defaultValue={`size ${size}`}
              className="w-40"
            />
          ))}
        </Row>
        <Row label="pin">
          <PinInput value={pin} onValueChange={setPin} length={4} label="Код" />
        </Row>
        <Row label="slider">
          <Slider defaultValue={40} className="w-64" />
        </Row>
      </Section>

      <Section title="Layers">
        <Opened className="flex flex-col gap-8">
          <Row label="select, open">
            {/* По верху: списки разной длины, и центрирование строки уводило
                короткий вниз. */}
            <div className="flex items-start gap-3">
              <div className="flex w-64 flex-col gap-1">
                <Select
                  aria-label="Окружение"
                  defaultValue="stage"
                  options={[
                    { value: 'prod', label: 'production' },
                    { value: 'stage', label: 'staging' },
                    { value: 'dev', label: 'development' },
                    { value: 'old', label: 'legacy', disabled: true },
                  ]}
                />
              </div>
              <div className="flex w-64 flex-col gap-1">
                <Combobox
                  aria-label="Регион"
                  defaultValue="eu"
                  options={['eu-west-1', 'eu-central-1', 'us-east-1']}
                />
              </div>
              <div className="flex w-64 flex-col gap-1">
                <TreeSelect
                  aria-label="Склад"
                  defaultValue="a-1"
                  nodes={[
                    {
                      value: 'a',
                      label: 'Склад А',
                      children: [
                        { value: 'a-1', label: 'Ряд 1' },
                        { value: 'a-2', label: 'Ряд 2' },
                      ],
                    },
                    {
                      value: 'b',
                      label: 'Склад Б',
                      children: [{ value: 'b-1', label: 'Ряд 1' }],
                    },
                  ]}
                />
              </div>
            </div>
          </Row>
          <Row label="date picker, open">
            <div className="flex w-72 flex-col gap-1">
              <DatePicker aria-label="Дата" value="2026-03-20" />
            </div>
          </Row>
          <Row label="menu">
            <SheetMenu />
            <ObjectActions
              primary={<Button variant="primary">Принять</Button>}
              overflow={
                <>
                  <MenuItem shortcut="⌘P">Печать</MenuItem>
                  <MenuItem>Скачать PDF</MenuItem>
                  <MenuSeparator />
                  <MenuItem variant="danger">Удалить</MenuItem>
                </>
              }
            />
          </Row>
          <Row label="popover">
            <SheetPopover />
          </Row>
          <Row label="dialog">
            <Dialog
              open={false}
              onClose={() => {}}
              title="Принять накладную?"
              description="Позиции уйдут на склад, отменить приёмку нельзя."
              footer={
                <>
                  <Button>Отмена</Button>
                  <Button variant="primary">Принять</Button>
                </>
              }
            >
              <Text tone="secondary">12 позиций, сумма {RUB.format(184_300)}.</Text>
            </Dialog>
            <Dialog
              open={false}
              onClose={() => {}}
              tone="danger"
              title="Удалить накладную?"
              footer={
                <>
                  <Button>Отмена</Button>
                  <Button variant="danger">Удалить</Button>
                </>
              }
            >
              <Text tone="secondary">УПД-4471 и её позиции будут удалены.</Text>
            </Dialog>
          </Row>
          <Row label="sheet">
            <Sheet
              open={false}
              onClose={() => {}}
              title="Фильтры"
              description="Сужают список накладных"
              width="28rem"
              footer={<Button variant="primary">Показать 12</Button>}
            >
              <Stack gap={3}>
                <Checkbox label="Только просроченные" defaultChecked />
                <Checkbox label="С расхождениями" />
                <Toggle label="Мои накладные" />
              </Stack>
            </Sheet>
          </Row>
          <Row label="toast">
            <Toaster />
          </Row>
        </Opened>
      </Section>

      <Section title="Choice">
        <Row label="checkbox">
          <Checkbox label="Не выбран" />
          <Checkbox label="Выбран" defaultChecked />
          <Checkbox label="Недоступен" disabled />
          <Checkbox label="С описанием" description="Что это значит" defaultChecked />
        </Row>
        <Row label="radio">
          <Radio name="r" label="Один" defaultChecked />
          <Radio name="r" label="Другой" />
          <Radio name="r" label="Недоступен" disabled />
        </Row>
        <Row label="toggle">
          <Toggle label="Выключен" />
          <Toggle label="Включён" defaultChecked />
          <Toggle label="Недоступен" disabled />
        </Row>
        <Row label="segmented">
          <SegmentedControl
            label="Стратегия"
            defaultValue="rolling"
            options={[
              { value: 'rolling', label: 'Rolling' },
              { value: 'blue', label: 'Blue / green' },
              { value: 'recreate', label: 'Recreate', disabled: true },
            ]}
          />
          {SIZES.map((size) => (
            <SegmentedControl
              key={size}
              size={size}
              label={size}
              defaultValue="1"
              options={[
                { value: '1', label: 'Один' },
                { value: '2', label: 'Два' },
              ]}
            />
          ))}
        </Row>
      </Section>

      <Section title="Status and badges">
        <Row label="status">
          {TONES.map((tone) => (
            <Status key={tone} tone={tone}>
              {tone}
            </Status>
          ))}
          <Status tone="info" pulse>
            pulse
          </Status>
        </Row>
        <Row label="badge solid">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </Row>
        <Row label="badge outline">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} variant="outline">
              {tone}
            </Badge>
          ))}
          <Badge shape="square">12</Badge>
        </Row>
        <Row label="avatar">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Avatar key={size} size={size} name="Даниил Козин" />
          ))}
          <Avatar name="Sigma" shape="square" />
        </Row>
      </Section>

      <Section title="Feedback">
        <div className="flex max-w-2xl flex-col gap-3">
          {TONES.map((tone) => (
            <Alert key={tone} tone={tone} title={`Alert · ${tone}`} onDismiss={() => {}}>
              Сообщение о состоянии, которое держится, пока держится ситуация.
            </Alert>
          ))}
          <Alert
            tone="warning"
            title="С действием"
            action={<Button size="sm">Повторить</Button>}
          >
            Принтер не отвечает.
          </Alert>
        </div>
        <Row label="progress">
          <Progress value={40} className="w-64" label="Приёмка" showValue />
          <Progress value={80} tone="success" className="w-64" />
          <Progress className="w-64" />
        </Row>
        <Row label="skeleton">
          <Skeleton lines={3} className="w-64" />
          <Skeleton shape="block" width="6rem" height="3rem" />
          <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
        </Row>
        <Row label="empty">
          <EmptyState
            size="inline"
            title="Нет накладных"
            description="Появятся после первого поступления от поставщика."
            action={<Button size="sm">Создать</Button>}
          />
        </Row>
        <Row label="upload">
          <div className="flex w-[28rem] flex-col gap-2">
            <Upload onFiles={() => {}} hint="PDF, PNG · до 5 МБ" />
            <Upload compact onFiles={() => {}} prompt="Добавить скан" />
            <UploadList>
              <UploadItem
                name="scan-0041.pdf"
                size={1_843_200}
                progress={60}
                status="pending"
              />
              <UploadItem
                name="scan-0040.pdf"
                size={903_100}
                status="done"
                onRemove={() => {}}
              />
              <UploadItem
                name="scan-0039.pdf"
                size={2_100_000}
                status="error"
                error="Таймаут"
              />
            </UploadList>
          </div>
        </Row>
      </Section>

      <Section title="Navigation">
        <Row label="tabs">
          <TabNav className="w-[28rem]">
            <Tab href="#" aria-current="page">
              Обзор
            </Tab>
            <Tab href="#" count={12}>
              Позиции
            </Tab>
            <Tab href="#">История</Tab>
          </TabNav>
        </Row>
        <Row label="local tabs">
          <Tabs
            label="Вид"
            className="w-[28rem]"
            items={[
              {
                label: 'Таблица',
                content: <Text tone="secondary">Позиции списком.</Text>,
              },
              {
                label: 'Расхождения',
                count: 3,
                content: <Text tone="secondary">Три позиции не сошлись.</Text>,
              },
            ]}
          />
        </Row>
        <Row label="breadcrumbs">
          <Breadcrumbs
            items={[
              { label: 'Приёмка', href: '#' },
              { label: 'Причал', href: '#' },
              { label: 'УПД-4471' },
            ]}
          />
        </Row>
        <Row label="pagination">
          <Pagination page={page} pageCount={24} onPageChange={setPage} />
          <Pagination
            page={smallPage}
            pageCount={3}
            size="sm"
            onPageChange={setSmallPage}
          />
        </Row>
        <Row label="tree">
          <Tree className="w-64">
            <TreeNode label="Склады" open>
              <TreeLeaf href="#" selected>
                Москва, корпус А
              </TreeLeaf>
              <TreeLeaf href="#">Москва, корпус Б</TreeLeaf>
              <TreeNode label="Санкт-Петербург">
                <TreeLeaf href="#">Ряд 1</TreeLeaf>
              </TreeNode>
            </TreeNode>
          </Tree>
        </Row>
        <Row label="list">
          <List bounded className="w-80">
            <ListItem
              leading={
                <Status tone="success" markOnly>
                  ok
                </Status>
              }
              interactive
            >
              telegram-bot
            </ListItem>
            <ListItem
              leading={
                <Status tone="success" markOnly>
                  ok
                </Status>
              }
              interactive
              selected
            >
              web
            </ListItem>
            <ListItem
              leading={
                <Status tone="danger" markOnly>
                  fail
                </Status>
              }
              actions={<Badge variant="outline">internal</Badge>}
            >
              partner-gateway
            </ListItem>
          </List>
        </Row>
      </Section>

      <Section title="Layout">
        <Row label="stack">
          <Stack gap={2} className="w-64">
            <Block>Первый</Block>
            <Block>Второй</Block>
            <Block>Третий</Block>
          </Stack>
          <Stack gap={0} divided className="w-64 rounded-sm border border-line">
            <div className="px-3 py-2 text-meta">С разделителями</div>
            <div className="px-3 py-2 text-meta">Между строками</div>
            <div className="px-3 py-2 text-meta">Линия</div>
          </Stack>
        </Row>
        <Row label="inline, grow">
          <Inline gap={2} className="w-[32rem]">
            <Block>Слева</Block>
            <Grow>
              <Block>Grow забирает остаток</Block>
            </Grow>
            <Block>Справа</Block>
          </Inline>
        </Row>
        <Row label="cluster">
          <Cluster gap={2} className="w-[28rem]">
            {[
              'booking-api',
              'search-api',
              'telegram-bot',
              'postgres-main',
              'redis',
              'ingest',
            ].map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </Cluster>
        </Row>
        <Row label="grid">
          <Grid min="10rem" gap={3} className="w-[40rem]">
            {Array.from({ length: 6 }, (_, i) => (
              <Block key={i}>Ячейка {i + 1}</Block>
            ))}
          </Grid>
        </Row>
        <Row label="sidebar">
          <Sidebar width="12rem" gap={4} className="w-[40rem]">
            <Block>Боковая, 12rem</Block>
            <Block>Содержимое забирает остальное</Block>
          </Sidebar>
        </Row>
        <Row label="container">
          <Container
            measure="reading"
            gutter={4}
            className="rounded-sm border border-line py-3"
          >
            <Text>
              Контейнер ограничивает ширину строки для чтения — около 68 знаков, чтобы
              длинный текст не растягивался на весь экран.
            </Text>
          </Container>
        </Row>
        <Row label="section">
          <div className="flex w-[40rem] flex-col gap-4">
            <KitSection
              title="Реквизиты"
              description="Секция без рамки: заголовка и отступа хватает"
              actions={<Button size="sm">Изменить</Button>}
            >
              <KeyValue
                items={[
                  { key: 'Поставщик', value: 'Причал' },
                  { key: 'ИНН', value: '7707083893', mono: true },
                ]}
              />
            </KitSection>
            <KitSection title="Позиции" bounded>
              <Text tone="secondary">
                Секция с рамкой — когда она владеет содержимым.
              </Text>
            </KitSection>
          </div>
        </Row>
        <Row label="scroll area">
          <ScrollArea
            maxHeight="8rem"
            fade
            className="w-64 rounded-sm border border-line"
          >
            <Stack gap={0} divided>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="px-3 py-2 text-meta">
                  Строка {i + 1}
                </div>
              ))}
            </Stack>
          </ScrollArea>
        </Row>
        <Row label="panel">
          <Panel
            title="Связанное"
            actions={<IconButton size="sm" label="Закрыть" icon={<Icon>{x}</Icon>} />}
            footer={
              <Text variant="meta" tone="muted">
                Обновлено в 12:40
              </Text>
            }
            className="h-64 w-80 border border-line"
          >
            <KeyValue
              items={[
                { key: 'Заказ', value: '8812' },
                { key: 'Склад', value: 'Москва, А' },
              ]}
            />
          </Panel>
        </Row>
        <div data-figma-name="workspace" className="flex flex-col gap-2">
          <span className="text-meta text-fg-muted">
            split: навигация · объект · контекст
          </span>
          <Split className="h-[26rem] overflow-hidden rounded-sm border border-line">
            <SideNav
              hideOnNarrow={false}
              header={
                <div className="flex h-control-md items-center gap-2 px-[var(--cx-sidenav-inset)]">
                  <span className="cx-sidenav-icon rounded-sm bg-accent text-micro font-semibold text-fg-inverted">
                    C
                  </span>
                  <SideNavLabel className="text-ui font-semibold">Creatox</SideNavLabel>
                </div>
              }
            >
              <SideNavItem href="#" icon={<Icon>{menu}</Icon>}>
                Обзор
              </SideNavItem>
              <SideNavItem href="#" icon={<Icon>{search}</Icon>} selected>
                Накладные
              </SideNavItem>
              <SideNavItem href="#" icon={<Icon>{triangleAlert}</Icon>} count={3}>
                Расхождения
              </SideNavItem>
            </SideNav>
            <Stack gap={4} className="p-6">
              <ObjectHeader
                type="Накладная"
                name="УПД-4471"
                status={<Status tone="success">Оплачена</Status>}
                actions={<Button variant="primary">Принять</Button>}
              />
              <Text tone="secondary">
                Объект в центре забирает место; навигация слева сворачивается до иконок,
                контекст справа уходит под объект, когда места не хватает.
              </Text>
            </Stack>
            <Panel title="Связанное" mode="docked">
              <KeyValue
                items={[
                  { key: 'Поставщик', value: 'Причал' },
                  { key: 'Заказ', value: '8812' },
                ]}
              />
            </Panel>
          </Split>
        </div>
      </Section>

      <Section title="SideNav">
        <div className="flex h-80 items-stretch gap-8">
          {[false, true].map((collapsed) => (
            <SideNav
              key={String(collapsed)}
              className="border border-line"
              defaultCollapsed={collapsed}
              header={
                <div className="flex h-control-md items-center gap-2 px-[var(--cx-sidenav-inset)]">
                  <span className="cx-sidenav-icon rounded-sm bg-accent text-micro font-semibold text-fg-inverted">
                    C
                  </span>
                  <SideNavLabel className="text-ui font-semibold">Creatox</SideNavLabel>
                </div>
              }
              footer={
                <SideNavItem href="#" icon={<Icon>{settings}</Icon>}>
                  Настройки
                </SideNavItem>
              }
            >
              <SideNavItem href="#" icon={<Icon>{menu}</Icon>} selected>
                Обзор
              </SideNavItem>
              <SideNavItem href="#" icon={<Icon>{search}</Icon>}>
                Поиск
              </SideNavItem>
              <SideNavItem href="#" icon={<Icon>{triangleAlert}</Icon>} count={3}>
                Инциденты
              </SideNavItem>
              <SideNavGroup title="Объекты">
                <SideNavItem href="#" icon={<Icon>{bell}</Icon>} count={12}>
                  Уведомления
                </SideNavItem>
              </SideNavGroup>
            </SideNav>
          ))}
        </div>
      </Section>

      <Section title="Objects">
        <ObjectHeader
          type="Накладная"
          name="УПД-4471"
          breadcrumbs={[
            { label: 'Приёмка', href: '#' },
            { label: 'Причал', href: '#' },
          ]}
          status={<Status tone="success">Оплачена</Status>}
          meta={
            <KeyValue
              layout="inline"
              items={[
                { key: 'Поставщик', value: 'Причал' },
                { key: 'Сумма', value: RUB.format(184_300), mono: true },
                { key: 'Позиций', value: '857' },
              ]}
            />
          }
          actions={
            <>
              <Button variant="primary">Принять</Button>
              <IconButton label="Ещё" icon={<Icon>{ellipsis}</Icon>} />
            </>
          }
        />
        <Row label="object ref">
          <ObjectRef
            href="#"
            name="УПД-4471"
            type="Накладная"
            status="success"
            statusLabel="Оплачена"
          />
          <ObjectRef href="#" name="booking-api" type="Service" size="compact" />
          <ObjectRef
            href="#"
            name="postgres-main"
            type="Database"
            context="97% диска"
            status="warning"
            statusLabel="Мало места"
            size="rich"
          />
        </Row>
        <Row label="key value">
          <KeyValue
            className="w-80"
            items={[
              { key: 'Поставщик', value: 'Причал' },
              { key: 'ИНН', value: '7707083893', mono: true },
              { key: 'Договор', value: '123/45' },
            ]}
          />
        </Row>
        <Row label="relationships">
          <RelationshipList
            className="w-96"
            items={[
              {
                predicate: 'принадлежит',
                object: (
                  <ObjectRef as="span" name="Причал" type="Поставщик" size="compact" />
                ),
              },
              {
                predicate: 'создана из',
                object: (
                  <ObjectRef as="span" name="Заказ 8812" type="Заказ" size="compact" />
                ),
              },
            ]}
          />
        </Row>
        <Row label="activity">
          <ActivityStream
            className="w-[28rem]"
            entries={[
              {
                description: 'Принято 12 позиций',
                time: '12:40',
                actor: 'Иванов',
                tone: 'success',
              },
              {
                description: 'Заблокирована позиция 9808867880',
                time: '12:31',
                actor: 'Иванов',
                tone: 'danger',
                detail: 'Брак упаковки',
              },
              { description: 'Накладная создана', time: '09:02', actor: 'Система' },
            ]}
          />
        </Row>
      </Section>

      <Section title="Table">
        <Table density="compact" bounded caption="Table — разметка">
          <thead>
            <tr>
              <Th>Накладная</Th>
              <Th>Поставщик</Th>
              <Th>Состояние</Th>
              <Th align="end">Сумма</Th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((row, i) => (
              <Tr
                key={row.id}
                interactive
                selected={i === 1}
                tone={row.state === 'overdue' ? 'danger' : undefined}
              >
                <Td mono>{row.number}</Td>
                <Td>{row.supplier}</Td>
                <Td>
                  <Status tone={STATE_TONE[row.state]}>{STATE_LABEL[row.state]}</Status>
                </Td>
                <Td align="end" mono>
                  {RUB.format(row.total)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <DataTable
          rows={INVOICES}
          columns={COLUMNS}
          getRowId={(r) => String(r.id)}
          selectable
          defaultSelection={{ '2': true }}
          defaultSorting={[{ id: 'number', desc: false }]}
          renderDetail={(r) => (
            <Text variant="meta" tone="muted">
              Позиции накладной {r.number}
            </Text>
          )}
          defaultExpanded={{ '1': true }}
          bounded
          virtual={false}
          caption="DataTable — выбор, сортировка, детали"
        />
        <Row label="sort button">
          <SortButton>Не отсортировано</SortButton>
          <SortButton direction="ascending">По возрастанию</SortButton>
          <SortButton direction="descending">По убыванию</SortButton>
        </Row>
        {/* Каждая на всю ширину и своей строкой: колонки таблицы шире 600px, и
            в узкой коробке она прокручивалась бы внутри, а при переносе в
            Figma без обрезки наезжала бы на соседнюю. */}
        <div data-figma-name="loading" className="flex flex-col gap-2">
          <span className="text-meta text-fg-muted">loading</span>
          <DataTable
            rows={[]}
            columns={COLUMNS}
            getRowId={(r) => String(r.id)}
            bounded
            loading
          />
        </div>
        <div data-figma-name="empty" className="flex flex-col gap-2">
          <span className="text-meta text-fg-muted">empty</span>
          <DataTable
            rows={[]}
            columns={COLUMNS}
            getRowId={(r) => String(r.id)}
            bounded
            virtual={false}
          />
        </div>
      </Section>

      <Section title="Calendar">
        <Row label="single">
          <Calendar value={day} onValueChange={setDay} defaultMonth="2026-03" />
        </Row>
        <Row label="range">
          <Calendar
            mode="range"
            range={range}
            onRangeChange={setRange}
            defaultMonth="2026-03"
          />
        </Row>
      </Section>

      <Section title="Icons">
        <Row label="24px stroke">
          {[check, ellipsis, pencil, plus, search, triangleAlert, x].map((icon, i) => (
            <Icon key={i} className="text-title">
              {icon}
            </Icon>
          ))}
        </Row>
        <Separator />
      </Section>
    </Root>
  )
}

function SheetMenu() {
  const popover = usePopover()
  return (
    <div className="flex flex-col gap-1">
      <Button {...popover.trigger} icon={<Icon>{ellipsis}</Icon>}>
        Действия
      </Button>
      <Popover {...popover.content}>
        <Menu>
          <MenuLabel>Накладная</MenuLabel>
          <MenuItem icon={<Icon>{pencil}</Icon>} shortcut="⌘E">
            Изменить
          </MenuItem>
          <MenuItem icon={<Icon>{check}</Icon>}>Принять</MenuItem>
          <MenuItem disabled>Отправить в 1С</MenuItem>
          <MenuSeparator />
          <MenuItem variant="danger" icon={<Icon>{x}</Icon>}>
            Удалить
          </MenuItem>
        </Menu>
      </Popover>
    </div>
  )
}

function SheetPopover() {
  const popover = usePopover()
  return (
    <div className="flex flex-col gap-1">
      <Button {...popover.trigger} icon={<Icon>{bell}</Icon>}>
        Уведомления
      </Button>
      <Popover {...popover.content} className="w-72 p-3">
        <Stack gap={2}>
          <Text variant="label">Уведомления</Text>
          <Text variant="meta" tone="muted">
            Поповер держит что угодно: форму, список, подсказку.
          </Text>
          <Inline gap={2} justify="end">
            <Button size="sm" variant="quiet">
              Позже
            </Button>
            <Button size="sm" variant="primary" icon={<Icon>{settings}</Icon>}>
              Настроить
            </Button>
          </Inline>
        </Stack>
      </Popover>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<ComponentSheet />)
