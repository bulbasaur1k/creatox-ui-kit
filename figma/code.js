/* Плагин Figma для creatox-ui-kit: две вкладки, два входа.

   «Токены» — figma/tokens.figma.json, который пишет
   `bun scripts/export-figma-tokens.ts`. Каждый токен становится переменной
   коллекции «creatox-ui-kit» с двумя режимами, Light и Dark; цвета —
   COLOR (значения уже в линейном RGBA, как ждёт API), размеры — FLOAT в
   пикселях, остальное — STRING. Имя переменной — путь по группе:
   `--color-accent-hover` → `color/accent-hover`.

   Запуск повторный: существующие переменные находятся по имени и получают
   новые значения, ничего не дублируется и привязки в макетах не рвутся.

   «Лист» — снимок demo/sheet.html, по которому плагин рисует страницу с
   компонентами; см. блок «Лист → страница» ниже. */

const COLLECTION = 'creatox-ui-kit'
const ROOT_PX = 16

figma.showUI(__html__, { width: 420, height: 620, themeColors: true })

const say = (text) => figma.ui.postMessage({ type: 'log', text })

/** `--color-accent-hover` → `color/accent-hover`; служебные `--cx-*` → `internal/…`. */
function variableName(token) {
  const bare = token.name.replace(/^--/, '')
  if (bare.startsWith('cx-')) return `internal/${bare.slice(3)}`
  const head = bare.split('-')[0]
  return `${head}/${bare.slice(head.length + 1) || head}`
}

/** Число и его смысл, если значение — размер; иначе `null`. */
function asNumber(raw) {
  const m = raw.match(/^(-?[\d.]+)(rem|px|ms|em|%)?$/)
  if (!m) return null
  const value = Number(m[1])
  switch (m[2]) {
    case 'rem':
    case 'em':
      return value * ROOT_PX
    default:
      return value
  }
}

function kindOf(token) {
  if (token.rgba) return 'COLOR'
  if (asNumber(token.light) !== null && asNumber(token.dark) !== null) return 'FLOAT'
  return 'STRING'
}

function valueFor(token, mode, kind) {
  const raw = mode === 'light' ? token.light : token.dark
  if (kind === 'COLOR') return token.rgba[mode]
  if (kind === 'FLOAT') return asNumber(raw)
  return raw
}

async function findCollection() {
  const all = await figma.variables.getLocalVariableCollectionsAsync()
  let collection = all.find((c) => c.name === COLLECTION)
  if (!collection) {
    collection = figma.variables.createVariableCollection(COLLECTION)
    collection.renameMode(collection.modes[0].modeId, 'Light')
    collection.addMode('Dark')
    say(`коллекция «${COLLECTION}» создана`)
  }
  const modes = {}
  for (const mode of collection.modes) modes[mode.name.toLowerCase()] = mode.modeId
  if (!modes.light) modes.light = collection.modes[0].modeId
  if (!modes.dark) modes.dark = collection.addMode('Dark')
  return { collection, modes }
}

async function importVariables(tokens) {
  const { collection, modes } = await findCollection()
  const existing = new Map()
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    if (v.variableCollectionId === collection.id) existing.set(v.name, v)
  }

  let created = 0
  let updated = 0
  let skipped = 0
  for (const token of tokens) {
    const kind = kindOf(token)
    const name = variableName(token)
    let variable = existing.get(name)
    if (variable && variable.resolvedType !== kind) {
      say(`пропущен ${name}: уже есть с другим типом (${variable.resolvedType})`)
      skipped++
      continue
    }
    if (!variable) {
      variable = figma.variables.createVariable(name, collection, kind)
      created++
    } else {
      updated++
    }
    variable.description = `${token.name} · light ${token.light} · dark ${token.dark}`
    variable.setValueForMode(modes.light, valueFor(token, 'light', kind))
    variable.setValueForMode(modes.dark, valueFor(token, 'dark', kind))
  }
  say(`переменные: создано ${created}, обновлено ${updated}, пропущено ${skipped}`)
}

/* Текстовые стили — из токенов `--text-*`: размер, межстрочный интервал и
   трекинг. Шрифт — первый из стека кита, который есть в Figma; иначе Inter. */
