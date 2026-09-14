import { useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'
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
  type Tone,
} from '../src/index'
import { check, ellipsis, pencil, plus, search, triangleAlert, x } from '../src/icons'
import { DataTable, defineColumns } from '../src/table'

/* Лист компонентов для переноса в Figma. Не витрина и не стори: каждый
   компонент в каждом состоянии, размере и тоне, подписанный, на одном
   длинном листе. Секции — это будущие фреймы; `?theme=dark` даёт тот же лист
   в тёмной теме. Импортируется целиком плагином html.to.design, дальше
   дизайнер режет на компоненты. */

const params = new URLSearchParams(location.search)
// Pinned, not `auto`: the sheet has to come out the same on any machine that
// imports it, whatever the OS preference there.
applyTheme(params.get('theme') === 'dark' ? 'dark' : 'light')

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
    <div className="grid grid-cols-[10rem_1fr] items-start gap-4">
      <span className="pt-1 text-meta text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

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

function Sheet() {
  const [pin, setPin] = useState('12')
  return (
    <Root className="min-h-dvh bg-canvas px-8 pb-16">
      <header className="flex items-baseline justify-between py-8">
        <Text variant="identity" as="h1" className="m-0">
          creatox-ui-kit
        </Text>
        <Text variant="meta" tone="muted">
          {params.get('theme') === 'dark' ? 'dark' : 'light'} · sheet for Figma
        </Text>
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
          <Field label="Дата">{(p) => <DatePicker {...p} value="2026-03-20" />}</Field>
          <Field label="Время">{(p) => <TimePicker {...p} value="18:00" />}</Field>
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
          <Pagination page={7} pageCount={24} />
          <Pagination page={1} pageCount={3} size="sm" />
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
        <Row label="loading / empty">
          <div className="w-80">
            <DataTable
              rows={[]}
              columns={COLUMNS}
              getRowId={(r) => String(r.id)}
              bounded
              loading
            />
          </div>
          <div className="w-80">
            <DataTable
              rows={[]}
              columns={COLUMNS}
              getRowId={(r) => String(r.id)}
              bounded
              virtual={false}
            />
          </div>
        </Row>
      </Section>

      <Section title="Calendar">
        <Row label="single">
          <Calendar value="2026-03-20" defaultMonth="2026-03" />
        </Row>
        <Row label="range">
          <Calendar
            mode="range"
            range={{ start: '2026-03-09', end: '2026-03-13' }}
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

createRoot(document.getElementById('root')!).render(<Sheet />)
