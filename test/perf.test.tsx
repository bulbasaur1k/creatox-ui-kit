import { expect, test } from 'bun:test'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Combobox, Select } from '../src/primitives/Listbox'
import { cx } from '../src/util/cx'

/* ── Бюджеты, а не секундомер ──────────────────────────────────────────────
   Тесты здесь ловят не «стало на 5% медленнее», а возврат к тому классу
   решений, от которого кит ушёл: активный пункт обратно в состоянии React,
   снятый потолок списка, подписка на каждое открытие. Поэтому пороги стоят с
   запасом в десять-двадцать раз — они не должны мигать на медленной машине,
   но обязаны падать, если исчезнет сам приём.

   Абсолютные миллисекунды тут не браузерные: happy-dom не считает раскладку.
   Wall-clock в настоящем движке живёт на стенде — demo/stress.tsx.        */

function mount(node: React.ReactNode): { root: Root; host: HTMLElement } {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => root.render(node))
  return { root, host }
}

function press(element: Element, key: string) {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
}

/**
 * Считает подписки. Патчится не глобальный `EventTarget`, а тот прототип, на
 * котором метод реально лежит у элементов этого документа: happy-dom
 * регистрирует свои классы, и глобальный `EventTarget` из теста к ним
 * отношения не имеет — подмена молча ничего не ловила бы.
 */
function spyListeners() {
  let proto = Object.getPrototypeOf(document.createElement('div')) as Record<
    string,
    unknown
  >
  while (proto && !Object.getOwnPropertyNames(proto).includes('addEventListener')) {
    proto = Object.getPrototypeOf(proto) as Record<string, unknown>
  }

  const nativeAdd = proto.addEventListener as (...args: unknown[]) => unknown
  const nativeRemove = proto.removeEventListener as (...args: unknown[]) => unknown
  const added: string[] = []
  const removed: string[] = []

  proto.addEventListener = function (this: unknown, ...args: unknown[]) {
    added.push(String(args[0]))
    return nativeAdd.apply(this, args)
  }
  proto.removeEventListener = function (this: unknown, ...args: unknown[]) {
    removed.push(String(args[0]))
    return nativeRemove.apply(this, args)
  }

  return {
    added,
    removed,
    count: (type: string) => ({
      added: added.filter((name) => name === type).length,
      removed: removed.filter((name) => name === type).length,
    }),
    stop() {
      proto.addEventListener = nativeAdd
      proto.removeEventListener = nativeRemove
    },
  }
}

const REGIONS = Array.from({ length: 2000 }, (_, i) => `region-${i}`)
const OPTIONS = REGIONS.map((value) => ({ value, label: value }))

test('Combobox рисует не больше сотни совпадений из двух тысяч', () => {
  const { root, host } = mount(<Combobox options={REGIONS} />)
  const rows = host.querySelectorAll('[role=option]')
  expect(rows.length).toBe(100)
  expect(host.textContent).toContain('Not everything is shown')
  act(() => root.unmount())
})

test('движение по списку не пересобирает его: сто стрелок на двух тысячах опций', () => {
  const { root, host } = mount(<Select options={OPTIONS} defaultValue="region-0" />)
  const trigger = host.querySelector('[role=combobox]')!
  press(trigger, 'ArrowDown')

  const started = performance.now()
  for (let i = 0; i < 100; i++) press(trigger, 'ArrowDown')
  const elapsed = performance.now() - started

  // Порог стоит между двумя режимами, а не «примерно там»: сто перерисовок
  // того же списка занимают в тринадцать раз больше, чем сто движений
  // атрибутом. Верните активный пункт в состояние React — и тест упадёт.
  expect(elapsed).toBeLessThan(400)
  expect(host.querySelectorAll('[data-active]').length).toBe(1)
  act(() => root.unmount())
})

