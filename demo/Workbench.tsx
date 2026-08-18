import { useState } from 'react'
import {
  ActivityStream,
  Badge,
  Button,
  Checkbox,
  Code,
  Dialog,
  EmptyState,
  Field,
  Grow,
  Inline,
  Input,
  KeyValue,
  List,
  ListItem,
  MenuItem,
  MenuSeparator,
  ObjectActions,
  ObjectHeader,
  ObjectRef,
  Panel,
  Popover,
  RelationshipList,
  Root,
  ScrollArea,
  Section,
  Select,
  Skeleton,
  Split,
  Stack,
  Status,
  Table,
  Tab,
  TabNav,
  Tabs,
  Td,
  Text,
  Th,
  Toggle,
  Tr,
  RowActions,
  IconButton,
  Tree,
  TreeLeaf,
  TreeNode,
  applyTheme,
  usePopover,
  Avatar,
  Combobox,
  DatePicker,
  TimePicker,
  Pagination,
  PinInput,
  Progress,
  SegmentedControl,
  Slider,
  Toaster,
  toast,
  type Density,
} from '../src'

/**
 * A workbench rather than a component gallery: the kit is meant to be judged
 * as a composed object view, which is the only way to see whether hierarchy,
 * density and relationships actually work.
 */
export function Workbench() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto')
  const [density, setDensity] = useState<Density>('compact')
  const [rollout, setRollout] = useState(40)
  const [code, setCode] = useState('')
  const [freezeUntil, setFreezeUntil] = useState('2026-03-20')
  const [freezeAt, setFreezeAt] = useState('18:00')
  const [page, setPage] = useState(7)
  const filters = usePopover()

  const nextTheme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'

  return (
    <Root className="min-h-screen" density={density}>
      <Split>
        {/* ── Navigation: objects, not features ─────────────────────────── */}
        <nav data-cx-collapsible="true" className="flex flex-col gap-4 p-4">
          <Inline justify="between">
            <Text variant="label">Creatox</Text>
            <Inline gap={1}>
              {/* The whole point of the density switch is that nothing below
                  this line knows about it. One attribute, every control. */}
              <Button
                size="sm"
                variant="quiet"
                onClick={() => setDensity(density === 'compact' ? 'touch' : 'compact')}
              >
                {density}
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  setTheme(nextTheme)
                  applyTheme(nextTheme)
                }}
              >
                {theme}
              </Button>
            </Inline>
          </Inline>

          <Tree>
            <TreeNode
              label="smart-travel"
              open
              leading={
                <Status tone="success" markOnly>
                  healthy
                </Status>
              }
            >
              <TreeLeaf href="#" selected>
                booking-api
              </TreeLeaf>
              <TreeLeaf href="#">search-api</TreeLeaf>
              <TreeLeaf href="#">telegram-bot</TreeLeaf>
              <TreeNode label="datastores">
                <TreeLeaf href="#">postgres-main</TreeLeaf>
                <TreeLeaf href="#">redis-cache</TreeLeaf>
              </TreeNode>
            </TreeNode>
            <TreeNode label="creatox-media">
              <TreeLeaf href="#">ingest</TreeLeaf>
            </TreeNode>
          </Tree>
        </nav>

        {/* ── The object ─────────────────────────────────────────────────── */}
        <ScrollArea className="p-6">
          <Stack gap={6} as="main">
            <ObjectHeader
              type="Service"
              name="booking-api"
              breadcrumbs={[
                { label: 'Projects', href: '#' },
                { label: 'smart-travel', href: '#' },
                { label: 'booking-api' },
              ]}
              status={<Status tone="success">Healthy</Status>}
              meta={
                <KeyValue
                  layout="inline"
                  items={[
                    { key: 'Environment', value: 'production' },
                    { key: 'Version', value: 'v1.14.2', mono: true },
                    { key: 'Replicas', value: '3 / 3' },
                    { key: 'Last deploy', value: '18 minutes ago' },
                    { key: 'Owner', value: 'platform' },
                  ]}
                />
              }
              actions={
                <ObjectActions
                  primary={<Button variant="primary">Deploy</Button>}
                  overflow={
                    <>
                      <MenuItem shortcut="⌘L">Open logs</MenuItem>
                      <MenuItem shortcut="⌘R">Restart</MenuItem>
                      <MenuSeparator />
                      <MenuItem variant="danger" onClick={() => setConfirmOpen(true)}>
                        Delete service
                      </MenuItem>
                    </>
                  }
                />
              }
              navigation={
                <TabNav>
                  <Tab href="#" aria-current="page">
                    Overview
                  </Tab>
                  <Tab href="#" count={12}>
                    Deployments
                  </Tab>
                  <Tab href="#" count={3}>
                    Incidents
                  </Tab>
                  <Tab href="#">Logs</Tab>
                  <Tab href="#">Settings</Tab>
                </TabNav>
              }
            />

            <Section
              title="Deployments"
              description="Last 12 releases to production"
              actions={
                <>
                  <Button size="sm" variant="quiet" {...filters.trigger}>
                    Filter
                  </Button>
                  <Popover {...filters.content}>
                    <div className="flex flex-col gap-3 p-3">
                      <Checkbox label="Failed only" />
                      <Checkbox label="Rollbacks" />
                      <Toggle label="Include preview envs" />
                    </div>
                  </Popover>
                  <Button size="sm">Export</Button>
                </>
              }
            >
              <Table density="compact">
                <thead>
                  <tr>
                    <Th>Deployment</Th>
                    <Th>Version</Th>
                    <Th>Triggered by</Th>
                    <Th>Status</Th>
                    <Th align="end">Duration</Th>
                    <Th align="end" />
                  </tr>
                </thead>
                <tbody>
                  {DEPLOYMENTS.map((d) => (
                    <Tr key={d.id} interactive selected={d.id === '#381'}>
                      <Td>
                        <ObjectRef
                          as="span"
                          name={d.id}
                          type="Deployment"
                          size="compact"
                        />
                      </Td>
                      <Td mono>{d.version}</Td>
                      <Td>{d.actor}</Td>
                      <Td>
                        <Status tone={d.tone}>{d.status}</Status>
                      </Td>
                      <Td align="end" mono>
                        {d.duration}
                      </Td>
                      <Td align="end">
                        <RowActions>
                          <IconButton
                            size="sm"
                            label="Open logs"
                            tooltip
                            icon={<Dots />}
                          />
                        </RowActions>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Section>

            <Section title="Activity">
              <Tabs
                label="Activity view"
                items={[
                  {
                    label: 'Timeline',
                    content: (
                      <ActivityStream
                        entries={[
                          {
                            description: 'Deployed v1.14.2 to production',
                            time: '18m ago',
                            actor: 'CI Pipeline #381',
                            tone: 'success',
                          },
                          {
                            description: 'Error rate crossed 2% for 4 minutes',
                            time: '3h ago',
                            actor: 'alertmanager',
                            tone: 'danger',
                            detail: (
                              <Code block>
                                {'level=error msg="upstream timeout"\ncount=1284'}
                              </Code>
                            ),
                          },
                          {
                            description: 'Scaled from 2 to 3 replicas',
                            time: 'Yesterday',
                            actor: 'autoscaler',
                            tone: 'info',
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    label: 'Incidents',
                    count: 3,
                    content: (
                      <EmptyState
                        title="No open incidents"
                        description="Incidents appear here when an alert fires against this service and stays unacknowledged for more than five minutes."
                        action={<Button size="sm">Configure alerts</Button>}
                      />
                    ),
                  },
                ]}
              />
            </Section>

            <Section title="Configuration" bounded>
              <Stack gap={4}>
                <Field
                  label="Service name"
                  help="Used in DNS and in the container registry path."
                  layout="horizontal"
                >
                  {(p) => <Input defaultValue="booking-api" mono {...p} />}
                </Field>
                <Field label="Environment" layout="horizontal">
                  {(p) => (
                    <Select defaultValue="production" {...p}>
                      <option value="production">production</option>
                      <option value="staging">staging</option>
                    </Select>
                  )}
                </Field>
                <Field
                  label="Replicas"
                  layout="horizontal"
                  error="Must be at least 2 in production."
                >
                  {(p) => <Input defaultValue="1" {...p} />}
                </Field>
                <Field label="Region" layout="horizontal">
                  {(p) => (
                    <Combobox
                      {...p}
                      defaultValue="eu-west-1"
                      options={['eu-west-1', 'eu-central-1', 'us-east-1']}
                    />
                  )}
                </Field>
                <Field label="Strategy" layout="horizontal">
                  {() => (
                    <SegmentedControl
                      label="Strategy"
                      defaultValue="rolling"
                      options={[
                        { value: 'rolling', label: 'Rolling' },
                        { value: 'blue-green', label: 'Blue / green' },
                        { value: 'recreate', label: 'Recreate' },
                      ]}
                    />
                  )}
                </Field>
                <Field
                  label="Canary share"
                  layout="horizontal"
                  help={`${rollout}% of traffic`}
                >
                  {(p) => (
                    <Slider
                      {...p}
                      value={rollout}
                      onChange={(e) => setRollout(Number(e.target.value))}
                    />
                  )}
                </Field>
                {/* Date and time are two controls, not one: there is no
                    single native widget worth wrapping, and the order they
                    read in belongs to the form, not to the kit. */}
                <Field label="Freeze deploys until" layout="horizontal">
                  {(p) => (
                    <Inline gap={2}>
                      <DatePicker
                        {...p}
                        value={freezeUntil}
                        onValueChange={setFreezeUntil}
                        // Weekends are not release days here, so they are shown
                        // and unavailable rather than hidden.
                        isDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
                      />
                      <TimePicker value={freezeAt} onValueChange={setFreezeAt} />
                    </Inline>
                  )}
                </Field>
                <Field
                  label="Confirmation code"
                  layout="horizontal"
                  help="Six digits from the email."
                >
                  {(p) => (
                    <PinInput {...p} value={code} onValueChange={setCode} label="Code" />
                  )}
                </Field>
              </Stack>
            </Section>

            <Section title="Rollout" bounded>
              <Stack gap={4}>
                <Progress label="Replicas updated" value={62} showValue />
                <Progress label="Draining old revision" tone="warning" />
                <Inline gap={3}>
                  <Avatar name="Ada Lovelace" />
                  <Avatar name="Grace Hopper" size="lg" />
                  <Grow>
                    <Text tone="muted">On call this week</Text>
                  </Grow>
                  <Button onClick={() => setSheetOpen(true)}>Roll out</Button>
                  <Button
                    onClick={() =>
                      toast({
                        title: 'Deployment queued',
                        description: 'booking-api → eu-west-1',
                      })
                    }
                  >
                    Notify
                  </Button>
                </Inline>
                <Pagination page={page} pageCount={24} onPageChange={setPage} />
              </Stack>
            </Section>
          </Stack>
        </ScrollArea>

        {/* ── Context ────────────────────────────────────────────────────── */}
        <Panel title="Related" mode="auto">
          <Stack gap={6}>
            <Section title="Relationships" headingLevel={3}>
              <RelationshipList
                items={[
                  {
                    predicate: 'belongs to',
                    object: <ObjectRef href="#" name="smart-travel" type="Project" />,
                  },
                  {
                    predicate: 'reads from',
                    object: (
                      <ObjectRef
                        href="#"
                        name="postgres-main"
                        type="Database"
                        status="warning"
                        statusLabel="degraded"
                        context="97% disk used"
                      />
                    ),
                  },
                  {
                    predicate: 'deployed by',
                    object: (
                      <ObjectRef href="#" name="CI Pipeline #381" type="Pipeline" />
                    ),
                  },
                  {
                    predicate: 'caused',
                    object: (
                      <ObjectRef
                        href="#"
                        name="INC-102"
                        type="Incident"
                        status="danger"
                        statusLabel="open"
                        context="Elevated 5xx on /bookings"
                      />
                    ),
                  },
                ]}
              />
            </Section>

            <Section title="Consumers">
              <List bounded>
                {['telegram-bot', 'web', 'partner-gateway'].map((n) => (
                  <ListItem
                    key={n}
                    interactive
                    leading={
                      <Status tone="success" markOnly>
                        ok
                      </Status>
                    }
                  >
                    <Inline gap={2}>
                      <Grow>
                        <Text truncate>{n}</Text>
                      </Grow>
                      <Badge tone="neutral">internal</Badge>
                    </Inline>
                  </ListItem>
                ))}
              </List>
            </Section>

            <Section title="Loading">
              <Skeleton lines={3} />
            </Section>
          </Stack>
        </Panel>
      </Split>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        tone="danger"
        title="Delete booking-api?"
        description="This removes the service, its deployments and its logs. Three consumers depend on it and will start failing immediately."
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(false)}>
              Delete service
            </Button>
          </>
        }
      />

      {/* The same <dialog>, docked to the bottom edge. On a phone that is
          where the controls have to be; modality and focus do not change. */}
      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        placement="sheet"
        title="Roll out v1.14.3?"
        description="Replaces the running revision on all three replicas."
        footer={
          <>
            <Button onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setSheetOpen(false)
                toast({ title: 'Rollout started', description: '0 of 3 replicas' })
              }}
            >
              Roll out
            </Button>
          </>
        }
      />

      <Toaster />
    </Root>
  )
}

function Dots() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <circle cx="12" cy="5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </svg>
  )
}

const DEPLOYMENTS = [
  {
    id: '#381',
    version: 'v1.14.2',
    actor: 'pipeline',
    status: 'Succeeded',
    tone: 'success',
    duration: '2m 14s',
  },
  {
    id: '#380',
    version: 'v1.14.1',
    actor: 'd.kozin',
    status: 'Rolled back',
    tone: 'warning',
    duration: '4m 02s',
  },
  {
    id: '#379',
    version: 'v1.14.0',
    actor: 'pipeline',
    status: 'Failed',
    tone: 'danger',
    duration: '1m 08s',
  },
  {
    id: '#378',
    version: 'v1.13.9',
    actor: 'pipeline',
    status: 'Succeeded',
    tone: 'success',
    duration: '2m 31s',
  },
] as const
