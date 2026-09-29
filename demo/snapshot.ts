/* Снимок листа для Figma.

   Обходит DOM листа и записывает то, что реально нарисовал браузер: боксы с
   заливками, обводками, тенями и скруглениями, текст с его шрифтом, SVG как
   есть, псевдоэлементы — галочки, стрелки, ползунок тумблера — как боксы или
   как полигоны. Плагин `figma/code.js` рисует по этому снимку страницу, слой
   в слой, ничего не зная о ките: второй реализации компонентов здесь нет.

   Что скрыто, прозрачно или свёрнуто в ноль — тултипы, непоставленные
   галочки, — в снимок не попадает. Координаты у каждого узла относительно
   родителя, в CSS-пикселях. Flex-контейнеры несут с собой раскладку, чтобы
   в Figma стать auto layout; всё остальное — абсолютные позиции. */

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

export interface Stroke {
  color: Rgba
  top: number
  right: number
  bottom: number
  left: number
}

export interface Shadow {
  color: Rgba
  x: number
  y: number
  blur: number
  spread: number
  inset: boolean
}

export interface Layout {
  direction: 'row' | 'column'
  wrap: boolean
  /** Отступ между соседями по главной оси. */
  gap: number
  /** Отступ между рядами при переносе. */
  crossGap: number
  /** Сверху, справа, снизу, слева — рамка и padding вместе, как считает браузер. */
  padding: [number, number, number, number]
  main: 'start' | 'center' | 'end' | 'between'
  cross: 'start' | 'center' | 'end' | 'baseline'
}

interface Box {
  name: string
  x: number
  y: number
  w: number
  h: number
  opacity?: number
  /** Позиционирован абсолютно — в auto layout родителя не участвует. */
  absolute?: boolean
}

export interface FrameNode extends Box {
  type: 'frame'
  fill?: Rgba
  stroke?: Stroke
  /** Слева-сверху, справа-сверху, справа-снизу, слева-снизу. */
  radius?: [number, number, number, number]
  shadows?: Shadow[]
  clip?: boolean
  layout?: Layout
  children: SnapshotNode[]
}

export interface TextNode extends Box {
  type: 'text'
  text: string
  family: 'sans' | 'mono'
  size: number
  weight: number
  italic: boolean
  lineHeight: number
  letterSpacing: number
  color: Rgba
  align: 'left' | 'center' | 'right' | 'justify'
  decoration: 'none' | 'underline' | 'strike'
  multiline: boolean
  /** Строки так, как их перенёс браузер. Figma переносит сама и выводит их
      из ширины; SVG переносить не умеет, ему нужен готовый разрыв. */
  lines?: string[]
}

export interface VectorNode extends Box {
  type: 'svg'
  svg: string
}

export interface ImageNode extends Box {
  type: 'image'
  /** PNG в base64, без префикса data URL. */
  png: string
}

export type SnapshotNode = FrameNode | TextNode | VectorNode | ImageNode

export interface Snapshot {
  source: string
  theme: 'light' | 'dark'
  width: number
  height: number
  /** Стеки шрифтов кита — плагин берёт первый, который есть в Figma. */
  fonts: { sans: string[]; mono: string[] }
  /** Фон страницы: секции прозрачные и лежат на нём. */
  background?: Rgba
  frames: FrameNode[]
}

/* ── Разбор значений ─────────────────────────────────────────────────────── */

const px = (value: string | null | undefined): number => {
  const n = parseFloat(value ?? '')
  return Number.isFinite(n) ? n : 0
}

const round = (n: number): number => Math.round(n * 100) / 100

/** Делит по разделителю, не заглядывая внутрь скобок: `rgba(0, 0, 0, .1) 0px 1px`. */
export function splitTopLevel(value: string, separator: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === separator && depth === 0) {
      out.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(value.slice(start).trim())
  return out.filter(Boolean)
}