test('открытие и закрытие не подписываются заново', () => {
  const { root, host } = mount(
    <Select options={OPTIONS.slice(0, 20)} defaultValue="region-0" />,
  )
  const trigger = host.querySelector('[role=combobox]')!
  const list = host.querySelector('[popover]') as HTMLElement

  const spy = spyListeners()
  for (let i = 0; i < 100; i++) {
    act(() => list.showPopover())
    act(() => list.hidePopover())
  }
  const beforetoggle = spy.count('beforetoggle')
  const всего = spy.added.length
  spy.stop()

  expect(beforetoggle.added).toBe(0)
  expect(всего).toBe(0)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  act(() => root.unmount())
})

test('размонтирование снимает всё, что подписал кит', () => {
  const ЦИКЛОВ = 50

  /* React сам вешает `beforetoggle` на каждый элемент с атрибутом `popover`
     и не снимает его — слушатель уходит вместе с узлом. Чтобы это не читалось
     как утечка кита, та же карусель прогоняется на голом div и вычитается. */
  const базовый = spyListeners()
  const пустой = mount(<div popover="auto" />)
  for (let i = 0; i < ЦИКЛОВ; i++) {
    act(() => пустой.root.render(<div key={i} popover="auto" />))
    act(() => пустой.root.render(null))
  }
  act(() => пустой.root.unmount())
  const реакт = базовый.count('beforetoggle')
  базовый.stop()

  const spy = spyListeners()
  const { root } = mount(
    <Select options={OPTIONS.slice(0, 20)} defaultValue="region-0" />,
  )
  for (let i = 0; i < ЦИКЛОВ; i++) {
    act(() =>
      root.render(
        <Select key={i} options={OPTIONS.slice(0, 20)} defaultValue="region-0" />,
      ),
    )
    act(() => root.render(null))
  }
  act(() => root.unmount())
  const всего = spy.count('beforetoggle')
  spy.stop()

  const подписалКит = всего.added - реакт.added
  expect(подписалКит).toBeGreaterThan(ЦИКЛОВ - 1)
  expect(всего.removed).toBe(подписалКит)
  expect(реакт.removed).toBe(0)
})

test('cx остаётся дешёвым на повторяющихся строках', () => {
  const parts = [
    'flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5',
    'text-control-md text-fg',
    'data-active:bg-hover aria-disabled:cursor-not-allowed',
  ]
  cx(...parts)

  const started = performance.now()
  for (let i = 0; i < 10_000; i++) cx(...parts)
  const elapsed = performance.now() - started

  // Кэш tailwind-merge держит это в районе микросекунды на вызов; без кэша
  // каждый вызов разбирает строку заново и порог не выдерживается.
  expect(elapsed).toBeLessThan(200)
})

test('стрелка не уходит за отрисованный потолок списка', () => {
  const { root, host } = mount(<Combobox options={REGIONS} />)
  const input = host.querySelector('[role=combobox]')!

  press(input, 'ArrowDown')
  for (let i = 0; i < 150; i++) press(input, 'ArrowDown')

  // Сто пятьдесят шагов по списку из ста строк: активным всё равно остаётся
  // нарисованный пункт, а не двухсотый из отфильтрованных, которого в DOM нет.
  const active = host.querySelector('[data-active]')
  expect(active).not.toBeNull()
  expect(input.getAttribute('aria-activedescendant')).toBe(active!.id)
  act(() => root.unmount())
})

test('Select с двумя тысячами опций монтируется за один проход', () => {
  const started = performance.now()
  const { root, host } = mount(<Select options={OPTIONS} defaultValue="region-0" />)
  const elapsed = performance.now() - started

  expect(host.querySelectorAll('[role=option]').length).toBe(2000)
  // Ловит не миллисекунды, а появление работы на каждую строку — эффекта,
  // подписки, замера. Такое сразу уводит монтирование в другой порядок.
  expect(elapsed).toBeLessThan(600)
  act(() => root.unmount())
})
