import type { Story } from '@ladle/react'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { Cluster } from '../layout/Cluster'
import { Stack } from '../layout/Stack'
import { Text } from './Text'

export default { title: 'Primitives / Button' }

const VARIANTS = ['default', 'primary', 'quiet', 'danger'] as const
const SIZES = ['sm', 'md', 'lg'] as const

/**
 * The state matrix is the point of this story, not the happy path. §19 asks
 * every interactive component to define default, hover, focus, active,
 * selected, disabled and loading — if one of them is missing it shows up here.
 */
export const States: Story = () => (
  <Stack gap={6}>
    {VARIANTS.map((variant) => (
      <Stack key={variant} gap={2}>
        <Text variant="label">{variant}</Text>
        <Cluster gap={3}>
          <Button variant={variant}>Default</Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
          <Button variant={variant} aria-pressed="true">
            Selected
          </Button>
        </Cluster>
      </Stack>
    ))}
  </Stack>
)

export const Sizes: Story = () => (
  <Cluster gap={3}>
    {SIZES.map((size) => (
      <Button key={size} size={size}>
        Deploy
      </Button>
    ))}
  </Cluster>
)

/**
 * A loading button keeps its label in place. Swapping the text for a spinner
 * would change the button's width mid-click and move whatever sits next to it.
 */
export const LoadingKeepsWidth: Story = () => (
  <Cluster gap={3}>
    <Button variant="primary">Save changes</Button>
    <Button variant="primary" loading>
      Save changes
    </Button>
  </Cluster>
)

export const IconOnly: Story = () => (
  <Cluster gap={3}>
    {SIZES.map((size) => (
      <IconButton
        key={size}
        size={size}
        label="More actions"
        tooltip
        icon={
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <circle cx="12" cy="5" r="1.4" fill="currentColor" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
            <circle cx="12" cy="19" r="1.4" fill="currentColor" />
          </svg>
        }
      />
    ))}
  </Cluster>
)