/** `rgb()` и `rgba()` без канваса — так же считают и тесты. */
export function parseRgb(value: string): Rgba | undefined {
  const m = value.match(
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/,
  )
  if (!m) return undefined
  const alpha =
    m[4] === undefined
      ? 1
      : m[4].endsWith('%')
        ? parseFloat(m[4]) / 100
        : parseFloat(m[4])
  return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a: alpha }
}

let swatch: CanvasRenderingContext2D | null | undefined
const colors = new Map<string, Rgba | undefined>()

/* Цвета кита — oklch, и вычисленный стиль отдаёт их как есть. Переводит их
   канвас: закрасить один пиксель и прочитать его обратно — это и есть тот
   sRGB, который видит пользователь. Полностью прозрачное считается
   отсутствием цвета. */
export function parseColor(value: string): Rgba | undefined {
  const key = value.trim()
  if (colors.has(key)) return colors.get(key)

  let rgba = parseRgb(key)
  if (!rgba && key && key !== 'none') {
    if (swatch === undefined) {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      swatch = canvas.getContext('2d', { willReadFrequently: true })
    }
    if (swatch) {
      swatch.clearRect(0, 0, 1, 1)
      swatch.fillStyle = '#010203'
      swatch.fillStyle = key
      if (swatch.fillStyle !== '#010203') {
        swatch.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = swatch.getImageData(0, 0, 1, 1).data
        rgba = { r: r / 255, g: g / 255, b: b / 255, a: a / 255 }
      }
    }
  }

  const result = rgba && rgba.a > 0 ? rgba : undefined
  colors.set(key, result)
  return result
}

export function parseShadows(
  value: string,
  color: (raw: string) => Rgba | undefined = parseColor,
): Shadow[] {
  if (!value || value === 'none') return []
  const out: Shadow[] = []
  for (const part of splitTopLevel(value, ',')) {
    const lengths: number[] = []
    let inset = false
    let colorToken: string | undefined
    for (const token of splitTopLevel(part, ' ')) {
      if (token === 'inset') inset = true
      else if (/^-?[\d.]+(px)?$/.test(token)) lengths.push(px(token))
      else colorToken = token
    }
    const rgba = colorToken === undefined ? undefined : color(colorToken)
    if (!rgba || rgba.a <= 0) continue
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths
    out.push({ color: rgba, x, y, blur, spread, inset })
  }
  return out
}

/** Точки `polygon(14% 45%, 0px 60%, …)` в пикселях бокса `w × h`. */
export function polygonPoints(clip: string, w: number, h: number): string | undefined {
  const m = clip.match(/^polygon\((.*)\)$/)
  if (!m) return undefined
  const length = (raw: string, total: number) =>
    raw.endsWith('%') ? (parseFloat(raw) / 100) * total : px(raw)
  const points = splitTopLevel(m[1], ',').map((pair) => {
    const [x = '0', y = '0'] = pair.split(/\s+/)
    return `${round(length(x, w))},${round(length(y, h))}`
  })
  return points.join(' ')
}

const MAIN: Record<string, Layout['main']> = {
  normal: 'start',
  'flex-start': 'start',
  start: 'start',
  left: 'start',
  center: 'center',
  'flex-end': 'end',
  end: 'end',
  right: 'end',
  'space-between': 'between',
}

const CROSS: Record<string, Layout['cross']> = {
  normal: 'start',
  stretch: 'start',
  'flex-start': 'start',
  start: 'start',
  'self-start': 'start',
  center: 'center',
  'flex-end': 'end',
  end: 'end',
  'self-end': 'end',
  baseline: 'baseline',
}

type LayoutStyle = Pick<
  CSSStyleDeclaration,
  | 'display'
  | 'flexDirection'
  | 'flexWrap'
  | 'justifyContent'
  | 'alignItems'
  | 'columnGap'
  | 'rowGap'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'borderTopWidth'
  | 'borderRightWidth'
  | 'borderBottomWidth'
  | 'borderLeftWidth'
>

/* Раскладка, которую Figma сможет повторить как auto layout. Всё, для чего
   у неё нет прямого аналога — обратные направления, space-around, — остаётся
   абсолютным позиционированием: лучше честные координаты, чем похожая
   раскладка, которая разъедется. */
