import type { CSSProperties } from 'react'

/**
 * Spacing is a closed set drawn from the 4px rhythm. Components accept only
 * these steps, so no feature can slip an off-rhythm value in through a prop.
 *
 * The maps below hold literal class names on purpose: Tailwind scans source
 * text, so a computed string like `gap-${n}` would never be emitted.
 */
export type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16

export const GAP: Record<Space, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
  16: 'gap-16',
}

export const GAP_X: Record<Space, string> = {
  0: 'gap-x-0',
  1: 'gap-x-1',
  2: 'gap-x-2',
  3: 'gap-x-3',
  4: 'gap-x-4',
  6: 'gap-x-6',
  8: 'gap-x-8',
  12: 'gap-x-12',
  16: 'gap-x-16',
}

export const PAD_Y: Record<Space, string> = {
  0: 'py-0',
  1: 'py-1',
  2: 'py-2',
  3: 'py-3',
  4: 'py-4',
  6: 'py-6',
  8: 'py-8',
  12: 'py-12',
  16: 'py-16',
}

export const PAD_X: Record<Space, string> = {
  0: 'px-0',
  1: 'px-1',
  2: 'px-2',
  3: 'px-3',
  4: 'px-4',
  6: 'px-6',
  8: 'px-8',
  12: 'px-12',
  16: 'px-16',
}

export const PAD: Record<Space, string> = {
  0: 'p-0',
  1: 'p-1',
  2: 'p-2',
  3: 'p-3',
  4: 'p-4',
  6: 'p-6',
  8: 'p-8',
  12: 'p-12',
  16: 'p-16',
}

/**
 * Builds a style object from custom-property pairs, dropping undefined
 * entries so React does not emit empty declarations.
 */
export function vars(
  entries: Record<string, string | number | undefined>,
  base?: CSSProperties,
): CSSProperties | undefined {
  let style: Record<string, unknown> | undefined
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue
    style ??= {}
    style[key] = value
  }
  if (base) style = { ...style, ...base }
  return style as CSSProperties | undefined
}
