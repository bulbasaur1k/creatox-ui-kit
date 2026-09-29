import { beforeEach, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/* ── Плагин Figma: лист → страница ─────────────────────────────────────────
   figma/code.js — скрипт без сборки, который ждёт глобальный `figma`.
   Здесь он получает заглушку с той частью API, которой пользуется: узлы с
   детьми и размерами, шрифты, страницы. Заглушка раскладывает auto layout
   так же, как Figma — паддинг, потом дети через itemSpacing, — чтобы
   проверка «разошлось или нет» отрабатывала в обе стороны. */

class Node {
  type: string
  name = ''
  x = 0
  y = 0
  width = 0
  height = 0
  opacity = 1
  parent: Node | null = null
  children: Node[] = []
  layoutMode = 'NONE'
  layoutPositioning = 'AUTO'
  itemSpacing = 0
  paddingTop = 0
  paddingLeft = 0
  counterAxisAlignItems = 'MIN'
  fills: unknown[] = []
  strokes: unknown[] = []
  effects: unknown[] = []
  characters = ''
  fontName: { family: string; style: string } | undefined
  textAutoResize = 'NONE'
  svg = ''

  constructor(type: string) {
    this.type = type
  }

  resize(w: number, h: number) {
    this.width = w
    this.height = h
  }

  resizeWithoutConstraints(w: number, h: number) {
    this.resize(w, h)
  }

  rescale(factor: number) {
    this.width *= factor
    this.height *= factor
  }

  appendChild(child: Node) {
    child.remove()
    child.parent = this
    this.children.push(child)
    this.layout()
  }

  remove() {
    if (!this.parent) return
    this.parent.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
  }

  async loadAsync() {}

  private layout() {
    if (this.layoutMode === 'NONE') return
    const row = this.layoutMode === 'HORIZONTAL'
    let cursor = row ? this.paddingLeft : this.paddingTop
    for (const child of this.children) {
      if (child.layoutPositioning === 'ABSOLUTE') continue
      const inner = row
        ? this.height - this.paddingTop * 2
        : this.width - this.paddingLeft * 2
      const size = row ? child.height : child.width
      const cross =
        (row ? this.paddingTop : this.paddingLeft) +
        (this.counterAxisAlignItems === 'CENTER' ? (inner - size) / 2 : 0)
      child.x = row ? cursor : cross
      child.y = row ? cross : cursor
      cursor += (row ? child.width : child.height) + this.itemSpacing
    }
  }
}

const FONTS = [
  { family: 'Inter', style: 'Regular' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Roboto Mono', style: 'Regular' },
]

function stub() {
  const loaded: { family: string; style: string }[] = []
  const messages: { type: string; text: string }[] = []
  const figma = {
    showUI() {},
    ui: {
      postMessage(message: { type: string; text: string }) {
        messages.push(message)
      },
      onmessage: null as null | ((message: unknown) => Promise<void>),
    },
    notify() {},
    root: { children: [] as Node[] },
    createPage: () => {
      const page = new Node('PAGE')
      figma.root.children.push(page)
      return page
    },
    setCurrentPageAsync: async () => {},
    createSection: () => new Node('SECTION'),
    createFrame: () => new Node('FRAME'),
    createText: () => new Node('TEXT'),
    createRectangle: () => new Node('RECTANGLE'),
    createNodeFromSvg(svg: string) {
      const node = new Node('FRAME')
      node.width = Number(/width="([\d.]+)"/.exec(svg)?.[1])
      node.height = Number(/height="([\d.]+)"/.exec(svg)?.[1])
      node.svg = svg
      return node
    },
    createImage: () => ({ hash: 'image' }),
    base64Decode: (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0)),
    listAvailableFontsAsync: async () => FONTS.map((fontName) => ({ fontName })),
    loadFontAsync: async (font: { family: string; style: string }) => {
      loaded.push(font)
    },
    viewport: { scrollAndZoomIntoView() {} },
  }
  const source = readFileSync(resolve(import.meta.dirname, '../figma/code.js'), 'utf8')
  new Function('figma', '__html__', source)(figma, '')
  return { figma, loaded, messages }
}

const rgba = (r: number, g: number, b: number, a = 1) => ({ r, g, b, a })

/** Кнопка: flex-строка с иконкой и подписью, раскладка сходится с браузером. */
const button = {
  type: 'frame',
  name: 'button',
  x: 32,
  y: 100,
  w: 120,
  h: 24,
  fill: rgba(0.1, 0.1, 0.1),
  stroke: { color: rgba(0, 0, 0, 0.2), top: 1, right: 1, bottom: 1, left: 1 },
  radius: [6, 6, 6, 6],
  shadows: [{ color: rgba(0, 0, 0, 0.1), x: 0, y: 1, blur: 2, spread: 0, inset: false }],
  layout: {
    direction: 'row',
    wrap: false,
    gap: 8,
    crossGap: 0,
    padding: [4, 8, 4, 8],
    main: 'start',
    cross: 'center',
  },
  children: [
    {
      type: 'svg',
      name: 'icon',
      x: 8,
      y: 4,
      w: 16,
      h: 16,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
    },
    { type: 'frame', name: 'label', x: 32, y: 4, w: 40, h: 16, children: [] },
    {
      type: 'frame',
      name: 'after',
      x: 100,
      y: 2,
      w: 4,
      h: 4,
      absolute: true,
      fill: rgba(1, 0, 0),
      children: [],
    },
  ],
}

/** Та же строка, но ребёнок стоит не там, куда его положил бы auto layout. */
const drifted = {
  ...button,
  name: 'drifted',
  y: 200,
  children: [{ type: 'frame', name: 'label', x: 60, y: 4, w: 40, h: 16, children: [] }],
}

const text = {
  type: 'frame',
  name: 'text',
  x: 32,
  y: 300,
  w: 300,
  h: 60,
  children: [
    {
      type: 'text',
      name: 'Заголовок',
      x: 0,
      y: 0,
      w: 120,
      h: 20,
      text: 'Заголовок',
      family: 'sans',
      size: 15,
      weight: 600,
      italic: false,
      lineHeight: 20,
      letterSpacing: -0.15,
      color: rgba(0.1, 0.1, 0.1),
      align: 'left',
      decoration: 'none',
      multiline: false,
    },
    {
      type: 'text',
      name: 'booking-api',
      x: 0,
      y: 24,
      w: 300,
      h: 36,
      text: 'booking-api\nsecond line',
      family: 'mono',
      size: 12,
      weight: 400,
      italic: false,
      lineHeight: 18,
      letterSpacing: 0,
      color: rgba(0.3, 0.3, 0.3),
      align: 'right',
      decoration: 'underline',
      multiline: true,
    },
  ],
}

const snapshot = (theme: 'light' | 'dark', frames = [button, drifted, text]) => ({
  source: 'demo/sheet.html',
  theme,
  width: 1440,
  height: 400,
  fonts: { sans: ['ui-sans-serif', 'system-ui'], mono: ['ui-monospace', 'Menlo'] },
  frames,
})

let env: ReturnType<typeof stub>

const run = (message: unknown) => env.figma.ui.onmessage!(message)

const page = () => env.figma.root.children.find((p) => p.name === 'creatox-ui-kit')!

beforeEach(() => {
  env = stub()
})

test('the sheet lands on its own page, one frame per section, inside a theme section', async () => {
  await run({ type: 'import-sheet', snapshot: snapshot('light') })

  const light = page().children.find((n) => n.type === 'SECTION')!
  expect(light.name).toBe('Light')
  expect(light.children.map((n) => n.name)).toEqual(['button', 'drifted', 'text'])

  const [frame] = light.children
  expect([frame.x, frame.y, frame.width, frame.height]).toEqual([
    32 + 80,
    100 + 80,
    120,
    24,
  ])
  expect(frame.fills).toEqual([
    { type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 }, opacity: 1 },
  ])
  expect(frame.strokes).toHaveLength(1)
  expect(frame.effects[0]).toMatchObject({ type: 'DROP_SHADOW', radius: 2 })
  expect(env.messages.at(-1)).toEqual({ type: 'done', text: 'Готово' })
})

