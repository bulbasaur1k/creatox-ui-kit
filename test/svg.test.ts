import { expect, test } from 'bun:test'
import type { FrameNode, Snapshot, TextNode } from '../demo/snapshot'
import { snapshotToSvg } from '../demo/svg'

/* ── Снимок → SVG ──────────────────────────────────────────────────────────
   SVG — путь в веб-Figma, где плагин разработчика не запускается. Здесь
   проверяется, что каждая часть снимка превращается в то, что Figma
   разберёт в слой: группа с именем, прямоугольник с рамкой внутрь, текст
   построчно, тень в её собственной записи, иконка с перенесённой обводкой.
   Как это выглядит, смотрят на листе — кнопка «SVG для Figma». */

const rgba = (r: number, g: number, b: number, a = 1) => ({ r, g, b, a })

const text = (overrides: Partial<TextNode> = {}): TextNode => ({
  type: 'text',
  name: 'Сохранить',
  x: 12,
  y: 4,
  w: 60,
  h: 20,
  text: 'Сохранить',
  family: 'sans',
  size: 13,
  weight: 500,
  italic: false,
  lineHeight: 20,
  letterSpacing: 0,
  color: rgba(1, 1, 1),
  align: 'left',
  decoration: 'none',
  multiline: false,
  ...overrides,
})

const button: FrameNode = {
  type: 'frame',
  name: 'button',
  x: 10,
  y: 20,
  w: 100,
  h: 28,
  fill: rgba(0.1, 0.1, 0.1),
  stroke: { color: rgba(0, 0, 0, 0.5), top: 1, right: 1, bottom: 1, left: 1 },
  radius: [6, 6, 6, 6],
  shadows: [{ color: rgba(0, 0, 0, 0.1), x: 0, y: 1, blur: 2, spread: 0, inset: false }],
  children: [text()],
}

const section = (children: FrameNode['children'], extra: Partial<FrameNode> = {}) =>
  ({
    type: 'frame',
    name: 'Button',
    x: 32,
    y: 100,
    w: 800,
    h: 200,
    stroke: { color: rgba(0.9, 0.9, 0.9), top: 0, right: 0, bottom: 1, left: 0 },
    children,
    ...extra,
  }) satisfies FrameNode

const snapshot = (frames: FrameNode[]): Snapshot => ({
  source: 'demo/sheet.html',
  theme: 'light',
  width: 1440,
  height: 900,
  fonts: { sans: [], mono: [] },
  background: rgba(1, 1, 1),
  frames,
})

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')

test('the page is one svg: background first, then a named group per section', () => {
  const doc = parse(snapshotToSvg(snapshot([section([button])])))
  const root = doc.documentElement
  expect(root.getAttribute('width')).toBe('1440')
  expect(root.querySelector('#page')?.getAttribute('fill')).toBe('#ffffff')
  const group = root.querySelector('#Button')!
  expect(group.getAttribute('transform')).toBe('translate(32 100)')
  expect(group.querySelector('#button')?.getAttribute('transform')).toBe(
    'translate(10 20)',
  )
})

test('a border on one side is a bar, a border all round is an inset stroke', () => {
  const doc = parse(snapshotToSvg(snapshot([section([button])])))
  const bars = [...doc.querySelectorAll('#Button > rect')]
  expect(bars).toHaveLength(1)
  expect([bars[0].getAttribute('y'), bars[0].getAttribute('height')]).toEqual([
    '199',
    '1',
  ])

  const outline = doc.querySelector('#button > rect[stroke]')!
  expect(outline.getAttribute('x')).toBe('0.5')
  expect(outline.getAttribute('width')).toBe('99')
  expect(outline.getAttribute('rx')).toBe('5.5')
  expect(outline.getAttribute('stroke-opacity')).toBe('0.5')
})

test('uneven corners become a path rather than a rect', () => {
  const tab = {
    ...button,
    name: 'tab',
    radius: [6, 6, 0, 0] as [number, number, number, number],
  }
  const doc = parse(snapshotToSvg(snapshot([section([tab])])))
  expect(doc.querySelector('#tab > path')?.getAttribute('d')).toMatch(/^M6 0H94A6 6/)
})