export function layoutOf(cs: LayoutStyle): Layout | undefined {
  if (cs.display !== 'flex' && cs.display !== 'inline-flex') return undefined
  const direction =
    cs.flexDirection === 'row'
      ? 'row'
      : cs.flexDirection === 'column'
        ? 'column'
        : undefined
  if (!direction) return undefined
  if (cs.flexWrap === 'wrap-reverse') return undefined
  const wrap = cs.flexWrap === 'wrap'
  if (wrap && direction === 'column') return undefined
  const main = MAIN[cs.justifyContent]
  const cross = CROSS[cs.alignItems]
  if (!main || !cross) return undefined
  const columnGap = px(cs.columnGap)
  const rowGap = px(cs.rowGap)
  return {
    direction,
    wrap,
    gap: direction === 'row' ? columnGap : rowGap,
    crossGap: direction === 'row' ? rowGap : columnGap,
    padding: [
      px(cs.borderTopWidth) + px(cs.paddingTop),
      px(cs.borderRightWidth) + px(cs.paddingRight),
      px(cs.borderBottomWidth) + px(cs.paddingBottom),
      px(cs.borderLeftWidth) + px(cs.paddingLeft),
    ],
    main,
    cross: direction === 'column' && cross === 'baseline' ? 'start' : cross,
  }
}

const MONO_HINT = /mono|menlo|consolas|courier|code/i

export function familyOf(fontFamily: string): 'sans' | 'mono' {
  return MONO_HINT.test(fontFamily) ? 'mono' : 'sans'
}

