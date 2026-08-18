import { useState } from 'react'
import type { Story } from '@ladle/react'
import {
  ActivityStream,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Calendar,
  Checkbox,
  Cluster,
  Code,
  Combobox,
  Container,
  DatePicker,
  DateRangePicker,
  Dialog,
  EmptyState,
  Field,
  Grid,
  IconButton,
  Inline,
  Input,
  InputGroup,
  KeyValue,
  LABELS_RU,
  Link,
  List,
  ListItem,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  ObjectActions,
  ObjectHeader,
  ObjectRef,
  Pagination,
  Panel,
  PinInput,
  Popover,
  Progress,
  Radio,
  RelationshipList,
  Root,
  Section,
  SegmentedControl,
  Select,
  Separator,
  Skeleton,
  Slider,
  Stack,
  Status,
  Tab,
  TabNav,
  Table,
  Tabs,
  Td,
  Text,
  Textarea,
  Th,
  TimePicker,
  Toaster,
  Toggle,
  Tr,
  Tree,
  TreeLeaf,
  TreeNode,
  toast,
  usePopover,
  type Density,
  type DateRange,
} from '../index'

export default { title: 'Everything' }

/* One page with every component on it. Not a replacement for the workbench —
   that one exists to show whether a composed object view holds together, and
   this one exists for the opposite question: whether the parts agree with
   each other. Heights, text sizes, borders and radii are all shared, so a
   part that has drifted shows up as soon as it stands next to its neighbours.

   Both densities are on the same page for the same reason. */

const SIZES = ['sm', 'md', 'lg'] as const
const VARIANTS = ['default', 'primary', 'quiet', 'danger'] as const
const TONES = ['success', 'warning', 'danger', 'info', 'neutral'] as const

function Dots() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <circle cx="12" cy="5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </svg>
  )
}

