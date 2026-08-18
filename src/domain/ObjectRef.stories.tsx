import type { Story } from '@ladle/react'
import { ObjectRef } from './ObjectRef'
import { RelationshipList } from './RelationshipList'
import { Stack } from '../layout/Stack'
import { Text } from '../primitives/Text'
import { List, ListItem } from '../primitives/List'
import { Table, Td, Th, Tr } from '../primitives/Table'

export default { title: 'Domain / ObjectRef' }

/**
 * The same object, at every size it is asked to appear in. §18 wants one
 * recognisable representation — this story exists to catch the moment it stops
 * being recognisable.
 */
export const Sizes: Story = () => (
  <Stack gap={6}>
    {(['compact', 'default', 'rich'] as const).map((size) => (
      <Stack key={size} gap={2}>
        <Text variant="label">{size}</Text>
        <ObjectRef
          href="#"
          size={size}
          name="postgres-main"
          type="Database"
          status="warning"
          statusLabel="degraded"
          context="97% disk used · eu-central"
        />
      </Stack>
    ))}
  </Stack>
)

/** The same component inside the three containers it actually shows up in. */
export const InContext: Story = () => (
  <Stack gap={8}>
    <Stack gap={2}>
      <Text variant="label">In a table</Text>
      <Table density="compact">
        <thead>
          <tr>
            <Th>Service</Th>
            <Th>Environment</Th>
            <Th align="end">Errors</Th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <Tr key={row.name} interactive>
              <Td>
                <ObjectRef
                  as="span"
                  size="compact"
                  name={row.name}
                  type="Service"
                  status={row.tone}
                />
              </Td>
              <Td>{row.env}</Td>
              <Td align="end" mono>
                {row.errors}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Stack>

    <Stack gap={2}>
      <Text variant="label">In a list</Text>
      <List bounded>
        {ROWS.map((row) => (
          <ListItem key={row.name} interactive>
            <ObjectRef
              as="span"
              name={row.name}
              type="Service"
              status={row.tone}
              context={row.env}
            />
          </ListItem>
        ))}
      </List>
    </Stack>

    <Stack gap={2}>
      <Text variant="label">In a relationship list</Text>
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
                context="97% disk used"
              />
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
                context="Elevated 5xx"
              />
            ),
          },
        ]}
      />
    </Stack>
  </Stack>
)

const ROWS = [
  { name: 'booking-api', env: 'production', errors: '3', tone: 'success' },
  { name: 'search-api', env: 'production', errors: '0', tone: 'success' },
  { name: 'telegram-bot', env: 'staging', errors: '128', tone: 'danger' },
] as const
