import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cx } from '../util/cx'
import { GAP, type Space } from '../util/tokens'

export interface ClusterProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  gap?: Space
}

/** Wrapping group of small peers: filters, tags, action sets, badges. */
export function Cluster({ as: Tag = 'div', gap = 2, className, ...rest }: ClusterProps) {
  return (
    <Tag
      className={cx('flex min-w-0 flex-wrap items-center', GAP[gap], className)}
      {...rest}
    />
  )
}