function Gallery() {
  const [rollout, setRollout] = useState(40)
  const [code, setCode] = useState('')
  const [date, setDate] = useState('2026-03-14')
  const [time, setTime] = useState('09:30')
  const [span, setSpan] = useState<DateRange | null>({
    start: '2026-03-09',
    end: '2026-03-15',
  })
  const [page, setPage] = useState(7)
  const [view, setView] = useState('table')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const menu = usePopover()

  return (
    <Stack gap={8}>
      {/* ── Type ─────────────────────────────────────────────────────────── */}
      <Section title="Text" description="Sizes are named by role, not by scale.">
        <Stack gap={2}>
          <Text variant="identity">Identity — the object being viewed</Text>
          <Text variant="title">Title — section identity</Text>
          <Text variant="heading">Heading</Text>
          <Text variant="reading">Reading — prose that is actually read.</Text>
          <Text variant="body">Body — the default for interface chrome.</Text>
          <Text variant="meta">Meta — secondary and supporting text.</Text>
          <Text variant="label">Label</Text>
          <Text variant="mono">v1.14.2</Text>
          <Inline gap={3}>
            <Text tone="muted">muted</Text>
            <Text tone="danger">danger</Text>
            <Link href="#">A link</Link>
            <Code>GET /v1/bookings</Code>
          </Inline>
          <Code block>{'level=error msg="upstream timeout"\ncount=1284'}</Code>
        </Stack>
      </Section>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <Section
        title="Buttons"
        description="Every variant against every state — §19 asks for all seven."
      >
        <Stack gap={3}>
          {VARIANTS.map((variant) => (
            <Cluster key={variant} gap={3}>
              <Button variant={variant}>Default</Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} loading>
                Loading
              </Button>
              <Button variant={variant} aria-pressed="true">
                Pressed
              </Button>
            </Cluster>
          ))}
          <Cluster gap={3}>
            {SIZES.map((size) => (
              <Button key={size} size={size}>
                Size {size}
              </Button>
            ))}
            {SIZES.map((size) => (
              <IconButton
                key={size}
                size={size}
                variant="bordered"
                label="More actions"
                tooltip
                icon={<Dots />}
              />
            ))}
          </Cluster>
        </Stack>
      </Section>

      <Section
        title="Inputs"
        description="The row that has to line up: same height, same text, same corner."
      >
        <Stack gap={3}>
          {/* Text controls fill their container, so the row needs widths to
              lay out at all. Fixed here on purpose: the thing being checked
              is that the heights and baselines agree, and that only reads
              when they sit side by side. */}
          {SIZES.map((size) => (
            <Cluster key={size} gap={3}>
              <Button size={size}>Button</Button>
              <div className="w-40">
                <Input controlSize={size} placeholder="booking-api" />
              </div>
              <div className="w-40">
                <Select controlSize={size} defaultValue="eu">
                  <option value="eu">Europe</option>
                  <option value="us">United States</option>
                </Select>
              </div>
              <div className="w-40">
                <Combobox
                  controlSize={size}
                  options={['staging', 'production', 'canary']}
                  placeholder="Environment"
                />
              </div>
              <div className="w-44">
                <DatePicker controlSize={size} value={date} onValueChange={setDate} />
              </div>
            </Cluster>
          ))}

          {/* A range, a time, and the same date and time side by side —
              which is what "date and time" is, because which order the two
              read in belongs to the form and not to the kit. */}
          <Cluster gap={3}>
            <div className="w-64">
              <DateRangePicker value={span} onValueChange={setSpan} />
            </div>
            <div className="w-32">
              <TimePicker value={time} onValueChange={setTime} />
            </div>
            <div className="w-32">
              {/* Twelve-hour, for the places that ask for it. The value on
                  the way out is still 24-hour. */}
              <TimePicker value={time} onValueChange={setTime} hour12 step={15} />
            </div>
            <div className="w-64">
              <InputGroup prefix={<span>https://</span>} suffix={<span>.dev</span>}>
                <input placeholder="creatox" />
              </InputGroup>
            </div>
          </Cluster>

          <Panel title="Calendar, inline" mode="docked">
            <Calendar
              value={date}
              onValueChange={setDate}
              // Weekends off, to show what a taken day looks like.
              isDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
            />
          </Panel>
          <div className="max-w-md">
            <Textarea rows={2} defaultValue="Anything longer than a line." />
          </div>
          <Cluster gap={4}>
            <Checkbox label="Notify on failure" defaultChecked />
            <Checkbox label="Disabled" disabled />
            <Radio name="tier" label="Standard" defaultChecked />
            <Radio name="tier" label="Dedicated" />
            <Toggle label="Enabled" defaultChecked />
          </Cluster>
        </Stack>
      </Section>

      <Section title="Choosing and ranging">
        <Stack gap={4} className="max-w-md">
          <SegmentedControl
            label="View"
            value={view}
            onValueChange={setView}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'board', label: 'Board' },
              { value: 'timeline', label: 'Timeline' },
            ]}
          />
          <Field label="Canary share" help={`${rollout}% of traffic`}>
            {(props) => (
              <Slider
                {...props}
                value={rollout}
                onChange={(event) => setRollout(Number(event.target.value))}
              />
            )}
          </Field>
          <Progress label="Replicas updated" value={62} showValue />
          <Progress label="Draining old revision" tone="warning" />
          <Progress label="Restore" tone="danger" value={18} showValue />
          <Field label="Confirmation code" help="Six digits from the email.">
            {(props) => (
              <PinInput {...props} value={code} onValueChange={setCode} label="Code" />
            )}
          </Field>
        </Stack>
      </Section>

      <Section
        title="Fields"
        description="Label, control and message are one row at every size."
      >
        <Grid min="16rem" gap={4}>
          {SIZES.map((size) => (
            <Field
              key={size}
              controlSize={size}
              label={`Service name (${size})`}
              help="Lowercase, no spaces."
            >
              {(props) => <Input {...props} defaultValue="booking-api" mono />}
            </Field>
          ))}
          <Field label="Region" error="Pick a region to continue." required>
            {(props) => (
              <Select {...props}>
                <option>Europe</option>
              </Select>
            )}
          </Field>
          <Field label="Replicas" layout="horizontal" optional>
            {(props) => <Input {...props} defaultValue="3" />}
          </Field>
        </Grid>
      </Section>

      {/* ── Signals ──────────────────────────────────────────────────────── */}
      <Section title="Status and identity">
        <Stack gap={3}>
          <Cluster gap={3}>
            {TONES.map((tone) => (
              <Status key={tone} tone={tone}>
                {tone}
              </Status>
            ))}
          </Cluster>
          <Cluster gap={3}>
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </Cluster>
          <Cluster gap={3}>
            <Avatar name="Ada Lovelace" size="sm" />
            <Avatar name="Ada Lovelace" size="md" />
            <Avatar name="Ada Lovelace" size="lg" />
            <Avatar name="Grace Hopper" size="xl" shape="square" />
            {/* Unreachable on purpose: the initials are what a failed load
                is supposed to leave behind. */}
            <Avatar name="Alan Turing" size="xl" src="https://example.invalid/x.png" />
          </Cluster>
          <Cluster gap={4}>
            <ObjectRef href="#" name="booking-api" type="Service" />
            <ObjectRef
              href="#"
              name="postgres-main"
              type="Database"
              status="warning"
              statusLabel="degraded"
              context="97% disk used"
            />
          </Cluster>
          <Breadcrumbs
            items={[
              { label: 'Projects', href: '#' },
              { label: 'smart-travel', href: '#' },
              { label: 'booking-api' },
            ]}
          />
          <Separator />
          <Skeleton lines={2} />
        </Stack>
      </Section>

      {/* ── Structure ────────────────────────────────────────────────────── */}
      <Section title="Collections">
        <Grid min="18rem" gap={4}>
          <Table density="compact">
            <thead>
              <tr>
                <Th>Deployment</Th>
                <Th>Status</Th>
                <Th align="end">Duration</Th>
              </tr>
            </thead>
            <tbody>
              <Tr interactive selected>
                <Td>#381</Td>
                <Td>
                  <Status tone="success">Succeeded</Status>
                </Td>
                <Td align="end" mono>
                  1m 12s
                </Td>
              </Tr>
              <Tr interactive>
                <Td>#380</Td>
                <Td>
                  <Status tone="danger">Failed</Status>
                </Td>
                <Td align="end" mono>
                  0m 41s
                </Td>
              </Tr>
            </tbody>
          </Table>

          <List bounded>
            {['telegram-bot', 'web', 'partner-gateway'].map((name) => (
              <ListItem key={name} interactive>
                <Inline gap={2}>
                  <Text truncate>{name}</Text>
                </Inline>
              </ListItem>
            ))}
          </List>

          <Tree>
            <TreeNode label="smart-travel" open>
              <TreeLeaf href="#" selected>
                booking-api
              </TreeLeaf>
              <TreeLeaf href="#">search-api</TreeLeaf>
            </TreeNode>
          </Tree>

          <KeyValue
            items={[
              { key: 'Environment', value: 'production' },
              { key: 'Version', value: 'v1.14.2', mono: true },
              { key: 'Replicas', value: '3 / 3' },
            ]}
          />

          <RelationshipList
            items={[
              {
                predicate: 'belongs to',
                object: <ObjectRef href="#" name="smart-travel" type="Project" />,
              },
            ]}
          />

          <ActivityStream
            entries={[
              {
                description: 'Deployed v1.14.2 to production',
                time: '18m ago',
                actor: 'CI Pipeline #381',
                tone: 'success',
              },
              {
                description: 'Error rate crossed 2%',
                time: '3h ago',
                actor: 'alertmanager',
                tone: 'danger',
              },
            ]}
          />
        </Grid>
      </Section>

      <Section title="Navigation">
        <Stack gap={4}>
          <TabNav>
            <Tab href="#" aria-current="page">
              Overview
            </Tab>
            <Tab href="#" count={12}>
              Deployments
            </Tab>
            <Tab href="#">Logs</Tab>
          </TabNav>

          <Tabs
            label="Local tabs"
            items={[
              { label: 'Timeline', content: <Text>State lives in a radio group.</Text> },
              { label: 'Incidents', count: 3, content: <Text>No open incidents.</Text> },
            ]}
          />

          <Pagination page={page} pageCount={24} onPageChange={setPage} />
        </Stack>
      </Section>

      {/* ── Layers ───────────────────────────────────────────────────────── */}
      <Section title="Layers" description="Popover, dialog, sheet and toast.">
        <Cluster gap={3}>
          <Button {...menu.trigger}>Open menu</Button>
          <Popover {...menu.content}>
            <Menu>
              <MenuLabel>Actions</MenuLabel>
              <MenuItem shortcut="⌘L">Open logs</MenuItem>
              <MenuItem shortcut="⌘R">Restart</MenuItem>
              <MenuSeparator />
              <MenuItem variant="danger">Delete service</MenuItem>
            </Menu>
          </Popover>

          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button onClick={() => setSheetOpen(true)}>Open sheet</Button>
          <Button
            onClick={() =>
              toast({ title: 'Deployment queued', description: 'booking-api → eu-west' })
            }
          >
            Raise a toast
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              toast({ title: 'Rollback failed', tone: 'danger', duration: 0 })
            }
          >
            Sticky toast
          </Button>
        </Cluster>
      </Section>

      <Section title="Nothing here">
        <EmptyState
          title="No open incidents"
          description="Incidents appear here when an alert fires and stays unacknowledged."
          action={<Button size="sm">Configure alerts</Button>}
        />
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete service"
        description="This cannot be undone."
        tone="danger"
        footer={
          <>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        <Text>Every deployment and its logs go with it.</Text>
      </Dialog>

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        placement="sheet"
        title="Confirm rollout"
        description="This replaces the running revision."
        footer={
          <>
            <Button onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              Roll out
            </Button>
          </>
        }
      >
        {/* Raised from inside a modal on purpose: the top layer is the only
            place a message can be painted above an open dialog. */}
        <Button onClick={() => toast({ title: 'Raised from inside the dialog' })}>
          Toast over the modal
        </Button>
      </Dialog>
    </Stack>
  )
}