export function families(stack: string): string[] {
  return splitTopLevel(stack, ',').map((name) => name.replace(/^['"]|['"]$/g, ''))
}

const WEIGHTS: Record<string, number> = { normal: 400, bold: 700 }

const weightOf = (value: string): number => WEIGHTS[value] ?? (Number(value) || 400)

/** `matrix(a, b, c, d, e, f)` → масштаб и смещение; `none` — единица. */
function transformOf(value: string): { scale: number; x: number; y: number } {
  const m = value.match(/^matrix\(([^)]+)\)$/)
  if (!m) return { scale: 1, x: 0, y: 0 }
  const [a = 1, b = 0, , , e = 0, f = 0] = m[1].split(',').map(Number)
  return { scale: Math.hypot(a, b), x: e, y: f }
}

function translateOf(value: string): { x: number; y: number } {
  if (!value || value === 'none') return { x: 0, y: 0 }
  const [x = '0', y = '0'] = value.split(/\s+/)
  return { x: px(x), y: px(y) }
}

function hex({ r, g, b }: Rgba): string {
  const byte = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

/* ── Обход DOM ───────────────────────────────────────────────────────────── */

interface Origin {
  x: number
  y: number
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

const SKIP = new Set([
  'SCRIPT',
  'STYLE',
  'TEMPLATE',
  'NOSCRIPT',
  'LINK',
  'META',
  'BR',
  'WBR',
])

const TEXT_INPUTS = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'number',
  'password',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
])

const PILL: [number, number, number, number] = [999, 999, 999, 999]

function nameOf(el: Element): string {
  const explicit =
    el.getAttribute('data-figma-frame') ?? el.getAttribute('data-figma-name')
  if (explicit) return explicit
  for (const cls of el.classList) if (cls.startsWith('cx-')) return cls.slice(3)
  return el.tagName.toLowerCase()
}

function contentBox(rect: DOMRect, cs: CSSStyleDeclaration): Rect {
  const left = rect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft)
  const top = rect.top + px(cs.borderTopWidth) + px(cs.paddingTop)
  const right = rect.right - px(cs.borderRightWidth) - px(cs.paddingRight)
  const bottom = rect.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function boxOf(name: string, rect: Rect, origin: Origin, cs: CSSStyleDeclaration): Box {
  const box: Box = {
    name,
    x: round(rect.left - origin.x),
    y: round(rect.top - origin.y),
    w: round(rect.width),
    h: round(rect.height),
  }
  const opacity = px(cs.opacity)
  if (opacity < 1) box.opacity = opacity
  if (cs.position === 'absolute' || cs.position === 'fixed') box.absolute = true
  return box
}

function strokeOf(cs: CSSStyleDeclaration): Stroke | undefined {
  const side = (width: string, style: string) =>
    style === 'none' || style === 'hidden' ? 0 : px(width)
  const top = side(cs.borderTopWidth, cs.borderTopStyle)
  const right = side(cs.borderRightWidth, cs.borderRightStyle)
  const bottom = side(cs.borderBottomWidth, cs.borderBottomStyle)
  const left = side(cs.borderLeftWidth, cs.borderLeftStyle)
  if (!top && !right && !bottom && !left) return undefined
  const raw = top
    ? cs.borderTopColor
    : right
      ? cs.borderRightColor
      : bottom
        ? cs.borderBottomColor
        : cs.borderLeftColor
  const color = parseColor(raw)
  return color ? { color, top, right, bottom, left } : undefined
}

function paint(frame: FrameNode, cs: CSSStyleDeclaration): void {
  const fill = parseColor(cs.backgroundColor)
  if (fill) frame.fill = fill
  const stroke = strokeOf(cs)
  if (stroke) frame.stroke = stroke
  // `rounded-full` вычисляется в бесконечность; браузер режет радиус
  // половиной меньшей стороны, и в снимок идёт уже обрезанное.
  const cap = Math.min(frame.w, frame.h) / 2
  const corner = (value: string) => round(Math.min(px(value), cap))
  const radius: [number, number, number, number] = [
    corner(cs.borderTopLeftRadius),
    corner(cs.borderTopRightRadius),
    corner(cs.borderBottomRightRadius),
    corner(cs.borderBottomLeftRadius),
  ]
  if (radius.some((r) => r > 0)) frame.radius = radius
  const shadows = parseShadows(cs.boxShadow)
  if (shadows.length) frame.shadows = shadows
  if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') frame.clip = true
}

function isPainted(frame: FrameNode): boolean {
  return Boolean(frame.fill || frame.stroke || frame.shadows || frame.children.length)
}

function element(el: Element, origin: Origin): SnapshotNode[] {
  // `data-figma-skip` — то, что есть на листе, но не в ките: кнопки выгрузки.
  if (SKIP.has(el.tagName) || el.hasAttribute('data-figma-skip')) return []
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden' || px(cs.opacity) === 0)
    return []
  if (cs.display === 'contents') return childrenOf(el, origin, cs, undefined)

  const rect = el.getBoundingClientRect()
  if (rect.width < 0.5 && rect.height < 0.5) return []
  const box = boxOf(nameOf(el), rect, origin, cs)

  if (el instanceof SVGSVGElement) return [vector(el, cs, box)]
  if (el instanceof HTMLImageElement) return [image(el, box)]

  const frame: FrameNode = { type: 'frame', ...box, children: [] }
  paint(frame, cs)
  const layout = layoutOf(cs)
  if (layout) frame.layout = layout

  const here = { x: rect.left, y: rect.top }
  const inner = contentBox(rect, cs)

  const before = pseudo(el, '::before', cs, rect, inner, here)
  if (before) frame.children.push(before)

  if (el instanceof HTMLInputElement && el.type === 'range') {
    frame.children.push(...slider(el, cs, rect, inner, here))
  } else if (el instanceof HTMLProgressElement) {
    frame.children.push(...progress(el, cs, inner, here))
  } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const value = fieldText(el, cs, inner, here)
    if (value) frame.children.push(value)
  } else {
    frame.children.push(...childrenOf(el, here, cs, inner))
  }

  const after = pseudo(el, '::after', cs, rect, inner, here)
  if (after) frame.children.push(after)

  return [frame]
}

function childrenOf(
  el: Element,
  origin: Origin,
  cs: CSSStyleDeclaration,
  inner: Rect | undefined,
): SnapshotNode[] {
  const out: SnapshotNode[] = []
  for (const child of el.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE)
      out.push(...element(child as Element, origin))
    else if (child.nodeType === Node.TEXT_NODE) {
      const node = text(child as Text, origin, cs, inner)
      if (node) out.push(node)
    }
  }
  return out
}

