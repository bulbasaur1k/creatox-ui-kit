import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cva, cx } from '../util/cx'

/**
 * Variants are named for the role the text plays, not for how big it is.
 * Picking `identity` or `meta` is a statement about hierarchy; picking
 * `text-lg` would only be a statement about size.
 */
export type TextVariant =
  | 'identity'
  | 'title'
  | 'heading'
  | 'body'
  | 'reading'
  | 'meta'
  | 'label'
  | 'mono'

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'

export interface TextProps extends ComponentPropsWithoutRef<'span'> {
  as?: ElementType
  variant?: TextVariant
  tone?: TextTone
  weight?: 'normal' | 'medium' | 'semibold'
  /** Single-line ellipsis. Pair with a parent that can actually constrain it. */
  truncate?: boolean
  /** Multi-line clamp, for descriptions inside rows. */
  clamp?: 1 | 2 | 3 | 4
}

/* Four independent axes on one element, which is what a recipe is for. Tone
   and weight override what the variant already set — a merge away, since the
   variant and the override both land in the same class string. */
const text = cva('m-0', {
  variants: {
    variant: {
      identity: 'text-identity font-semibold text-fg',
      title: 'text-title font-semibold tracking-[-0.011em] text-fg',
      heading: 'text-ui font-semibold text-fg',
      body: 'text-ui text-fg',
      reading: 'text-reading text-fg',
      meta: 'text-meta text-fg-muted',
      label: 'text-micro font-medium uppercase tracking-[0.04em] text-fg-muted',
      mono: 'font-mono text-meta tracking-normal text-fg',
    },
    tone: {
      default: '',
      secondary: 'text-fg-secondary',
      muted: 'text-fg-muted',
      accent: 'text-fg-accent',
      success: 'text-success-fg',
      warning: 'text-warning-fg',
      danger: 'text-danger-fg',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    truncate: { true: 'block min-w-0 truncate', false: '' },
    clamp: {
      1: 'line-clamp-1',
      2: 'line-clamp-2',
      3: 'line-clamp-3',
      4: 'line-clamp-4',
    },
  },
  defaultVariants: { variant: 'body' },
})

export function Text({
  as: Tag = 'span',
  variant,
  tone,
  weight,
  truncate,
  clamp,
  className,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={cx(text({ variant, tone, weight, truncate, clamp }), className)}
      {...rest}
    />
  )
}

export interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  /** Renders a scrollable block instead of an inline fragment. */
  block?: boolean
}

/** Machine output: identifiers, commands, log lines, diffs. */
export function Code({ block, className, ...rest }: CodeProps) {
  return (
    <code
      className={cx(
        'rounded-sm border border-line bg-inset font-mono text-fg',
        block
          ? 'block overflow-x-auto whitespace-pre rounded-md p-3 text-meta [tab-size:2]'
          : 'whitespace-nowrap px-[0.32em] py-[0.05em] text-[0.92em]',
        className,
      )}
      {...rest}
    />
  )
}
