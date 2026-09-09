/**
 * Reads the tokens out of src/styles/theme.css and writes them as one JSON
 * file with a light and a dark value per token.
 *
 * The kit stores colours in oklch, which no Figma surface understands: the
 * plugin API takes linear RGBA floats and the editor takes hex. So colours are
 * converted here and both forms are emitted — `hex` to type in by hand,
 * `rgba` to hand straight to `figma.variables`.
 *
 *   bun scripts/export-figma-tokens.ts > tokens.figma.json
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = resolve(import.meta.dirname, '../src/styles/theme.css')

/** Light values live in the Tailwind theme block; dark re-declares a subset. */
const LIGHT_BLOCK = /@theme static \{/
const DARK_BLOCK = /:root\[data-cx-theme='dark'\],/

type Rgba = { r: number; g: number; b: number; a: number }

interface Token {
  name: string
  group: string
  light: string
  dark: string
  /** Present only when the value resolved to a colour. */
  hex?: { light: string; dark: string }
  rgba?: { light: Rgba; dark: Rgba }
}

/**
 * Pulls `--name: value;` pairs out of the brace-delimited block that starts at
 * `start`, tracking depth so a nested rule does not end the scan early.
 */
function readBlock(css: string, start: RegExp): Map<string, string> {
  const open = css.search(start)
  if (open === -1) throw new Error(`block not found: ${start}`)

  const from = css.indexOf('{', open)
  let depth = 0
  let to = from

  for (let i = from; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) {
      to = i
      break
    }
  }

  const out = new Map<string, string>()
  for (const [, name, value] of css
    .slice(from, to)
    .matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(name, value.trim())
  }
  return out
}

/**
 * The token a name ultimately reads from. The kit aliases three border names
 * (`--color-line` → `--color-border`) precisely so the dark block can override
 * one and move both, so the alias has to be followed before the theme lookup,
 * not after: the dark block never mentions the alias itself.
 */
function target(name: string, raw: string): string {
  const alias = raw.match(/^var\((--[\w-]+)\)$/)
  return alias ? alias[1] : name
}

function srgb(channel: number): number {
  const v = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
  return Math.min(1, Math.max(0, v))
}

/** oklch() → sRGB, via oklab and the LMS cone space. */
function parseOklch(value: string): Rgba | undefined {
  const m = value.match(
    /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/,
  )
  if (!m) return undefined

  const L = Number(m[1]) / 100
  const C = Number(m[2])
  const h = (Number(m[3]) * Math.PI) / 180
  const alpha = m[4] === undefined ? 1 : Number(m[4])

  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  return {
    r: srgb(4.0767416621 * l - 3.3077115913 * m_ + 0.2309699292 * s),
    g: srgb(-1.2684380046 * l + 2.6097574011 * m_ - 0.3413193965 * s),
    b: srgb(-0.0041960863 * l - 0.7034186147 * m_ + 1.707614701 * s),
    a: alpha,
  }
}

function toHex({ r, g, b, a }: Rgba): string {
  const byte = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}${a < 1 ? byte(a) : ''}`
}

/** `--color-accent-hover` → `color`; everything unprefixed lands in `misc`. */
function groupOf(name: string): string {
  const [, head] = name.split('--')
  const segment = head.split('-')[0]
  return segment === 'cx' ? 'internal' : segment || 'misc'
}

const css = readFileSync(SOURCE, 'utf8')
const light = readBlock(css, LIGHT_BLOCK)
const dark = readBlock(css, DARK_BLOCK)

const tokens: Token[] = []

for (const [name, rawLight] of light) {
  const source = target(name, rawLight)
  const lightValue = light.get(source) ?? rawLight
  // A token the dark block leaves alone keeps its light value in both themes.
  const darkValue = dark.get(source) ?? lightValue

  const token: Token = { name, group: groupOf(name), light: lightValue, dark: darkValue }

  const lightRgba = parseOklch(lightValue)
  const darkRgba = parseOklch(darkValue)
  if (lightRgba && darkRgba) {
    token.rgba = { light: lightRgba, dark: darkRgba }
    token.hex = { light: toHex(lightRgba), dark: toHex(darkRgba) }
  }

  tokens.push(token)
}

const byGroup = new Map<string, number>()
for (const t of tokens) byGroup.set(t.group, (byGroup.get(t.group) ?? 0) + 1)

process.stdout.write(
  `${JSON.stringify(
    {
      source: 'src/styles/theme.css',
      counts: {
        total: tokens.length,
        colors: tokens.filter((t) => t.hex).length,
        overriddenInDark: tokens.filter((t) => t.light !== t.dark).length,
        byGroup: Object.fromEntries([...byGroup].sort((a, b) => b[1] - a[1])),
      },
      tokens,
    },
    null,
    2,
  )}\n`,
)
