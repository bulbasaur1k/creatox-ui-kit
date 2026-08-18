import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cx } from '../util/cx'
import { PAD_X, type Space } from '../util/tokens'

export interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  /**
   * `app` — a wide workspace measure.
   * `reading` — bounded to a comfortable line length for prose.
   * `full` — edge to edge, for canvases and tables that want the room.
   */
  measure?: 'app' | 'reading' | 'full'
  gutter?: Space
}

const MEASURE = {
  app: 'max-w-app',
  reading: 'max-w-[68ch] text-reading',
  full: 'max-w-none',
} as const

export function Container({
  as: Tag = 'div',
  measure = 'app',
  gutter = 6,
  className,
  ...rest
}: ContainerProps) {
  return (
    <Tag
      className={cx('mx-auto w-full', PAD_X[gutter], MEASURE[measure], className)}
      {...rest}
    />
  )
}
