/* Снимок листа → SVG для веб-Figma.

   Плагин из figma/ работает только в десктопном приложении: плагины
   разработчика веб-версия не запускает. SVG — вход, который есть везде:
   файл перетаскивается на холст, и Figma разбирает его в слои. Секции и
   компоненты становятся группами с теми же именами, фон и рамка —
   прямоугольниками, текст — текстовыми слоями, иконки — векторами, тени —
   эффектом Drop shadow (фильтр записан так же, как его пишет сама Figma при
   экспорте, и при импорте она его узнаёт).

   Чего SVG не умеет, того и не будет: auto layout, фреймов с обрезкой — на
   их месте группы с маской. Шрифт — Inter и Roboto Mono, они есть в Figma
   у всех; браузер рисовал системным, поэтому ширина строк может отличаться
   на пиксель-другой. */

import type {
  FrameNode,
  Rgba,
  Snapshot,
  SnapshotNode,
  TextNode,
  VectorNode,
} from './snapshot'

const FONT = { sans: 'Inter', mono: 'Roboto Mono' } as const

/* Где в строке высотой L лежит базовая линия шрифта кегля s: область глифов
   (восходящие плюс нисходящие) стоит по центру строки, базовая линия —
   на высоте восходящих от её верха. Метрики — из hhea самих шрифтов. */
const BASELINE = {
  sans: { ascent: 0.96875, descent: 0.2421875 },
  mono: { ascent: 1.048, descent: 0.271 },
} as const

