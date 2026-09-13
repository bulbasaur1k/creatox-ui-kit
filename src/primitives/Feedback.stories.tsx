import type { Story } from '@ladle/react'
import { useState } from 'react'
import { Alert } from './Alert'
import { Button } from './Button'
import { Upload, UploadItem, UploadList } from './Upload'
import { TreeSelect } from './TreeSelect'
import { Field } from './Field'
import { Stack } from '../layout/Stack'
import { Cluster } from '../layout/Cluster'
import { Text } from './Text'
import { useSettled } from '../util/settle'

export default { title: 'Primitives / Feedback' }

/**
 * A wait that answers fast shows nothing; one that takes longer shows a
 * spinner that stays long enough to be seen. The three buttons simulate
 * answers of 80, 300 and 1200 milliseconds — only the last two ever spin,
 * and the tick is what says "done" for all three.
 */
export const SettledLoading: Story = () => {
  const [state, setState] = useState<Record<number, 'idle' | 'pending' | 'done'>>({})
  const run = (ms: number) => {
    setState((s) => ({ ...s, [ms]: 'pending' }))
    setTimeout(() => setState((s) => ({ ...s, [ms]: 'done' })), ms)
  }
  return (
    <Stack gap={4}>
      <Cluster gap={3}>
        {[80, 300, 1200].map((ms) => (
          <Button
            key={ms}
            variant="primary"
            loading={state[ms] === 'pending'}
            result={state[ms] === 'done' ? 'success' : undefined}
            onClick={() => run(ms)}
          >
            Save ({ms} ms)
          </Button>
        ))}
        <Button loading="immediate">Immediate</Button>
        <Button result="error" resultSticky>
          Failed
        </Button>
      </Cluster>
      <Text variant="meta" tone="muted">
        Click each one twice quickly: the second click lands on nothing while the first is
        in flight, spinner or no spinner.
      </Text>
      <SettledFlag />
    </Stack>
  )
}

function SettledFlag() {
  const [pending, setPending] = useState(false)
  const shown = useSettled(pending)
  return (
    <Cluster gap={3}>
      <Button size="sm" onClick={() => setPending((p) => !p)}>
        {pending ? 'Stop' : 'Start'} pending
      </Button>
      <Text variant="meta" tone="muted">
        raw: {String(pending)} · settled: {String(shown)}
      </Text>
    </Cluster>
  )
}

export const Alerts: Story = () => {
  const [shown, setShown] = useState(true)
  return (
    <Stack gap={3}>
      <Alert title="Invoice already paid">
        Receiving against a paid invoice will not change the balance.
      </Alert>
      <Alert
        tone="warning"
        title="Printer offline"
        action={<Button size="sm">Retry</Button>}
      >
        Stickers will queue until the printer is back.
      </Alert>
      <Alert tone="danger" title="Could not save">
        The server rejected the quantity: 25 exceeds the 20 ordered.
      </Alert>
      <Alert tone="success">Stock counts reconciled for 12 cells.</Alert>
      {shown && (
        <Alert tone="neutral" onDismiss={() => setShown(false)}>
          This warehouse uses the new receiving flow.
        </Alert>
      )}
    </Stack>
  )
}

interface Item {
  name: string
  size: number
  progress: number
  status: 'pending' | 'done' | 'error'
}

/**
 * The control hands files out and takes progress back in. What happens in
 * between — here a timer, in a product a mutation — is not its concern.
 */
export const Uploads: Story = () => {
  const [items, setItems] = useState<Item[]>([])
  const [rejected, setRejected] = useState<string[]>([])

  const add = (files: File[]) => {
    for (const file of files) {
      setItems((list) => [
        ...list,
        { name: file.name, size: file.size, progress: 0, status: 'pending' },
      ])
      let progress = 0
      const timer = setInterval(() => {
        progress += 20
        setItems((list) =>
          list.map((item) =>
            item.name === file.name
              ? { ...item, progress, status: progress >= 100 ? 'done' : 'pending' }
              : item,
          ),
        )
        if (progress >= 100) clearInterval(timer)
      }, 300)
    }
  }

  return (
    <Stack gap={3}>
      <Field label="Documents" help="PDF or images, up to 5 MB each">
        {(field) => (
          <Upload
            {...field}
            multiple
            accept=".pdf,image/*"
            maxSize={5 * 1024 * 1024}
            onFiles={add}
            onReject={(list) =>
              setRejected(list.map((r) => `${r.file.name}: ${r.reason}`))
            }
            hint="PDF, PNG, JPG · up to 5 MB"
          />
        )}
      </Field>
      <Upload compact onFiles={add} prompt="Add a scan" />
      {rejected.length > 0 && (
        <Alert tone="danger" title="Not accepted" onDismiss={() => setRejected([])}>
          {rejected.join(', ')}
        </Alert>
      )}
      <UploadList>
        {items.map((item) => (
          <UploadItem
            key={item.name}
            name={item.name}
            size={item.size}
            progress={item.progress}
            status={item.status}
            onRemove={() => setItems((list) => list.filter((i) => i !== item))}
          />
        ))}
        <UploadItem
          name="scan-0042.pdf"
          size={1_843_200}
          status="error"
          error="Timed out"
        />
      </UploadList>
    </Stack>
  )
}

const WAREHOUSE = [
  {
    value: 'msk',
    label: 'Moscow',
    children: [
      {
        value: 'msk-a',
        label: 'Building A',
        children: [
          { value: 'msk-a-1', label: 'Row 1' },
          { value: 'msk-a-2', label: 'Row 2' },
        ],
      },
      {
        value: 'msk-b',
        label: 'Building B',
        children: [{ value: 'msk-b-1', label: 'Row 1' }],
      },
    ],
  },
  {
    value: 'spb',
    label: 'Saint Petersburg',
    children: [{ value: 'spb-1', label: 'Row 1', description: 'Cold storage' }],
  },
  { value: 'kzn', label: 'Kazan', disabled: true },
]

export const TreeSelects: Story = () => {
  const [value, setValue] = useState('msk-a-2')
  return (
    <Stack gap={3} className="max-w-sm">
      <Field label="Storage cell">
        {(field) => (
          <TreeSelect
            {...field}
            nodes={WAREHOUSE}
            value={value}
            onValueChange={setValue}
          />
        )}
      </Field>
      <Field label="Leaves only" help="Buildings fold but cannot be chosen">
        {(field) => (
          <TreeSelect {...field} nodes={WAREHOUSE} leafOnly placeholder="Pick a row" />
        )}
      </Field>
      <Text variant="meta" tone="muted">
        value: {value}
      </Text>
    </Stack>
  )
}