async function importTextStyles(tokens) {
  const byName = new Map(tokens.map((t) => [t.name, t]))
  const stack = byName.get('--font-sans')
  const families = stack
    ? stack.light.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    : []
  let family = 'Inter'
  for (const candidate of [...families, 'Inter']) {
    try {
      await figma.loadFontAsync({ family: candidate, style: 'Regular' })
      family = candidate
      break
    } catch {}
  }
  try {
    await figma.loadFontAsync({ family, style: 'Regular' })
  } catch {
    say('шрифт не загрузился, текстовые стили пропущены')
    return
  }

  const local = await figma.getLocalTextStylesAsync()
  let count = 0
  for (const token of tokens) {
    const m = token.name.match(/^--text-([a-z]+)$/)
    if (!m) continue
    const size = asNumber(token.light)
    if (size === null) continue
    const name = `text/${m[1]}`
    let style = local.find((s) => s.name === name)
    if (!style) {
      style = figma.createTextStyle()
      style.name = name
    }
    style.fontName = { family, style: 'Regular' }
    style.fontSize = size
    const lineHeight = byName.get(`${token.name}--line-height`)
    if (lineHeight) {
      const value = Number(lineHeight.light)
      if (!Number.isNaN(value)) style.lineHeight = { unit: 'PERCENT', value: value * 100 }
    }
    const tracking = byName.get(`${token.name}--letter-spacing`)
    if (tracking) {
      const em = tracking.light.match(/^(-?[\d.]+)em$/)
      if (em) style.letterSpacing = { unit: 'PERCENT', value: Number(em[1]) * 100 }
    }
    style.description = `${token.name}: ${token.light}`
    count++
  }
  say(`текстовые стили: ${count}, шрифт ${family}`)
}

/* ── Лист → страница ────────────────────────────────────────────────────────
   На вход — снимок листа demo/sheet.html (см. demo/snapshot.ts): дерево
   боксов с тем, что нарисовал браузер. Плагин повторяет его слой в слой на
   странице «creatox-ui-kit»: секция Light или Dark, в ней фрейм на каждую
   секцию листа. Flex-контейнеры становятся auto layout, и после сборки
   каждый проверяется — если Figma разложила детей не туда, где они были в
   браузере, контейнер откатывается к абсолютным координатам. Повторный
   импорт перерисовывает секцию темы, остальное на странице не трогает. */

const PAGE = 'creatox-ui-kit'
const THEME_GAP = 160
const SECTION_PADDING = 80
/** Насколько auto layout может разойтись с браузером, прежде чем откатиться. */
const LAYOUT_TOLERANCE = 3

const STYLE_NAMES = {
  100: ['Thin', 'Hairline'],
  200: ['Extra Light', 'ExtraLight', 'Ultra Light'],
  300: ['Light'],
  400: ['Regular', 'Normal', 'Book'],
  500: ['Medium'],
  600: ['Semi Bold', 'SemiBold', 'Demi Bold', 'DemiBold'],
  700: ['Bold'],
  800: ['Extra Bold', 'ExtraBold', 'Ultra Bold'],
  900: ['Black', 'Heavy'],
}

/** Начертания по убыванию близости: своё, потом соседние, потом Regular. */
function styleLadder(weight, italic) {
  const rounded = Math.min(900, Math.max(100, Math.round(weight / 100) * 100))
  const order = [rounded]
  for (let step = 100; step <= 800; step += 100) {
    if (rounded - step >= 100) order.push(rounded - step)
    if (rounded + step <= 900) order.push(rounded + step)
  }
  const names = []
  for (const w of order) for (const name of STYLE_NAMES[w]) names.push(name)
  if (!italic) return names
  return names
    .map((name) => (name === 'Regular' ? 'Italic' : `${name} Italic`))
    .concat(names)
}

/* Шрифты листа — системный стек, которого в Figma нет. Берётся первый из
   стека кита, который в Figma есть, иначе Inter для текста и Roboto Mono
   для моноширинного; начертание — ближайшее из доступных у семейства. */
async function fontResolver(stacks) {
  const families = new Map()
  for (const { fontName } of await figma.listAvailableFontsAsync()) {
    const key = fontName.family.toLowerCase()
    if (!families.has(key))
      families.set(key, { family: fontName.family, styles: new Set() })
    families.get(key).styles.add(fontName.style)
  }
  const pick = (candidates) => {
    for (const name of candidates) {
      const found = families.get(name.toLowerCase())
      if (found) return found
    }
    return { family: candidates[candidates.length - 1], styles: new Set(['Regular']) }
  }
  const sans = pick([...(stacks.sans || []), 'Inter'])
  const mono = pick([...(stacks.mono || []), 'JetBrains Mono', 'Roboto Mono'])
  say(`шрифты: ${sans.family} и ${mono.family}`)

  const loaded = new Map()
  return {
    async font(kind, weight, italic) {
      const { family, styles } = kind === 'mono' ? mono : sans
      const key = `${family}/${weight}/${italic}`
      if (loaded.has(key)) return loaded.get(key)
      const style =
        styleLadder(weight, italic).find((name) => styles.has(name)) ??
        (styles.has('Regular') ? 'Regular' : ([...styles][0] ?? 'Regular'))
      const fontName = { family, style }
      await figma.loadFontAsync(fontName)
      loaded.set(key, fontName)
      return fontName
    },
  }
}