test('a drop shadow is written the way Figma exports one', () => {
  const svg = snapshotToSvg(snapshot([section([button])]))
  const doc = parse(svg)
  const filter = doc.querySelector('filter')!
  expect(doc.querySelector('#button > rect[filter]')?.getAttribute('filter')).toBe(
    `url(#${filter.id})`,
  )
  expect(filter.querySelector('feOffset')?.getAttribute('dy')).toBe('1')
  expect(filter.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')).toBe('1')
  expect(svg).toContain('result="effect1_dropShadow"')
})

test('text lands on its baseline, line by line, in Figma fonts', () => {
  const paragraph = text({
    name: 'paragraph',
    x: 0,
    y: 0,
    w: 300,
    h: 40,
    text: 'Первая строка вторая строка',
    lines: ['Первая строка', 'вторая строка'],
    multiline: true,
    weight: 400,
  })
  const code = text({
    name: 'code',
    family: 'mono',
    align: 'right',
    decoration: 'underline',
  })
  const doc = parse(snapshotToSvg(snapshot([section([paragraph, code])])))
  const [first, second] = doc.querySelectorAll('text')

  expect(first.getAttribute('font-family')).toBe('Inter')
  expect(first.hasAttribute('font-weight')).toBe(false)
  const spans = [...first.querySelectorAll('tspan')]
  expect(spans.map((s) => s.textContent)).toEqual(['Первая строка', 'вторая строка'])
  // 20 / 2 + (0.96875 - 0.2421875) / 2 * 13
  expect(spans.map((s) => s.getAttribute('y'))).toEqual(['14.72', '34.72'])

  expect(second.getAttribute('font-family')).toBe('Roboto Mono')
  expect(second.getAttribute('text-anchor')).toBe('end')
  expect(second.querySelector('tspan')?.getAttribute('x')).toBe('60')
  expect(second.getAttribute('text-decoration')).toBe('underline')
})

test('an icon keeps its stroke and is scaled from its viewBox', () => {
  const icon = {
    type: 'svg' as const,
    name: 'icon',
    x: 4,
    y: 6,
    w: 16,
    h: 16,
    svg:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="1.6" aria-hidden="true" ' +
      'xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M5 12h14"></path></svg>',
  }
  const doc = parse(snapshotToSvg(snapshot([section([icon])])))
  const group = doc.querySelector('#icon')!
  expect(group.getAttribute('transform')).toBe('translate(4 6) scale(0.667 0.667)')
  expect(group.getAttribute('stroke')).toBe('#111111')
  expect(group.getAttribute('fill')).toBe('none')
  expect(group.hasAttribute('aria-hidden')).toBe(false)
  expect(group.querySelector('path')?.getAttribute('d')).toBe('M5 12h14')
})

test('a clipping frame masks only when something actually sticks out', () => {
  const inside = section([button], { name: 'fits', clip: true })
  const wide = { ...button, w: 2000 }
  const outside = section([wide], { name: 'overflows', clip: true })
  const doc = parse(snapshotToSvg(snapshot([inside, outside])))
  expect(doc.querySelector('#fits > g[clip-path]')).toBeNull()
  expect(doc.querySelector('#overflows > g[clip-path]')).not.toBeNull()
  expect(doc.querySelectorAll('clipPath')).toHaveLength(1)
})

test('names and text are escaped, so a quote or an ampersand does not break the file', () => {
  const tricky = text({ name: 'A & "B"', text: '<Tom & Jerry>' })
  const svg = snapshotToSvg(snapshot([section([tricky], { name: 'Status and badges' })]))
  const doc = parse(svg)
  expect(doc.querySelector('parsererror')).toBeNull()
  expect(doc.querySelector('#Status_and_badges')).not.toBeNull()
  expect(doc.querySelector('tspan')?.textContent).toBe('<Tom & Jerry>')
})
