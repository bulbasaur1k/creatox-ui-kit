import type { Story } from '@ladle/react'
import { useState } from 'react'
import { Sheet, type SheetDetent } from './Sheet'
import { Button } from './Button'
import { Field, Input } from './Field'
import { Select } from './Listbox'
import { KeyValue } from './KeyValue'
import { List, ListItem } from './List'
import { Status } from './Status'
import { Text } from './Text'
import { Stack } from '../layout/Stack'
import { Inline, Grow } from '../layout/Inline'
import { Cluster } from '../layout/Cluster'

export default { title: 'Primitives / Sheet' }

/** Enough rows that `full` has something to show and `peek` visibly cuts off. */
const RUNS = [
  ['#4821', 'api-gateway', 'success', '2 мин назад'],
  ['#4820', 'web', 'success', '14 мин назад'],
  ['#4819', 'billing-worker', 'danger', '31 мин назад'],
  ['#4818', 'api-gateway', 'success', 'час назад'],
  ['#4817', 'search-indexer', 'neutral', '2 часа назад'],
  ['#4816', 'web', 'success', '3 часа назад'],
  ['#4815', 'billing-worker', 'success', '4 часа назад'],
  ['#4814', 'api-gateway', 'success', 'вчера'],
  ['#4813', 'web', 'warning', 'вчера'],
  ['#4812', 'search-indexer', 'success', 'вчера'],
  ['#4811', 'api-gateway', 'success', '2 дня назад'],
  ['#4810', 'billing-worker', 'danger', '2 дня назад'],
  ['#4809', 'web', 'success', '3 дня назад'],
  ['#4808', 'api-gateway', 'success', '3 дня назад'],
  ['#4807', 'search-indexer', 'neutral', '4 дня назад'],
  ['#4806', 'billing-worker', 'success', '5 дней назад'],
] as const

/**
 * The three heights. Which one a sheet opens at is picked from what is going
 * into it, and it stays there: no grip, no gesture, nothing measuring the
 * sheet while it is open.
 */
export const Detents: Story = () => {
  const [detent, setDetent] = useState<SheetDetent | null>(null)

  return (
    <Stack gap={4}>
      <Text>
        Высота задаётся при открытии и дальше не меняется. Закрывают ручкой, крестиком,
        затемнением или Escape.
      </Text>
      <Cluster gap={3}>
        <Button onClick={() => setDetent('peek')}>Открыть на краю</Button>
        <Button onClick={() => setDetent('half')}>Открыть на половине</Button>
        <Button variant="primary" onClick={() => setDetent('full')}>
          Открыть во весь экран
        </Button>
      </Cluster>

      <Sheet
        open={detent !== null}
        detent={detent ?? 'half'}
        onClose={() => setDetent(null)}
        title="Последние сборки"
        description="api-gateway · main"
        footer={
          <>
            <Button onClick={() => setDetent(null)}>Закрыть</Button>
            <Button variant="primary">Запустить снова</Button>
          </>
        }
      >
        <List>
          {RUNS.map(([id, service, tone, when]) => (
            <ListItem key={id} interactive>
              <Inline gap={2}>
                <Status tone={tone}>{id}</Status>
                <Grow>
                  <Text truncate>{service}</Text>
                </Grow>
                <Text variant="meta" tone="muted">
                  {when}
                </Text>
              </Inline>
            </ListItem>
          ))}
        </List>
      </Sheet>
    </Stack>
  )
}

/**
 * A summary at `peek`: the object it belongs to is still readable behind it,
 * which is the whole reason the sheet is this short.
 */
export const Peek: Story = () => {
  const [open, setOpen] = useState(false)

  return (
    <Stack gap={4}>
      <Button onClick={() => setOpen(true)}>Показать фильтры</Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        detent="peek"
        title="Фильтры"
        description="3 применены"
      >
        <KeyValue
          items={[
            { key: 'Статус', value: 'failed' },
            { key: 'Автор', value: 'kozin' },
            { key: 'Период', value: 'последние 7 дней' },
          ]}
        />
      </Sheet>
    </Stack>
  )
}

/**
 * The regression case for anchoring. A sheet is a `<dialog>`, so both ends of
 * the anchor — the select's trigger and its list — live in the top layer,
 * where the CSS attachment silently fails and the list used to land hundreds
 * of pixels above the field. The kit now verifies the attachment on open and
 * redoes it by hand when it did not take: the list must open on the field,
 * and follow it when the sheet body scrolls.
 */
export const WithSelect: Story = () => {
  const [open, setOpen] = useState(false)

  return (
    <Stack gap={4}>
      <Button onClick={() => setOpen(true)}>Открыть фильтры</Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        detent="half"
        title="Фильтры"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Применить
          </Button>
        }
      >
        <Stack gap={3}>
          <Field label="Статус">
            {(props) => (
              <Select
                {...props}
                placeholder="Любой"
                options={[
                  { value: 'success', label: 'Успешные' },
                  { value: 'failed', label: 'Упавшие' },
                  { value: 'running', label: 'Идущие' },
                ]}
              />
            )}
          </Field>
          <Field label="Период">
            {(props) => (
              <Select
                {...props}
                defaultValue="7d"
                options={[
                  { value: '24h', label: 'Сутки' },
                  { value: '7d', label: 'Последние 7 дней' },
                  { value: '30d', label: 'Последние 30 дней' },
                ]}
              />
            )}
          </Field>
        </Stack>
      </Sheet>
    </Stack>
  )
}

/**
 * A form gets `full`: it is the thing being worked on, not a glance at it.
 * `dismissible={false}` takes away the handle, the cross and the backdrop
 * click — only the footer, or Escape, ends this one.
 */
export const Form: Story = () => {
  const [open, setOpen] = useState(false)

  return (
    <Stack gap={4}>
      <Button onClick={() => setOpen(true)}>Переименовать</Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        detent="full"
        dismissible={false}
        title="Переименовать сервис"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Сохранить
            </Button>
          </>
        }
      >
        <Stack gap={3}>
          <Field label="Название" help="Менять можно, пока сервис не задеплоен">
            {(props) => <Input {...props} defaultValue="api-gateway" />}
          </Field>
          <Field label="Ветка">
            {(props) => <Input {...props} defaultValue="main" />}
          </Field>
        </Stack>
      </Sheet>
    </Stack>
  )
}