function solid(color) {
  return {
    type: 'SOLID',
    color: { r: color.r, g: color.g, b: color.b },
    opacity: color.a,
  }
}

function applyLayout(frame, layout) {
  frame.layoutMode = layout.direction === 'row' ? 'HORIZONTAL' : 'VERTICAL'
  frame.primaryAxisSizingMode = 'FIXED'
  frame.counterAxisSizingMode = 'FIXED'
  frame.itemSpacing = layout.gap
  frame.paddingTop = layout.padding[0]
  frame.paddingRight = layout.padding[1]
  frame.paddingBottom = layout.padding[2]
  frame.paddingLeft = layout.padding[3]
  frame.primaryAxisAlignItems = {
    start: 'MIN',
    center: 'CENTER',
    end: 'MAX',
    between: 'SPACE_BETWEEN',
  }[layout.main]
  frame.counterAxisAlignItems = {
    start: 'MIN',
    center: 'CENTER',
    end: 'MAX',
    baseline: 'BASELINE',
  }[layout.cross]
  if (layout.wrap) {
    frame.layoutWrap = 'WRAP'
    frame.counterAxisSpacing = layout.crossGap
  }
}

function buildFrame(node) {
  const frame = figma.createFrame()
  frame.name = node.name
  frame.resize(Math.max(node.w, 0.01), Math.max(node.h, 0.01))
  frame.fills = node.fill ? [solid(node.fill)] : []
  if (node.stroke) {
    frame.strokes = [solid(node.stroke.color)]
    frame.strokeAlign = 'INSIDE'
    frame.strokeTopWeight = node.stroke.top
    frame.strokeRightWeight = node.stroke.right
    frame.strokeBottomWeight = node.stroke.bottom
    frame.strokeLeftWeight = node.stroke.left
  }
  if (node.radius) {
    frame.topLeftRadius = node.radius[0]
    frame.topRightRadius = node.radius[1]
    frame.bottomRightRadius = node.radius[2]
    frame.bottomLeftRadius = node.radius[3]
  }
  if (node.shadows) {
    frame.effects = node.shadows.map((shadow) => ({
      type: shadow.inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
      color: shadow.color,
      offset: { x: shadow.x, y: shadow.y },
      radius: shadow.blur,
      spread: shadow.spread,
      visible: true,
      blendMode: 'NORMAL',
    }))
  }
  frame.clipsContent = Boolean(node.clip)
  if (node.layout) applyLayout(frame, node.layout)
  return frame
}

async function buildText(node, fonts) {
  const text = figma.createText()
  text.fontName = await fonts.font(node.family, node.weight, node.italic)
  text.characters = node.text
  text.fontSize = node.size
  text.lineHeight = { unit: 'PIXELS', value: node.lineHeight }
  text.letterSpacing = { unit: 'PIXELS', value: node.letterSpacing }
  text.fills = [solid(node.color)]
  text.textAlignHorizontal =
    node.align === 'justify' ? 'JUSTIFIED' : node.align.toUpperCase()
  text.textDecoration =
    node.decoration === 'underline'
      ? 'UNDERLINE'
      : node.decoration === 'strike'
        ? 'STRIKETHROUGH'
        : 'NONE'
  // Одна строка не должна переноситься, если шрифт Figma чуть шире
  // браузерного; абзац держит ширину контейнера и переносится, как в нём.
  if (node.multiline) {
    text.textAutoResize = 'HEIGHT'
    text.resize(Math.max(node.w, 1), Math.max(node.h, 1))
  } else {
    text.textAutoResize = 'WIDTH_AND_HEIGHT'
  }
  return text
}

function buildSvg(node) {
  const svg = figma.createNodeFromSvg(node.svg)
  svg.name = node.name
  if (svg.width > 0 && Math.abs(svg.width - node.w) > 0.5) svg.rescale(node.w / svg.width)
  return svg
}