function transformText(content: string, cs: CSSStyleDeclaration): string {
  switch (cs.textTransform) {
    case 'uppercase':
      return content.toUpperCase()
    case 'lowercase':
      return content.toLowerCase()
    case 'capitalize':
      return content.replace(/(^|\s)\S/g, (s) => s.toUpperCase())
    default:
      return content
  }
}

function textStyle(
  cs: CSSStyleDeclaration,
  color: Rgba,
): Omit<TextNode, 'type' | 'text' | 'multiline' | keyof Box> {
  const align = cs.textAlign
  return {
    family: familyOf(cs.fontFamily),
    size: px(cs.fontSize),
    weight: weightOf(cs.fontWeight),
    italic: cs.fontStyle === 'italic' || cs.fontStyle === 'oblique',
    lineHeight: round(px(cs.lineHeight) || px(cs.fontSize) * 1.2),
    letterSpacing: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing),
    color,
    align:
      align === 'center' || align === 'right' || align === 'end'
        ? align === 'end'
          ? 'right'
          : align
        : align === 'justify'
          ? 'justify'
          : 'left',
    decoration: cs.textDecorationLine.includes('underline')
      ? 'underline'
      : cs.textDecorationLine.includes('line-through')
        ? 'strike'
        : 'none',
  }
}

/* Инлайновый бокс текста у браузера — по высоте шрифта, а текстовый узел в
   Figma — по межстрочному интервалу. Разница делится пополам сверху и
   снизу, так что узел ставится на полразницы выше бокса. */
function text(
  node: Text,
  origin: Origin,
  cs: CSSStyleDeclaration,
  inner: Rect | undefined,
): TextNode | undefined {
  const raw = node.data
  const pre = cs.whiteSpace.startsWith('pre')
  const start = pre ? 0 : raw.search(/\S/)
  if (start === -1) return undefined
  const end = pre ? raw.length : raw.search(/\s*$/)
  const content = transformText(
    pre ? raw : raw.slice(start, end).replace(/\s+/g, ' '),
    cs,
  )
  if (!content.trim()) return undefined

  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
  if (rects.length === 0) return undefined

  const color = parseColor(cs.webkitTextFillColor || cs.color)
  if (!color) return undefined

  const style = textStyle(cs, color)
  const lines = new Set(rects.map((r) => Math.round(r.top))).size
  const left = Math.min(...rects.map((r) => r.left))
  const right = Math.max(...rects.map((r) => r.right))
  const top = Math.min(...rects.map((r) => r.top))
  const multiline = lines > 1
  const box: Rect = {
    left: multiline && inner ? inner.left : left,
    top: top - (style.lineHeight - rects[0].height) / 2,
    right: multiline && inner ? inner.right : right,
    bottom: 0,
    width: multiline && inner ? inner.width : right - left,
    height: lines * style.lineHeight,
  }
  const result: TextNode = {
    type: 'text',
    ...boxOf(content.slice(0, 40), box, origin, cs),
    text: content,
    multiline,
    ...style,
  }
  if (multiline) {
    result.lines = wrappedLines(node, start, end, pre).map((line) =>
      transformText(line, cs),
    )
  }
  return result
}

/* Где браузер перенёс строку, узнаётся только по буквам: у каждой свой
   прямоугольник, и новая строка — это прямоугольник ниже предыдущего.
   Пробел на разрыве своего места не получает, он уходит в конец строки и
   срезается. Дорого на длинном тексте, поэтому только для многострочных. */
