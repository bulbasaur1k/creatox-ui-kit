import { afterEach, expect, test } from 'bun:test'
import { act, useState, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SideNav, SideNavGroup, SideNavItem } from '../src/layout/SideNav'

/* ── SideNav ───────────────────────────────────────────────────────────────
   Свёрнутость держит чекбокс, а сама ширина и подписи — CSS, которого
   happy-dom не считает. Здесь проверяется контракт вокруг чекбокса: он
   переключается стрелкой без React, отдаёт состояние наверх в управляемом
   режиме, а пункты несут то, по чему CSS их подпишет на рельсе. Само
   сворачивание смотрят глазами — стори «Layout / SideNav». */

let root: Root | undefined

function render(ui: ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(ui))
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const state = (host: HTMLElement) =>
  host.querySelector<HTMLInputElement>('.cx-sidenav-state')!
const toggle = (host: HTMLElement) =>
  host.querySelector<HTMLLabelElement>('.cx-sidenav-toggle')!

test('стрелка переключает чекбокс, React в этом не участвует', () => {
  const host = render(
    <SideNav>
      <SideNavItem icon={<i />}>Обзор</SideNavItem>
    </SideNav>,
  )
  expect(state(host).checked).toBe(false)
  expect(toggle(host).htmlFor).toBe(state(host).id)

  act(() => toggle(host).click())
  expect(state(host).checked).toBe(true)

  act(() => toggle(host).click())
  expect(state(host).checked).toBe(false)
})

test('defaultCollapsed открывает колонку уже свёрнутой', () => {
  const host = render(<SideNav defaultCollapsed>{null}</SideNav>)
  expect(state(host).checked).toBe(true)
})

test('управляемый режим: состояние из пропа, изменение уходит наверх', () => {
  const seen: boolean[] = []
  function Host() {
    const [collapsed, setCollapsed] = useState(false)
    return (
      <SideNav
        collapsed={collapsed}
        onCollapsedChange={(next) => {
          seen.push(next)
          setCollapsed(next)
        }}
      >
        {null}
      </SideNav>
    )
  }
  const host = render(<Host />)

  act(() => toggle(host).click())
  expect(seen).toEqual([true])
  expect(state(host).checked).toBe(true)
})

test('без стрелки состояние всё равно есть — его ведёт продукт', () => {
  const host = render(
    <SideNav collapsed toggle={false} onCollapsedChange={() => {}}>
      {null}
    </SideNav>,
  )
  expect(host.querySelector('.cx-sidenav-toggle')).toBeNull()
  expect(state(host).checked).toBe(true)
})

test('пункт: выбранный несёт aria-current, подпись для рельса — из текста или из label', () => {
  const host = render(
    <SideNav>
      <SideNavItem href="#" icon={<i />} selected>
        Обзор
      </SideNavItem>
      <SideNavItem href="#" icon={<i />} label="Инциденты" count={3}>
        <b>Инциденты</b>
      </SideNavItem>
      <SideNavItem as="button" icon={<i />}>
        Тема
      </SideNavItem>
    </SideNav>,
  )
  const [overview, incidents, theme] = host.querySelectorAll('.cx-sidenav-item')
  expect(overview.getAttribute('aria-current')).toBe('page')
  expect(overview.getAttribute('data-cx-tooltip')).toBe('Обзор')
  expect(incidents.getAttribute('aria-current')).toBeNull()
  expect(incidents.getAttribute('data-cx-tooltip')).toBe('Инциденты')
  expect(incidents.querySelector('.cx-sidenav-count')?.textContent).toBe('3')
  expect(theme.tagName).toBe('BUTTON')
  expect(theme.getAttribute('type')).toBe('button')
})

test('группа без иконок помечена, чтобы на рельсе спрятаться целиком', () => {
  const host = render(
    <SideNav>
      <SideNavGroup title="Объекты" onlyExpanded>
        <span>дерево</span>
      </SideNavGroup>
      <SideNavGroup title="Ещё">{null}</SideNavGroup>
    </SideNav>,
  )
  const [tree, plain] = host.querySelectorAll('.cx-sidenav-group')
  expect(tree.hasAttribute('data-only-expanded')).toBe(true)
  expect(plain.hasAttribute('data-only-expanded')).toBe(false)
  expect(tree.querySelector('.cx-sidenav-group-title')?.textContent).toBe('Объекты')
})

test('нужную Split подсказку колонка несёт сама, пока её не попросят остаться', () => {
  const host = render(
    <>
      <SideNav>{null}</SideNav>
      <SideNav hideOnNarrow={false}>{null}</SideNav>
    </>,
  )
  const [drops, stays] = host.querySelectorAll('nav')
  expect(drops.getAttribute('data-cx-collapsible')).toBe('true')
  expect(stays.hasAttribute('data-cx-collapsible')).toBe(false)
})
