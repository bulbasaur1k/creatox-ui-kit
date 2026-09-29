import { useState } from 'react'
import type { Story } from '@ladle/react'
import { Split } from './Split'
import { SideNav, SideNavGroup, SideNavItem, SideNavLabel } from './SideNav'
import { Stack } from './Stack'
import { Section } from './Section'
import { Button } from '../primitives/Button'
import { Icon } from '../primitives/Icon'
import { Text } from '../primitives/Text'
import { Tree, TreeLeaf, TreeNode } from '../primitives/Tree'
import { bell, calendar, menu, search, settings, triangleAlert } from '../icons'

export default { title: 'Layout / SideNav' }

function Brand() {
  return (
    <div className="flex h-control-md items-center gap-2 px-[var(--cx-sidenav-inset)]">
      <span className="cx-sidenav-icon rounded-sm bg-accent text-micro font-semibold text-fg-inverted">
        C
      </span>
      <SideNavLabel className="text-ui font-semibold">Creatox</SideNavLabel>
    </div>
  )
}

function Items() {
  return (
    <>
      <SideNavItem href="#" icon={<Icon>{menu}</Icon>} selected>
        Обзор
      </SideNavItem>
      <SideNavItem href="#" icon={<Icon>{search}</Icon>}>
        Поиск
      </SideNavItem>
      <SideNavItem href="#" icon={<Icon>{triangleAlert}</Icon>} count={3}>
        Инциденты
      </SideNavItem>
      <SideNavItem href="#" icon={<Icon>{calendar}</Icon>}>
        Календарь
      </SideNavItem>
      <SideNavGroup title="Объекты" onlyExpanded>
        <Tree>
          <TreeNode label="smart-travel" open>
            <TreeLeaf href="#">booking-api</TreeLeaf>
            <TreeLeaf href="#">search-api</TreeLeaf>
          </TreeNode>
          <TreeNode label="creatox-media">
            <TreeLeaf href="#">ingest</TreeLeaf>
          </TreeNode>
        </Tree>
      </SideNavGroup>
    </>
  )
}

function Footer() {
  return (
    <>
      <SideNavItem href="#" icon={<Icon>{bell}</Icon>} count={12}>
        Уведомления
      </SideNavItem>
      <SideNavItem href="#" icon={<Icon>{settings}</Icon>}>
        Настройки
      </SideNavItem>
    </>
  )
}

function Body() {
  return (
    <Stack gap={4} className="p-6">
      <Text variant="identity" as="h1">
        booking-api
      </Text>
      <Section title="Deployments">
        <Text tone="secondary">
          Нажмите стрелку внизу колонки: она сворачивается до иконок, подписи уходят, а
          иконки остаются на месте. Дерево объектов на рельсе прячется — у него нет
          иконок, до которых можно свернуться.
        </Text>
      </Section>
    </Stack>
  )
}

/**
 * Click the strip at the bottom. The state is a checkbox, so nothing here
 * re-renders: the column narrows in CSS, labels fade, and each row names
 * itself in a tooltip anchored beside the rail.
 */
export const Collapsible: Story = () => (
  <Split className="min-h-[36rem] border border-line">
    <SideNav header={<Brand />} footer={<Footer />}>
      <Items />
    </SideNav>
    <Body />
  </Split>
)

/** Starts folded — for a product that remembers the last state. */
export const Rail: Story = () => (
  <Split className="min-h-[36rem] border border-line">
    <SideNav header={<Brand />} footer={<Footer />} defaultCollapsed>
      <Items />
    </SideNav>
    <Body />
  </Split>
)

/** The product owns the state and can fold the column from anywhere. */
export const Controlled: Story = () => {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <Split className="min-h-[36rem] border border-line">
      <SideNav
        header={<Brand />}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        toggle={false}
      >
        <Items />
      </SideNav>
      <Stack gap={4} className="p-6">
        <Button onClick={() => setCollapsed((value) => !value)} className="self-start">
          {collapsed ? 'Развернуть' : 'Свернуть'} навигацию
        </Button>
        <Text tone="secondary">
          Без своей стрелки: состояние приходит из пропа, и переключает его кнопка здесь.
        </Text>
      </Stack>
    </Split>
  )
}

/** A menu longer than the column scrolls on its own; the strip stays put. */
export const Long: Story = () => (
  <Split className="h-[28rem] border border-line">
    <SideNav header={<Brand />}>
      {Array.from({ length: 24 }, (_, i) => (
        <SideNavItem key={i} href="#" icon={<Icon>{calendar}</Icon>} selected={i === 2}>
          Раздел {i + 1}
        </SideNavItem>
      ))}
    </SideNav>
    <Body />
  </Split>
)
