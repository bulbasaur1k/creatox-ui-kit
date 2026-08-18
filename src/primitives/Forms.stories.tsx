import { useState } from 'react'
import type { Story } from '@ladle/react'
import { Root } from '../layout/Root'
import { Stack } from '../layout/Stack'
import { Cluster } from '../layout/Cluster'
import { Button } from './Button'
import { Field, Input, Textarea } from './Field'
import { Combobox, Select } from './Listbox'
import { Checkbox, Radio, Toggle } from './Choice'
import { PinInput } from './PinInput'
import { SegmentedControl } from './SegmentedControl'
import { Slider } from './Slider'
import { Progress } from './Progress'
import { Avatar } from './Avatar'
import { Pagination } from './Pagination'
import { Dialog } from './Dialog'
import { Toaster, toast } from './Toast'
import { Text } from './Text'

export default { title: 'Primitives / Forms' }

const SIZES = ['sm', 'md', 'lg'] as const

/**
 * Every control at every size, side by side. The point is the shared row: a
 * button, an input and a select at the same size have to line up, because in
 * a real form they sit next to each other and any disagreement shows.
 */
function ControlRow() {
  return (
    <Stack gap={6}>
      {SIZES.map((size) => (
        <Stack key={size} gap={2}>
          <Text variant="label">{size}</Text>
          <Cluster gap={3}>
            <Button size={size}>Cancel</Button>
            <Button size={size} variant="primary">
              Save
            </Button>
            <Input controlSize={size} placeholder="booking-api" />
            <Select controlSize={size} defaultValue="eu">
              <option value="eu">Europe</option>
              <option value="us">United States</option>
            </Select>
            <Combobox
              controlSize={size}
              options={['staging', 'production', 'canary']}
              placeholder="Environment"
            />
          </Cluster>
        </Stack>
      ))}
      <Cluster gap={4}>
        <Checkbox label="Notify on failure" defaultChecked />
        <Radio name="tier" label="Standard" defaultChecked />
        <Toggle label="Enabled" defaultChecked />
      </Cluster>
    </Stack>
  )
}

export const CompactDensity: Story = () => (
  <Root density="compact" className="p-4">
    <ControlRow />
  </Root>
)

/**
 * The same markup, one attribute apart. Nothing below sets a height, a font
 * size or a padding — the tokens do, and every control moves together.
 */
export const TouchDensity: Story = () => (
  <Root density="touch" className="p-4">
    <ControlRow />
  </Root>
)

/**
 * The case that started this: a label, a control and a message have to stay
 * one row. Field hands its size to the control, so the two cannot disagree.
 */
export const FieldsFollowTheirControl: Story = () => (
  <Cluster gap={8}>
    {(['compact', 'touch'] as const).map((density) => (
      <Root key={density} density={density} className="w-72 p-4">
        <Stack gap={4}>
          <Text variant="label">{density}</Text>
          <Field label="Service name" help="Lowercase, no spaces.">
            {(props) => <Input {...props} placeholder="booking-api" />}
          </Field>
          <Field label="Region" error="Pick a region to continue." required>
            {(props) => (
              <Select {...props}>
                <option>Europe</option>
                <option>United States</option>
              </Select>
            )}
          </Field>
          <Field label="Notes" controlSize="sm" help="Optional.">
            {(props) => <Textarea {...props} rows={2} />}
          </Field>
        </Stack>
      </Root>
    ))}
  </Cluster>
)

export const Pin: Story = () => {
  const [code, setCode] = useState('')
  return (
    <Stack gap={4}>
      <Field label="Confirmation code" help="Six digits from the email.">
        {(props) => (
          <PinInput {...props} value={code} onValueChange={setCode} label="Code" />
        )}
      </Field>
      <Text tone="muted">Value: {code || '—'}</Text>
    </Stack>
  )
}

export const Segments: Story = () => {
  const [view, setView] = useState('table')
  return (
    <Stack gap={4}>
      {SIZES.map((size) => (
        <SegmentedControl
          key={size}
          size={size}
          label="View"
          value={view}
          onValueChange={setView}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'board', label: 'Board' },
            { value: 'timeline', label: 'Timeline' },
          ]}
        />
      ))}
    </Stack>
  )
}

export const Ranges: Story = () => {
  const [threshold, setThreshold] = useState(40)
  return (
    <Stack gap={6} className="max-w-sm">
      <Field label="Threshold" help={`${threshold}%`}>
        {(props) => (
          <Slider
            {...props}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        )}
      </Field>
      <Progress label="Rollout" value={62} showValue />
      <Progress label="Reindexing" tone="warning" />
      <Progress label="Restore" tone="danger" value={18} showValue />
    </Stack>
  )
}

export const Identity: Story = () => (
  <Cluster gap={3}>
    <Avatar name="Ada Lovelace" size="sm" />
    <Avatar name="Ada Lovelace" size="md" />
    <Avatar name="Ada Lovelace" size="lg" />
    <Avatar name="Grace Hopper" size="xl" shape="square" />
    {/* The image is deliberately unreachable: the initials behind it are what
        a failed load is supposed to leave on screen. */}
    <Avatar name="Alan Turing" size="xl" src="https://example.invalid/missing.png" />
  </Cluster>
)

export const Pages: Story = () => {
  const [page, setPage] = useState(7)
  return (
    <Stack gap={4}>
      <Pagination page={page} pageCount={24} onPageChange={setPage} />
      <Pagination page={1} pageCount={5} onPageChange={() => {}} />
    </Stack>
  )
}

export const SheetAndToast: Story = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Cluster gap={3}>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Button
          onClick={() =>
            toast({ title: 'Deployment queued', description: 'booking-api → eu-west' })
          }
        >
          Raise a toast
        </Button>
        <Button
          variant="danger"
          onClick={() => toast({ title: 'Rollback failed', tone: 'danger', duration: 0 })}
        >
          Raise a sticky one
        </Button>
      </Cluster>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        placement="sheet"
        title="Confirm rollout"
        description="This replaces the running revision."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Roll out
            </Button>
          </>
        }
      >
        {/* Raised from inside a modal on purpose: this is the case that needs
            the top layer, and the one a z-index cannot solve. */}
        <Button onClick={() => toast({ title: 'Raised from inside the dialog' })}>
          Toast over the modal
        </Button>
      </Dialog>

      <Toaster />
    </>
  )
}
