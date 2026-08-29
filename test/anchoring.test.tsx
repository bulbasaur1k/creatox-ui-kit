import { afterEach, beforeEach, expect, test } from 'bun:test'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Select } from '../src/primitives/Listbox'

/* ── Привязка списка к триггеру внутри top layer ───────────────────────────
   CSS anchor positioning не резолвится, когда и триггер, и попап в top layer:
   Select внутри открытого <dialog> (наш Sheet) улетал на сотни пикселей от
   поля. Компонент теперь проверяет привязку после открытия и, если она не
   сработала, ставит top/left руками и держит их на скролле и резайзе.

   happy-dom раскладку не считает, поэтому «сломанную» и «сработавшую»
   привязку тесты изображают прямоугольниками через подмену
   getBoundingClientRect. Настоящий движок смотрят глазами — стори
   «Sheet / With Select». */

const ANCHOR_QUERY = 'anchor-name: --cx-a'

/* Глобальный CSS у happy-dom — геттер, отдающий свежий объект на каждое
   обращение, а его supports говорит «да» на любой запрос. Править метод на
   одном из экземпляров бесполезно — переопределяется само свойство. */
const nativeCss = Object.getOwnPropertyDescriptor(globalThis, 'CSS')!
const escape = CSS.escape.bind(CSS)
let anchorsSupported = true

beforeEach(() => {
  anchorsSupported = true
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: {
      escape,
      supports: (query: string) => (query === ANCHOR_QUERY ? anchorsSupported : true),
    },
  })
})

afterEach(() => {
  Object.defineProperty(globalThis, 'CSS', nativeCss)
  document.body.innerHTML = ''
})

function domRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect
}

function press(element: Element, key: string) {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
}

const OPTIONS = [
  { value: 'success', label: 'Успешные' },
  { value: 'failed', label: 'Упавшие' },
  { value: 'running', label: 'Идущие' },
]

/** Селект с подменёнными прямоугольниками триггера и списка. */
function mountSelect(triggerRect: DOMRect, listRect: DOMRect) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => root.render(<Select options={OPTIONS} placeholder="Любой" />))

  const trigger = host.querySelector('button')!
  const list = host.querySelector<HTMLElement>('[popover]')!
  trigger.getBoundingClientRect = () => triggerRect
  list.getBoundingClientRect = () => listRect

  return { trigger, list }
}

test('несработавшая привязка чинится ручным top/left и снимается на закрытии', () => {
  // Триггер внизу, список — у верха вьюпорта: та самая картинка из бага.
  const anchor = domRect(100, 647, 200, 32)
  const { trigger, list } = mountSelect(anchor, domRect(40, 142, 240, 200))

  press(trigger, 'ArrowDown')

  expect(list.style.position).toBe('fixed')
  expect(list.style.minWidth).toBe('200px')
  expect(list.style.top).toBe(`${anchor.bottom + 4}px`)
  expect(list.style.left).toBe('100px')

  // Скролл двигает триггер — список едет за ним, а не остаётся висеть.
  trigger.getBoundingClientRect = () => domRect(100, 500, 200, 32)
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
  expect(list.style.top).toBe(`${500 + 32 + 4}px`)

  // Закрытие возвращает список стилям кита: следующее открытие в обычном
  // месте снова доверяется CSS.
  press(trigger, 'Escape')
  expect(list.style.position).toBe('')
  expect(list.style.top).toBe('')
  expect(list.style.minWidth).toBe('')
})

test('сработавшая привязка остаётся за CSS — инлайновых стилей нет', () => {
  // Список ровно под триггером, с зазором в четыре пикселя.
  const { trigger, list } = mountSelect(
    domRect(100, 647, 200, 32),
    domRect(100, 683, 240, 200),
  )

  press(trigger, 'ArrowDown')

  expect(list.matches(':popover-open')).toBe(true)
  expect(list.style.position).toBe('')
  expect(list.style.top).toBe('')
})

test('движок без поддержки анкоров не трогается — там шторка снизу из CSS', () => {
  anchorsSupported = false
  const { trigger, list } = mountSelect(
    domRect(100, 647, 200, 32),
    domRect(40, 142, 240, 200),
  )

  press(trigger, 'ArrowDown')

  expect(list.matches(':popover-open')).toBe(true)
  expect(list.style.position).toBe('')
})
