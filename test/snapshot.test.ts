import { expect, test } from 'bun:test'
import {
  families,
  familyOf,
  layoutOf,
  parseRgb,
  parseShadows,
  polygonPoints,
  splitTopLevel,
} from '../demo/snapshot'

/* ── Снимок листа: разбор вычисленных стилей ───────────────────────────────
   happy-dom не считает раскладку и не рисует на канвасе, поэтому здесь
   только та часть, что работает со строками: как читаются тени, полигоны,
   цвета и flex-раскладка. Сам обход DOM смотрят на листе в браузере. */

test('splitTopLevel does not split inside parentheses', () => {
  expect(
    splitTopLevel('rgba(0, 0, 0, 0.1) 0px 1px, oklch(0.2 0 0) 0px 4px', ','),
  ).toEqual(['rgba(0, 0, 0, 0.1) 0px 1px', 'oklch(0.2 0 0) 0px 4px'])
  expect(splitTopLevel('rgba(0, 0, 0, 0.1)  0px   1px', ' ')).toEqual([
    'rgba(0, 0, 0, 0.1)',
    '0px',
    '1px',
  ])
})

test('parseRgb reads both comma and space syntax, alpha in fractions and percent', () => {
  expect(parseRgb('rgb(255, 0, 0)')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(parseRgb('rgba(0, 0, 255, 0.5)')).toEqual({ r: 0, g: 0, b: 1, a: 0.5 })
  expect(parseRgb('rgb(0 255 0 / 25%)')).toEqual({ r: 0, g: 1, b: 0, a: 0.25 })
  expect(parseRgb('oklch(22% 0.008 264)')).toBeUndefined()
})

test('parseShadows keeps the order and reads inset, using the colour parser it is given', () => {
  const shadows = parseShadows(
    'rgba(0, 0, 0, 0.1) 0px 1px 2px 0px, rgba(0, 0, 0, 0.2) 0px 4px 12px -2px inset',
    parseRgb,
  )
  expect(shadows).toEqual([
    { color: { r: 0, g: 0, b: 0, a: 0.1 }, x: 0, y: 1, blur: 2, spread: 0, inset: false },
    {
      color: { r: 0, g: 0, b: 0, a: 0.2 },
      x: 0,
      y: 4,
      blur: 12,
      spread: -2,
      inset: true,
    },
  ])
  expect(parseShadows('none', parseRgb)).toEqual([])
  // Прозрачная тень — не тень.
  expect(parseShadows('rgba(0, 0, 0, 0) 0px 1px 2px', parseRgb)).toEqual([])
})

test('polygonPoints resolves percentages against the box', () => {
  expect(polygonPoints('polygon(0px 0px, 100% 50%, 0px 100%)', 10, 8)).toBe(
    '0,0 10,4 0,8',
  )
  expect(polygonPoints('polygon(14% 45%, 0px 60%)', 100, 100)).toBe('14,45 0,60')
  expect(polygonPoints('circle(50%)', 10, 10)).toBeUndefined()
})

const flex = (overrides: Record<string, string> = {}) => ({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  justifyContent: 'normal',
  alignItems: 'center',
  columnGap: '8px',
  rowGap: '12px',
  paddingTop: '4px',
  paddingRight: '12px',
  paddingBottom: '4px',
  paddingLeft: '12px',
  borderTopWidth: '1px',
  borderRightWidth: '1px',
  borderBottomWidth: '1px',
  borderLeftWidth: '1px',
  ...overrides,
})

test('layoutOf turns a flex row into an auto layout with border folded into padding', () => {
  expect(layoutOf(flex())).toEqual({
    direction: 'row',
    wrap: false,
    gap: 8,
    crossGap: 12,
    padding: [5, 13, 5, 13],
    main: 'start',
    cross: 'center',
  })
})

test('layoutOf swaps the gaps for a column and drops baseline there', () => {
  const layout = layoutOf(flex({ flexDirection: 'column', alignItems: 'baseline' }))
  expect(layout?.gap).toBe(12)
  expect(layout?.crossGap).toBe(8)
  expect(layout?.cross).toBe('start')
})

test('layoutOf refuses what Figma cannot lay out the same way', () => {
  expect(layoutOf(flex({ display: 'grid' }))).toBeUndefined()
  expect(layoutOf(flex({ flexDirection: 'row-reverse' }))).toBeUndefined()
  expect(layoutOf(flex({ flexWrap: 'wrap-reverse' }))).toBeUndefined()
  expect(layoutOf(flex({ justifyContent: 'space-around' }))).toBeUndefined()
  expect(layoutOf(flex({ flexDirection: 'column', flexWrap: 'wrap' }))).toBeUndefined()
  expect(
    layoutOf(flex({ flexWrap: 'wrap', justifyContent: 'space-between' }))?.wrap,
  ).toBe(true)
})

test('font family is classified by the stack it came from', () => {
  expect(familyOf('ui-sans-serif, system-ui, sans-serif')).toBe('sans')
  expect(familyOf('ui-monospace, SFMono-Regular, Menlo, monospace')).toBe('mono')
  expect(families(`ui-sans-serif, 'Segoe UI', "Helvetica Neue", Arial`)).toEqual([
    'ui-sans-serif',
    'Segoe UI',
    'Helvetica Neue',
    'Arial',
  ])
})