function wrappedLines(node: Text, start: number, end: number, pre: boolean): string[] {
  const range = document.createRange()
  const lines: string[] = []
  let current = ''
  let top: number | undefined
  for (let i = start; i < end; i++) {
    const char = node.data[i]
    if (char === '\n' && pre) {
      lines.push(current)
      current = ''
      top = undefined
      continue
    }
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const rect = range.getClientRects()[0]
    if (rect && rect.width > 0) {
      if (top !== undefined && rect.top > top + rect.height / 2) {
        lines.push(current)
        current = ''
      }
      top = rect.top
    }
    current += char
  }
  lines.push(current)
  return pre ? lines : lines.map((line) => line.replace(/\s+/g, ' ').trim())
}

let ruler: CanvasRenderingContext2D | null | undefined

function measure(content: string, font: string): number {
  if (ruler === undefined) ruler = document.createElement('canvas').getContext('2d')
  if (!ruler) return 0
  ruler.font = font
  return Math.max(...content.split('\n').map((line) => ruler!.measureText(line).width))
}

/* У поля нет текстовых узлов: значение и плейсхолдер живут в теневом дереве.
   Их надо дорисовать самим — там, где браузер их выводит: от левого края
   содержимого, по центру строки. */
function fieldText(
  el: HTMLInputElement | HTMLTextAreaElement,
  cs: CSSStyleDeclaration,
  inner: Rect,
  here: Origin,
): TextNode | undefined {
  if (el instanceof HTMLInputElement && !TEXT_INPUTS.has(el.type)) return undefined
  const placeholder = !el.value
  let shown = el.value || el.placeholder
  if (!shown) return undefined
  if (el instanceof HTMLInputElement && el.type === 'password')
    shown = '•'.repeat(shown.length)

  const color = placeholder
    ? parseColor(getComputedStyle(el, '::placeholder').color)
    : parseColor(cs.webkitTextFillColor || cs.color)
  if (!color) return undefined

  const style = textStyle(cs, color)
  const multiline = el instanceof HTMLTextAreaElement
  const lines = multiline ? shown.split('\n').length : 1
  const width = Math.min(measure(shown, cs.font), inner.width)
  const height = lines * style.lineHeight
  const left =
    style.align === 'right'
      ? inner.right - width
      : style.align === 'center'
        ? inner.left + (inner.width - width) / 2
        : inner.left
  const top = multiline ? inner.top : inner.top + (inner.height - height) / 2
  const box: Rect = {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }
  return {
    type: 'text',
    ...boxOf(shown.slice(0, 40), box, here, cs),
    text: shown,
    multiline,
    ...(multiline ? { lines: shown.split('\n') } : {}),
    ...style,
  }
}

function pseudoText(content: string, el: Element): string | undefined {
  const quoted = content.match(/^"(.*)"$/)
  if (quoted) return quoted[1] || undefined
  const attr = content.match(/^attr\(([\w-]+)\)$/)
  if (attr) return el.getAttribute(attr[1]) ?? undefined
  return undefined
}

/* Псевдоэлемент не измерить: у него нет getBoundingClientRect. Размер берётся
   из вычисленного стиля, а место выводится из того, как его раскладывает
   родитель: абсолютный — от его inset, потоковый — в начале (::before) или
   в конце (::after) содержимого, по центру, если родитель центрирует. Этого
   хватает на всё, что кит рисует псевдоэлементами. */
