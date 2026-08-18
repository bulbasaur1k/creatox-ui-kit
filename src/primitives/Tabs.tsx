import {
  useId,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { cx } from '../util/cx'

/* ══ Navigational tabs — the default ═══════════════════════════════════════
   Contextual navigation for the object being explored. These are links: the
   view they select is part of the URL, so it survives a refresh, can be
   copied, shared, and reached with browser back — §13.
   ══════════════════════════════════════════════════════════════════════════*/

export interface TabNavProps extends ComponentPropsWithoutRef<'nav'> {}

export function TabNav({ className, children, ...rest }: TabNavProps) {
  return (
    <nav
      className={cx(
        'flex items-stretch gap-1 overflow-x-auto border-b border-line',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...rest}
    >
      {children}
    </nav>
  )
}

const TAB_BASE =
  'inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-0 ' +
  'border-b-2 border-transparent bg-transparent px-3 py-2 -mb-px ' +
  'text-ui font-medium text-fg-secondary no-underline ' +
  'transition-colors duration-instant ease-snap hover:text-fg ' +
  // Press paints the background rather than the label or the rule: those two
  // already carry the selected state, and a press must not read as a change of
  // selection before the selection has actually changed.
  'active:bg-hover active:text-fg ' +
  'aria-[current=page]:border-b-accent aria-[current=page]:text-fg ' +
  'aria-selected:border-b-accent aria-selected:text-fg'

export interface TabProps extends ComponentPropsWithoutRef<'a'> {
  as?: ElementType
  /** A count belongs on the tab when it tells the user whether to go there. */
  count?: ReactNode
}

export function Tab({ as: Tag = 'a', count, className, children, ...rest }: TabProps) {
  return (
    <Tag className={cx(TAB_BASE, className)} {...rest}>
      {children}
      {count !== undefined && (
        <span className="text-micro tabular-nums text-fg-muted">{count}</span>
      )}
    </Tag>
  )
}

/* ══ Local tabs — CSS only ═════════════════════════════════════════════════
   For state that genuinely is not navigation: a preview/raw switch, a units
   toggle. Radio inputs hold the state, which buys arrow-key navigation and
   screen-reader semantics from the platform. No React state, no handler.

     <Tabs items={[{ label: 'Preview', content: … }, …]} />
   ══════════════════════════════════════════════════════════════════════════*/

export interface TabsItem {
  label: ReactNode
  content: ReactNode
  count?: ReactNode
}

export interface TabsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  items: TabsItem[]
  /** Index of the tab shown before the user picks one. */
  defaultIndex?: number
  /** Names the tab group for assistive tech. */
  label: string
}

export function Tabs({ items, defaultIndex = 0, label, className, ...rest }: TabsProps) {
  const name = `cx-tabs-${useId().replace(/:/g, '')}`

  if (items.length > 8) {
    // Past eight, this is real navigation and the state belongs in the URL.
    // Silently rendering nine would break the CSS that switches panels.
    throw new Error(
      `Tabs supports up to 8 items, received ${items.length}. Use TabNav with routed links instead.`,
    )
  }

  return (
    <div className={cx('cx-tabs flex min-w-0 flex-col gap-4', className)} {...rest}>
      {/* Inputs come first so the sibling combinator can reach both the
          labels and the panels that follow them. */}
      {items.map((item, i) => (
        <input
          key={`input-${i}`}
          type="radio"
          name={name}
          id={`${name}-${i}`}
          defaultChecked={i === defaultIndex}
          className="sr-only-control"
          aria-label={typeof item.label === 'string' ? item.label : undefined}
        />
      ))}

      <div
        role="group"
        aria-label={label}
        className={cx(
          'cx-tablist order-first flex items-stretch gap-1 overflow-x-auto border-b border-line',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((item, i) => (
          <label
            key={`label-${i}`}
            htmlFor={`${name}-${i}`}
            className={cx('cx-tab', TAB_BASE)}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="text-micro tabular-nums text-fg-muted">{item.count}</span>
            )}
          </label>
        ))}
      </div>

      {items.map((item, i) => (
        <div key={`panel-${i}`} className="cx-tab-panel min-w-0">
          {item.content}
        </div>
      ))}
    </div>
  )
}
