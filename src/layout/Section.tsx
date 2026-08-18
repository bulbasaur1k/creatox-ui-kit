import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from '../util/cx'

export interface SectionProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  /** Actions scoped to this section, not to the object as a whole. */
  actions?: ReactNode
  /** Draws a container. Use only when the section genuinely owns its content. */
  bounded?: boolean
  headingLevel?: 2 | 3 | 4
}

/**
 * A labelled region inside an object view. Unbounded by default: a heading and
 * spacing already communicate grouping, so no box is drawn unless the section
 * owns what is inside it — §4, containers must carry meaning.
 */
export function Section({
  title,
  description,
  actions,
  bounded,
  headingLevel = 3,
  className,
  children,
  ...rest
}: SectionProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  const hasHeader = title !== undefined || actions !== undefined

  return (
    <section
      className={cx(
        'flex min-w-0 flex-col gap-3',
        bounded && 'rounded-md border border-line bg-raised p-4',
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <header className="flex min-h-control-md items-baseline justify-between gap-3">
          <div className="min-w-0">
            {title !== undefined && (
              <Heading className="m-0 text-ui font-semibold tracking-[-0.011em] text-fg">
                {title}
              </Heading>
            )}
            {description !== undefined && (
              <p className="m-0 text-meta text-fg-secondary">{description}</p>
            )}
          </div>
          {actions !== undefined && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