function pseudo(
  el: Element,
  which: '::before' | '::after',
  cs: CSSStyleDeclaration,
  rect: DOMRect,
  inner: Rect,
  here: Origin,
): SnapshotNode | undefined {
  const ps = getComputedStyle(el, which)
  const content = ps.content
  if (!content || content === 'none' || content === 'normal') return undefined
  if (ps.display === 'none' || ps.visibility === 'hidden' || px(ps.opacity) === 0) {
    return undefined
  }
  const transform = transformOf(ps.transform)
  if (transform.scale < 0.01) return undefined

  const w = px(ps.width)
  const h = px(ps.height)
  const label = pseudoText(content, el)
  if (w < 0.5 && h < 0.5 && !label) return undefined

  let left: number
  let top: number
  const absolute = ps.position === 'absolute' || ps.position === 'fixed'
  if (absolute) {
    const paddingLeft = rect.left + px(cs.borderLeftWidth)
    const paddingRight = rect.right - px(cs.borderRightWidth)
    const paddingTop = rect.top + px(cs.borderTopWidth)
    const paddingBottom = rect.bottom - px(cs.borderBottomWidth)
    left =
      ps.left !== 'auto' ? paddingLeft + px(ps.left) : paddingRight - px(ps.right) - w
    top = ps.top !== 'auto' ? paddingTop + px(ps.top) : paddingBottom - px(ps.bottom) - h
  } else {
    const grid = cs.display === 'grid' || cs.display === 'inline-grid'
    const flex = cs.display === 'flex' || cs.display === 'inline-flex'
    const centeredX = grid && cs.justifyContent === 'center'
    const centeredY =
      (grid && cs.alignContent === 'center') || (flex && cs.alignItems === 'center')
    left = centeredX
      ? inner.left + (inner.width - w) / 2
      : which === '::before'
        ? inner.left
        : inner.right - w
    top = centeredY ? inner.top + (inner.height - h) / 2 : inner.top
  }
  const translate = translateOf(ps.getPropertyValue('translate'))
  left += translate.x + transform.x
  top += translate.y + transform.y

  const box: Rect = { left, top, right: left + w, bottom: top + h, width: w, height: h }
  const base = boxOf(which.slice(2), box, here, ps)
  if (absolute) base.absolute = true

  const fill = parseColor(ps.backgroundColor)
  const clip = ps.clipPath
  if (fill && clip.startsWith('polygon(')) {
    const points = polygonPoints(clip, w, h)
    const rotate = px(ps.getPropertyValue('rotate'))
    const spin = rotate ? ` transform="rotate(${rotate} ${w / 2} ${h / 2})"` : ''
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
      `viewBox="0 0 ${w} ${h}"><polygon points="${points}" fill="${hex(fill)}" ` +
      `fill-opacity="${fill.a}"${spin}/></svg>`
    return { type: 'svg', ...base, svg }
  }

  const frame: FrameNode = { type: 'frame', ...base, children: [] }
  paint(frame, ps)
  if (label) {
    const color = parseColor(ps.color)
    if (color) {
      const style = textStyle(ps, color)
      const content = contentBox(new DOMRect(left, top, w, h), ps)
      const width = measure(label, ps.font)
      const textBox: Rect = {
        left: content.left,
        top: content.top + (content.height - style.lineHeight) / 2,
        right: content.left + width,
        bottom: 0,
        width,
        height: style.lineHeight,
      }
      frame.children.push({
        type: 'text',
        ...boxOf(label.slice(0, 40), textBox, { x: left, y: top }, ps),
        text: label,
        multiline: false,
        ...style,
      })
    }
  }
  return isPainted(frame) ? frame : undefined
}

function vector(el: SVGSVGElement, cs: CSSStyleDeclaration, box: Box): VectorNode {
  const clone = el.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(box.w))
  clone.setAttribute('height', String(box.h))
  clone.removeAttribute('class')
  clone.removeAttribute('style')
  const color = parseColor(cs.color)
  if (color) {
    for (const node of [clone, ...clone.querySelectorAll('*')]) {
      for (const attr of ['stroke', 'fill']) {
        if (node.getAttribute(attr) === 'currentColor')
          node.setAttribute(attr, hex(color))
      }
    }
  }
  return { type: 'svg', ...box, svg: clone.outerHTML }
}

function image(el: HTMLImageElement, box: Box): SnapshotNode {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = el.naturalWidth || Math.ceil(box.w)
    canvas.height = el.naturalHeight || Math.ceil(box.h)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(el, 0, 0)
    const png = canvas.toDataURL('image/png').split(',')[1]
    return { type: 'image', ...box, png }
  } catch {
    // Картинка с другого домена канвас не отдаёт — на её месте серый бокс.
    return {
      type: 'frame',
      ...box,
      fill: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
      children: [],
    }
  }
}