function Page({ density }: { density: Density }) {
  return (
    <Root density={density} className="min-h-screen">
      <Container measure="app" className="py-8">
        <Stack gap={6}>
          <ObjectHeader
            type="Kit"
            name={`Everything — ${density}`}
            status={<Status tone="info">{density}</Status>}
            actions={
              <ObjectActions
                primary={<Button variant="primary">Primary action</Button>}
                overflow={<MenuItem>Nothing here</MenuItem>}
              />
            }
          />
          <Gallery />
        </Stack>
      </Container>
      <Toaster />
    </Root>
  )
}

/** The dense desktop row: a filter bar and a table of objects on one screen. */
export const Compact: Story = () => <Page density="compact" />

/**
 * Russian, and the point is which half of it the kit had to be told.
 *
 * `locale` alone moves everything derived from a date — month and weekday
 * names, the order of the days, the week starting on Monday. None of that is
 * translated here; `Intl` knows it. `labels` covers the seventeen words the
 * kit puts on screen itself, which nothing else could have known.
 */
export const Russian: Story = () => (
  <Root locale="ru-RU" labels={LABELS_RU} className="min-h-screen">
    <Container measure="app" className="py-8">
      <Gallery />
    </Container>
    <Toaster />
  </Root>
)

/** The same page, one attribute apart. Nothing in it names a size. */
export const Touch: Story = () => <Page density="touch" />

/** Both at once, which is the only way to see that only the scale changed. */
export const BothDensities: Story = () => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
    <Page density="compact" />
    <Page density="touch" />
  </div>
)

/**
 * A panel is narrow on purpose: the layouts read the space they are in, not
 * the width of the window, so this is the same components in a sidebar.
 */
export const InAPanel: Story = () => (
  <Root className="h-screen">
    <Panel title="Everything, in 380px" mode="auto">
      <Gallery />
    </Panel>
  </Root>
)