const round = (n: number): number => Math.round(n * 100) / 100

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Имя слоя: Figma берёт его из `id`, а `id` не терпит пробелов и кавычек. */
function layerName(name: string): string {
  return escape(
    name
      .trim()
      .replace(/\s+/g, '_')
      .replace(/['"<>&]/g, '') || 'layer',
  )
}

function hex({ r, g, b }: Rgba): string {
  const byte = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

function paint(attr: 'fill' | 'stroke', color: Rgba): string {
  const opacity = color.a < 1 ? ` ${attr}-opacity="${round(color.a)}"` : ''
  return `${attr}="${hex(color)}"${opacity}`
}

/** Прямоугольник со скруглениями — `rect`, если углы равны, иначе путь. */
function shape(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: [number, number, number, number] | undefined,
  attrs: string,
): string {
  const [tl = 0, tr = 0, br = 0, bl = 0] = radius ?? []
  if (tl === tr && tr === br && br === bl) {
    const rx = tl > 0 ? ` rx="${round(tl)}"` : ''
    return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}"${rx} ${attrs}/>`
  }
  const d = [
    `M${round(x + tl)} ${round(y)}`,
    `H${round(x + w - tr)}`,
    tr ? `A${tr} ${tr} 0 0 1 ${round(x + w)} ${round(y + tr)}` : '',
    `V${round(y + h - br)}`,
    br ? `A${br} ${br} 0 0 1 ${round(x + w - br)} ${round(y + h)}` : '',
    `H${round(x + bl)}`,
    bl ? `A${bl} ${bl} 0 0 1 ${round(x)} ${round(y + h - bl)}` : '',
    `V${round(y + tl)}`,
    tl ? `A${tl} ${tl} 0 0 1 ${round(x + tl)} ${round(y)}` : '',
    'Z',
  ].join('')
  return `<path d="${d}" ${attrs}/>`
}

interface Defs {
  next: number
  items: string[]
}

/* Тень в той записи, в какой её экспортирует Figma: альфа исходника, сдвиг,
   размытие, цвет. По этому рисунку она и узнаёт Drop shadow при импорте;
   размытие в CSS — это две стандартные девиации. Внутренние тени и spread
   не переносятся: у кита они только в фокусе и в полях, и там их заменяет
   рамка. */
function shadowFilter(frame: FrameNode, defs: Defs): string | undefined {
  const drops = (frame.shadows ?? []).filter((s) => !s.inset)
  if (drops.length === 0) return undefined
  const id = `cx-shadow-${defs.next++}`
  const reach = Math.max(...drops.map((s) => s.blur + Math.abs(s.x) + Math.abs(s.y))) + 4
  const steps = drops.map((s, i) => {
    const { r, g, b, a } = s.color
    const input = i === 0 ? 'BackgroundImageFix' : `effect${i}_dropShadow`
    return (
      `<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>` +
      `<feOffset dx="${round(s.x)}" dy="${round(s.y)}"/>` +
      `<feGaussianBlur stdDeviation="${round(s.blur / 2)}"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 ${round(r)} 0 0 0 0 ${round(g)} 0 0 0 0 ${round(b)} 0 0 0 ${round(a)} 0"/>` +
      `<feBlend mode="normal" in2="${input}" result="effect${i + 1}_dropShadow"/>`
    )
  })
  defs.items.push(
    `<filter id="${id}" x="${round(-reach)}" y="${round(-reach)}" ` +
      `width="${round(frame.w + reach * 2)}" height="${round(frame.h + reach * 2)}" ` +
      `filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
      `<feFlood flood-opacity="0" result="BackgroundImageFix"/>` +
      steps.join('') +
      `<feBlend mode="normal" in="SourceGraphic" in2="effect${drops.length}_dropShadow" result="shape"/>` +
      `</filter>`,
  )
  return id
}

/** Выходит ли что-то из детей за рамку — только тогда маска чего-то стоит. */
function overflows(frame: FrameNode): boolean {
  return frame.children.some(
    (c) =>
      c.x < -0.5 || c.y < -0.5 || c.x + c.w > frame.w + 0.5 || c.y + c.h > frame.h + 0.5,
  )
}

function frameSvg(frame: FrameNode, defs: Defs): string {
  const parts: string[] = []
  const filter = shadowFilter(frame, defs)

  if (frame.fill || filter) {
    const fill = frame.fill
      ? paint('fill', frame.fill)
      : 'fill="#ffffff" fill-opacity="0"'
    const effect = filter ? ` filter="url(#${filter})"` : ''
    parts.push(shape(0, 0, frame.w, frame.h, frame.radius, `${fill}${effect}`))
  }

  const stroke = frame.stroke
  if (stroke) {
    const { top, right, bottom, left, color } = stroke
    if (top === right && right === bottom && bottom === left) {
      // Рамка внутрь, как в CSS: линия идёт по середине своей толщины.
      const half = top / 2
      const radius = frame.radius?.map((r) =>
        Math.max(0, r - half),
      ) as typeof frame.radius
      parts.push(
        shape(
          half,
          half,
          frame.w - top,
          frame.h - top,
          radius,
          `fill="none" ${paint('stroke', color)} stroke-width="${round(top)}"`,
        ),
      )
    } else {
      // Рамка с одной-двух сторон — полосы: у SVG нет обводки по сторонам.
      const bar = (x: number, y: number, w: number, h: number) =>
        w > 0 && h > 0 ? shape(x, y, w, h, undefined, paint('fill', color)) : ''
      parts.push(
        bar(0, 0, frame.w, top),
        bar(frame.w - right, 0, right, frame.h),
        bar(0, frame.h - bottom, frame.w, bottom),
        bar(0, 0, left, frame.h),
      )
    }
  }

  let children = frame.children.map((child) => nodeSvg(child, defs)).join('')
  if (frame.clip && overflows(frame)) {
    const id = `cx-clip-${defs.next++}`
    defs.items.push(
      `<clipPath id="${id}">${shape(0, 0, frame.w, frame.h, frame.radius, '')}</clipPath>`,
    )
    children = `<g clip-path="url(#${id})">${children}</g>`
  }
  parts.push(children)

  const opacity = frame.opacity !== undefined ? ` opacity="${round(frame.opacity)}"` : ''
  return (
    `<g id="${layerName(frame.name)}" transform="translate(${round(frame.x)} ${round(frame.y)})"${opacity}>` +
    parts.join('') +
    `</g>`
  )
}

function textSvg(node: TextNode): string {
  const lines = node.lines ?? (node.multiline ? node.text.split('\n') : [node.text])
  const metrics = BASELINE[node.family]
  const baseline =
    node.lineHeight / 2 + ((metrics.ascent - metrics.descent) / 2) * node.size
  const anchor =
    node.align === 'center' ? 'middle' : node.align === 'right' ? 'end' : 'start'
  const x = anchor === 'middle' ? node.w / 2 : anchor === 'end' ? node.w : 0
  const attrs = [
    `font-family="${FONT[node.family]}"`,
    `font-size="${round(node.size)}"`,
    node.weight !== 400 ? `font-weight="${node.weight}"` : '',
    node.italic ? 'font-style="italic"' : '',
    node.letterSpacing ? `letter-spacing="${round(node.letterSpacing)}"` : '',
    anchor !== 'start' ? `text-anchor="${anchor}"` : '',
    node.decoration === 'underline'
      ? 'text-decoration="underline"'
      : node.decoration === 'strike'
        ? 'text-decoration="line-through"'
        : '',
    paint('fill', node.color),
  ]
    .filter(Boolean)
    .join(' ')
  const spans = lines
    .map(
      (line, i) =>
        `<tspan x="${round(x)}" y="${round(baseline + i * node.lineHeight)}">${escape(line)}</tspan>`,
    )
    .join('')
  const opacity = node.opacity !== undefined ? ` opacity="${round(node.opacity)}"` : ''
  return (
    `<text transform="translate(${round(node.x)} ${round(node.y)})" xml:space="preserve" ${attrs}${opacity}>` +
    spans +
    `</text>`
  )
}

const CARRIED = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
]

/* Иконка приходит отдельным документом со своим viewBox. Вкладывается она
   группой: содержимое без корня, масштаб из viewBox, а заливка и обводка,
   которые стояли на корне, переезжают на группу — иначе пути нарисуются
   чёрной заливкой по умолчанию. */
function vectorSvg(node: VectorNode): string {
  const root = node.svg.match(/^<svg\b([^>]*)>/)
  const close = node.svg.lastIndexOf('</svg>')
  if (!root || close === -1) return ''
  const inner = node.svg.slice(root[0].length, close)
  const attrs = new Map<string, string>()
  for (const [, key, value] of root[1].matchAll(/([\w:-]+)="([^"]*)"/g))
    attrs.set(key, value)

  const view = attrs
    .get('viewBox')
    ?.split(/[\s,]+/)
    .map(Number)
  const [vx = 0, vy = 0, vw = node.w, vh = node.h] = view && view.length === 4 ? view : []
  const sx = vw ? node.w / vw : 1
  const sy = vh ? node.h / vh : 1
  const transform =
    `translate(${round(node.x)} ${round(node.y)})` +
    (sx !== 1 || sy !== 1
      ? ` scale(${Math.round(sx * 1000) / 1000} ${Math.round(sy * 1000) / 1000})`
      : '') +
    (vx || vy ? ` translate(${-vx} ${-vy})` : '')
  const carried = CARRIED.filter((key) => attrs.has(key))
    .map((key) => `${key}="${escape(attrs.get(key)!)}"`)
    .join(' ')
  const opacity = node.opacity !== undefined ? ` opacity="${round(node.opacity)}"` : ''
  return `<g id="${layerName(node.name)}" transform="${transform}" ${carried}${opacity}>${inner}</g>`
}

function nodeSvg(node: SnapshotNode, defs: Defs): string {
  switch (node.type) {
    case 'frame':
      return frameSvg(node, defs)
    case 'text':
      return textSvg(node)
    case 'svg':
      return vectorSvg(node)
    case 'image':
      return (
        `<image id="${layerName(node.name)}" x="${round(node.x)}" y="${round(node.y)}" ` +
        `width="${round(node.w)}" height="${round(node.h)}" href="data:image/png;base64,${node.png}"/>`
      )
  }
}

/** Весь лист одним SVG: фон страницы и по группе на каждую секцию. */
export function snapshotToSvg(snapshot: Snapshot): string {
  const defs: Defs = { next: 0, items: [] }
  const body = snapshot.frames.map((frame) => frameSvg(frame, defs)).join('')
  const width = round(snapshot.width)
  const height = round(snapshot.height)
  const background = snapshot.background
    ? `<rect id="page" width="${width}" height="${height}" ${paint('fill', snapshot.background)}/>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" fill="none">` +
    (defs.items.length ? `<defs>${defs.items.join('')}</defs>` : '') +
    background +
    body +
    `</svg>`
  )
}