/* Нативный range: дорожка, её заполненная часть и ползунок — три части,
   которых нет в DOM. Ползунок по высоте равен самому полю, дорожка — 4px по
   центру, как в components.css. */
function slider(
  el: HTMLInputElement,
  cs: CSSStyleDeclaration,
  rect: DOMRect,
  inner: Rect,
  here: Origin,
): SnapshotNode[] {
  const accent = parseColor(cs.getPropertyValue('--color-accent'))
  const line = parseColor(cs.getPropertyValue('--color-line-strong'))
  const raised = parseColor(cs.getPropertyValue('--color-raised'))
  const thumb = rect.height
  const span = Number(el.max) - Number(el.min)
  const progress = span > 0 ? (Number(el.value) - Number(el.min)) / span : 0
  const trackHeight = 4

  const track: FrameNode = {
    type: 'frame',
    name: 'track',
    x: round(inner.left - here.x),
    y: round(inner.top + (inner.height - trackHeight) / 2 - here.y),
    w: round(inner.width),
    h: trackHeight,
    radius: PILL,
    clip: true,
    children: [],
  }
  if (line) track.fill = line
  if (accent) {
    track.children.push({
      type: 'frame',
      name: 'progress',
      x: 0,
      y: 0,
      w: round(inner.width * progress),
      h: trackHeight,
      fill: accent,
      children: [],
    })
  }
  const knob: FrameNode = {
    type: 'frame',
    name: 'thumb',
    x: round(inner.left + (inner.width - thumb) * progress - here.x),
    y: round(inner.top + (inner.height - thumb) / 2 - here.y),
    w: round(thumb),
    h: round(thumb),
    radius: PILL,
    children: [],
  }
  if (raised) knob.fill = raised
  if (line) knob.stroke = { color: line, top: 1, right: 1, bottom: 1, left: 1 }
  return [track, knob]
}

function progress(
  el: HTMLProgressElement,
  cs: CSSStyleDeclaration,
  inner: Rect,
  here: Origin,
): SnapshotNode[] {
  // Неопределённый прогресс — бегущая полоса, кадр анимации не снимается.
  if (el.position < 0) return []
  const tone = parseColor(
    cs.getPropertyValue('--cx-progress-tone').trim() ||
      cs.getPropertyValue('--color-accent'),
  )
  if (!tone) return []
  return [
    {
      type: 'frame',
      name: 'value',
      x: round(inner.left - here.x),
      y: round(inner.top - here.y),
      w: round(inner.width * el.position),
      h: round(inner.height),
      fill: tone,
      radius: PILL,
      children: [],
    },
  ]
}

/* ── Точка входа ─────────────────────────────────────────────────────────── */

/* Не requestAnimationFrame: в скрытой вкладке и в невидимом iframe кадры
   не идут, и ожидание никогда не кончится. Раскладка и так считается при
   первом же обращении к getBoundingClientRect, таймер нужен только чтобы
   дать React дорисовать то, что он отложил. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 50))

/** Снимок всех секций `[data-figma-frame]` в координатах страницы. */
export async function snapshotSheet(): Promise<Snapshot> {
  await document.fonts.ready
  await settle()

  const root = document.documentElement
  const rootStyle = getComputedStyle(root)
  const origin = { x: -window.scrollX, y: -window.scrollY }
  const frames: FrameNode[] = []
  for (const section of document.querySelectorAll('[data-figma-frame]')) {
    for (const node of element(section, origin))
      if (node.type === 'frame') frames.push(node)
  }

  return {
    source: 'demo/sheet.html',
    theme: root.dataset.cxTheme === 'dark' ? 'dark' : 'light',
    width: round(root.scrollWidth),
    height: round(root.scrollHeight),
    fonts: {
      sans: families(rootStyle.getPropertyValue('--font-sans')),
      mono: families(rootStyle.getPropertyValue('--font-mono')),
    },
    background: parseColor(
      getComputedStyle(document.querySelector('.cx-root') ?? document.body)
        .backgroundColor,
    ),
    frames,
  }
}
