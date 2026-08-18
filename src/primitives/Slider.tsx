import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '../util/cx'
import { vars } from '../util/tokens'

/* ── Slider ────────────────────────────────────────────────────────────────
   `<input type="range">`, with its painted parts replaced.

   Keyboard stepping, page-up and page-down, the drag itself, RTL, and the
   value announced as a slider are all the browser's. What a library adds is
   a filled track — and that is one custom property away, written on the
   element from the value the product already has.                          */

export interface SliderProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  /** Required for the filled portion of the track; the input alone cannot
      express "how far along am I" in CSS. */
  value?: number
  min?: number
  max?: number
}

export function Slider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  className,
  style,
  ...rest
}: SliderProps) {
  const current = Number(value ?? defaultValue ?? min)
  const span = max - min
  const progress = span === 0 ? 0 : ((current - min) / span) * 100

  return (
    <input
      type="range"
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      className={cx('cx-slider w-full cursor-pointer bg-transparent', className)}
      style={vars({ '--cx-slider-progress': `${progress}%` }, style)}
      {...rest}
    />
  )
}
