import { expect, test } from 'bun:test'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Alert } from '../src/primitives/Alert'
import { Button } from '../src/primitives/Button'
import { Input } from '../src/primitives/Field'
import { Upload } from '../src/primitives/Upload'
import { TreeSelect } from '../src/primitives/TreeSelect'
import { useSettled, useHeldResult } from '../src/util/settle'

/* ── Обратная связь на ожидание ────────────────────────────────────────────
   Тайминги здесь уменьшены до десятков миллисекунд, но пропорции те же:
   индикатор не показывается, если ответ пришёл раньше задержки, и не
   исчезает раньше минимальной длительности, если показался.              */

function mount(node: React.ReactNode): { root: Root; host: HTMLElement } {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => root.render(node))
  return { root, host }
}

const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

function Probe({
  pending,
  delay,
  min,
}: {
  pending: boolean
  delay: number
  min: number
}) {
  const shown = useSettled(pending, { delay, minDuration: min })
  return <output>{String(shown)}</output>
}

test('ответ раньше задержки не показывает индикатор вовсе', async () => {
  const { root, host } = mount(<Probe pending delay={40} min={40} />)
  await sleep(15)
  act(() => root.render(<Probe pending={false} delay={40} min={40} />))
  await sleep(60)
  expect(host.textContent).toBe('false')
  act(() => root.unmount())
})

test('показанный индикатор держится минимальное время', async () => {
  const { root, host } = mount(<Probe pending delay={10} min={80} />)
  await sleep(25)
  expect(host.textContent).toBe('true')
  act(() => root.render(<Probe pending={false} delay={10} min={80} />))
  await sleep(20)
  // Ответ пришёл, но спиннер ещё не отработал свой минимум.
  expect(host.textContent).toBe('true')
  await sleep(80)
  expect(host.textContent).toBe('false')
  act(() => root.unmount())
})

function Held({ result, hold }: { result?: string; hold: number }) {
  const held = useHeldResult(result, { hold })
  return <output>{held ?? '—'}</output>
}

test('результат показывается и сам уходит', async () => {
  const { root, host } = mount(<Held result="success" hold={30} />)
  expect(host.textContent).toBe('success')
  await sleep(50)
  expect(host.textContent).toBe('—')
  act(() => root.unmount())
})

test('кнопка в ожидании не принимает второй клик, даже без спиннера', () => {
  let clicks = 0
  const { root, host } = mount(
    <Button loading onClick={() => clicks++}>
      Save
    </Button>,
  )
  const button = host.querySelector('button')!
  // Спиннера ещё нет — задержка не вышла, — но клик уже должен пропасть.
  expect(button.getAttribute('aria-busy')).toBeNull()
  expect(button.hasAttribute('data-pending')).toBe(true)
  act(() => button.click())
  expect(clicks).toBe(0)
  act(() => root.unmount())
})

test('Alert: опасность прерывает, остальное ждёт', () => {
  const { root, host } = mount(
    <>
      <Alert tone="danger">Bad</Alert>
      <Alert tone="info" onDismiss={() => {}}>
        Fine
      </Alert>
    </>,
  )
  const [danger, info] = host.querySelectorAll('div[role]')
  expect(danger!.getAttribute('role')).toBe('alert')
  expect(info!.getAttribute('role')).toBe('status')
  expect(info!.querySelector('button')).not.toBeNull()
  act(() => root.unmount())
})

test('Upload отдаёт подходящие файлы и отбраковывает остальные', () => {
  const taken: string[] = []
  const rejected: string[] = []
  const { root, host } = mount(
    <Upload
      multiple
      accept=".pdf,image/*"
      maxSize={100}
      onFiles={(files) => taken.push(...files.map((f) => f.name))}
      onReject={(list) => rejected.push(...list.map((r) => `${r.file.name}:${r.reason}`))}
    />,
  )
  const input = host.querySelector<HTMLInputElement>('input[type=file]')!
  const files = [
    new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
    new File(['x'], 'photo.png', { type: 'image/png' }),
    new File(['x'], 'notes.txt', { type: 'text/plain' }),
    new File([new Uint8Array(200)], 'big.pdf', { type: 'application/pdf' }),
  ]
  const list = {
    length: files.length,
    item: (i: number) => files[i]!,
    [Symbol.iterator]: files[Symbol.iterator].bind(files),
  }
  Object.defineProperty(input, 'files', { value: list, configurable: true })
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })))
  expect(taken).toEqual(['doc.pdf', 'photo.png'])
  expect(rejected).toEqual(['notes.txt:type', 'big.pdf:size'])
  act(() => root.unmount())
})

test('TreeSelect показывает свёрнутое дерево и раскрывает ветку', () => {
  const nodes = [
    { value: 'a', label: 'A', children: [{ value: 'a1', label: 'A1' }] },
    { value: 'b', label: 'B' },
  ]
  function Wrapped() {
    const [value, setValue] = useState('a1')
    return <TreeSelect nodes={nodes} value={value} onValueChange={setValue} />
  }
  const { root, host } = mount(<Wrapped />)
  // Выбранный лист лежит в ветке, значит ветка открыта с самого начала.
  expect(host.querySelectorAll('[role=option]').length).toBe(3)
  // В самом контроле — только имя, без отступа и шеврона.
  expect(
    host.querySelector('[role=combobox]')!.querySelector('button[aria-expanded]'),
  ).toBeNull()
  const fold = host.querySelector<HTMLButtonElement>(
    '[role=option] button[aria-expanded]',
  )!
  act(() =>
    fold.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    ),
  )
  expect(host.querySelectorAll('[role=option]').length).toBe(2)
  act(() => root.unmount())
})

test('mono-поле остаётся в своём ряду: высота и паддинги на месте', () => {
  const { root, host } = mount(<Input mono defaultValue="booking-api" />)
  const cls = host.querySelector('input')!.className
  expect(cls).toContain('control-md')
  expect(cls).toContain('field-mono')
  expect(cls).not.toContain('text-[')
  act(() => root.unmount())
})