function buildImage(node) {
  const rect = figma.createRectangle()
  rect.name = node.name
  rect.resize(Math.max(node.w, 1), Math.max(node.h, 1))
  const image = figma.createImage(figma.base64Decode(node.png))
  rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }]
  return rect
}

async function build(node, fonts, stats) {
  stats.nodes++
  let figmaNode
  switch (node.type) {
    case 'text':
      figmaNode = await buildText(node, fonts)
      break
    case 'svg':
      figmaNode = buildSvg(node)
      break
    case 'image':
      figmaNode = buildImage(node)
      break
    default:
      figmaNode = buildFrame(node)
  }
  if (node.opacity !== undefined) figmaNode.opacity = node.opacity
  if (node.type !== 'frame') return figmaNode

  const placed = []
  for (const child of node.children) {
    const built = await build(child, fonts, stats)
    figmaNode.appendChild(built)
    if (!node.layout || child.absolute) {
      if (node.layout) built.layoutPositioning = 'ABSOLUTE'
      built.x = child.x
      built.y = child.y
    }
    placed.push([built, child])
  }

  if (node.layout) {
    const drifted = placed.some(
      ([built, child]) =>
        !child.absolute &&
        (Math.abs(built.x - child.x) > LAYOUT_TOLERANCE ||
          Math.abs(built.y - child.y) > LAYOUT_TOLERANCE),
    )
    if (drifted) {
      figmaNode.layoutMode = 'NONE'
      for (const [built, child] of placed) {
        built.x = child.x
        built.y = child.y
      }
      stats.fallbacks++
    } else {
      stats.layouts++
    }
  }
  return figmaNode
}

async function findPage() {
  let page = figma.root.children.find((p) => p.name === PAGE)
  if (!page) {
    page = figma.createPage()
    page.name = PAGE
    say(`страница «${PAGE}» создана`)
  }
  await page.loadAsync()
  await figma.setCurrentPageAsync(page)
  return page
}

async function importSheet(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.frames)) throw new Error('в файле нет frames')
  const page = await findPage()
  const theme = snapshot.theme === 'dark' ? 'Dark' : 'Light'
  const sections = page.children.filter((n) => n.type === 'SECTION')
  let section = sections.find((n) => n.name === theme)
  if (section) {
    while (section.children.length > 0) section.children[0].remove()
  } else {
    section = figma.createSection()
    section.name = theme
    page.appendChild(section)
    // Тёмная встаёт справа от светлой, если та уже есть.
    const right = Math.max(-THEME_GAP, ...sections.map((n) => n.x + n.width))
    section.x = right + THEME_GAP
    section.y = 0
  }

  const fonts = await fontResolver(snapshot.fonts || {})
  const stats = { nodes: 0, layouts: 0, fallbacks: 0 }
  let width = 0
  let height = 0
  for (const frame of snapshot.frames) {
    const node = await build(frame, fonts, stats)
    section.appendChild(node)
    node.x = frame.x + SECTION_PADDING
    node.y = frame.y + SECTION_PADDING
    width = Math.max(width, frame.x + frame.w)
    height = Math.max(height, frame.y + frame.h)
  }
  section.resizeWithoutConstraints(
    width + SECTION_PADDING * 2,
    height + SECTION_PADDING * 2,
  )
  figma.viewport.scrollAndZoomIntoView([section])
  say(
    `${theme}: секций ${snapshot.frames.length}, слоёв ${stats.nodes}, ` +
      `auto layout ${stats.layouts}, откатов к абсолютным ${stats.fallbacks}`,
  )
}
figma.ui.onmessage = async (message) => {
  try {
    if (message.type === 'import') {
      const tokens = message.tokens
      if (!Array.isArray(tokens)) throw new Error('в файле нет массива tokens')
      await importVariables(tokens)
      if (message.textStyles) await importTextStyles(tokens)
      figma.ui.postMessage({ type: 'done', text: 'Готово' })
      figma.notify('Токены creatox-ui-kit импортированы')
    } else if (message.type === 'import-sheet') {
      await importSheet(message.snapshot)
      figma.ui.postMessage({ type: 'done', text: 'Готово' })
      figma.notify(`Лист creatox-ui-kit (${message.snapshot.theme}) импортирован`)
    }
  } catch (error) {
    figma.ui.postMessage({ type: 'done', text: `Ошибка: ${error.message}` })
  }
}