test('a flex row that Figma lays out the same way keeps its auto layout', async () => {
  await run({ type: 'import-sheet', snapshot: snapshot('light') })

  const frame = page().children[0].children[0]
  expect(frame.layoutMode).toBe('HORIZONTAL')
  expect(frame.itemSpacing).toBe(8)
  expect(frame.children.map((n) => [n.name, n.x, n.y])).toEqual([
    ['icon', 8, 4],
    ['label', 32, 4],
    ['after', 100, 2],
  ])
  expect(frame.children[2].layoutPositioning).toBe('ABSOLUTE')
})

test('a flex row that drifts falls back to the coordinates the browser had', async () => {
  await run({ type: 'import-sheet', snapshot: snapshot('light') })

  const frame = page().children[0].children[1]
  expect(frame.layoutMode).toBe('NONE')
  expect([frame.children[0].x, frame.children[0].y]).toEqual([60, 4])
  expect(env.messages.some((m) => m.text.includes('откатов к абсолютным 1'))).toBe(true)
})

test('text picks the nearest style of the nearest family and sizes by line count', async () => {
  await run({ type: 'import-sheet', snapshot: snapshot('light') })

  const [title, code] = page().children[0].children[2].children
  expect(title.fontName).toEqual({ family: 'Inter', style: 'Semi Bold' })
  expect(title.characters).toBe('Заголовок')
  expect(title.textAutoResize).toBe('WIDTH_AND_HEIGHT')
  expect(code.fontName).toEqual({ family: 'Roboto Mono', style: 'Regular' })
  expect(code.textAutoResize).toBe('HEIGHT')
  expect([code.width, code.height]).toEqual([300, 36])
  expect(env.loaded).toEqual([
    { family: 'Inter', style: 'Semi Bold' },
    { family: 'Roboto Mono', style: 'Regular' },
  ])
})

test('re-import redraws the theme section instead of adding a second one', async () => {
  await run({ type: 'import-sheet', snapshot: snapshot('light') })
  await run({ type: 'import-sheet', snapshot: snapshot('light', [button]) })

  const sections = page().children.filter((n) => n.type === 'SECTION')
  expect(sections).toHaveLength(1)
  expect(sections[0].children.map((n) => n.name)).toEqual(['button'])
  expect(env.figma.root.children).toHaveLength(1)
})

test('dark goes to the right of light and leaves it alone', async () => {
  await run({ type: 'import-sheet', snapshot: snapshot('light') })
  await run({ type: 'import-sheet', snapshot: snapshot('dark', [button]) })

  const [light, dark] = page().children
  expect(dark.name).toBe('Dark')
  expect(dark.x).toBe(light.x + light.width + 160)
  expect(light.children).toHaveLength(3)
  expect(dark.children).toHaveLength(1)
})

test('a snapshot without frames is reported, not drawn', async () => {
  await run({ type: 'import-sheet', snapshot: { theme: 'light' } })
  expect(env.messages.at(-1)?.text).toMatch(/^Ошибка: /)
})
