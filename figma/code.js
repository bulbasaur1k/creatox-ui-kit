/* Плагин Figma: токены кита → переменные и текстовые стили.

   На вход — figma/tokens.figma.json, который пишет
   `bun scripts/export-figma-tokens.ts`. Каждый токен становится переменной
   коллекции «creatox-ui-kit» с двумя режимами, Light и Dark; цвета —
   COLOR (значения уже в линейном RGBA, как ждёт API), размеры — FLOAT в
   пикселях, остальное — STRING. Имя переменной — путь по группе:
   `--color-accent-hover` → `color/accent-hover`.

   Запуск повторный: существующие переменные находятся по имени и получают
   новые значения, ничего не дублируется и привязки в макетах не рвутся. */

const COLLECTION = 'creatox-ui-kit'
const ROOT_PX = 16

figma.showUI(__html__, { width: 420, height: 460, themeColors: true })

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

figma.ui.onmessage = async (message) => {
  if (message.type !== 'import') return
  try {
    const tokens = message.tokens
    if (!Array.isArray(tokens)) throw new Error('в файле нет массива tokens')
    await importVariables(tokens)
    if (message.textStyles) await importTextStyles(tokens)
    figma.ui.postMessage({ type: 'done', text: 'Готово' })
    figma.notify('Токены creatox-ui-kit импортированы')
  } catch (error) {
    figma.ui.postMessage({ type: 'done', text: `Ошибка: ${error.message}` })
  }
}
