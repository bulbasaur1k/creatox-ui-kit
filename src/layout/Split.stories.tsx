import type { Story } from '@ladle/react'
import { Split } from './Split'
import { Stack } from './Stack'
import { Section } from './Section'
import { Panel } from '../primitives/Panel'
import { Text } from '../primitives/Text'
import { EmptyState } from '../primitives/Feedback'
import { Button } from '../primitives/Button'

export default { title: 'Layout / Split' }

/**
 * Drag the width control in the toolbar rather than resizing the window: the
 * layout responds to the space it is given, not to the viewport, which is the
 * whole point of §6. The context region moves below the object first, and
 * navigation collapses only when the object needs the whole width.
 */
export const Reflow: Story = () => (
  <Split className="min-h-[32rem] border border-line">
    <nav data-cx-collapsible="true" className="p-4">
      <Text variant="label">Navigation</Text>
    </nav>

    <Stack gap={4} className="p-4">
      <Text variant="identity" as="h1">
        booking-api
      </Text>
      <Section title="Deployments">
        <Text tone="secondary">The primary object gets the room it needs.</Text>
      </Section>
    </Stack>

    <Panel title="Related" mode="docked">
      <Text tone="secondary">
        Below roughly 68rem this region moves under the object instead of squeezing it.
      </Text>
    </Panel>
  </Split>
)

/** Two regions: navigation and the object, no context panel. */
export const TwoRegions: Story = () => (
  <Split className="min-h-[24rem] border border-line">
    <nav data-cx-collapsible="true" className="p-4">
      <Text variant="label">Navigation</Text>
    </nav>
    <div className="p-4">
      <EmptyState
        title="No deployments yet"
        description="Deployments appear here once this service has been released to an environment."
        action={<Button size="sm">Create deployment</Button>}
      />
    </div>
  </Split>
)
