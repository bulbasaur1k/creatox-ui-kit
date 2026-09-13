import { useMemo, useState, type ReactNode } from 'react'
import { cx } from '../util/cx'
import { useLabels } from '../util/intl'
import { chevronRight } from '../icons'
import { Icon } from './Icon'
import { Select, type ListboxOption, type SelectProps } from './Listbox'

/* ── TreeSelect ────────────────────────────────────────────────────────────
   A `Select` whose options have children. Nothing is new about the list —
   the same popover, the same keyboard, the same typeahead — the tree is a
   flat list of the nodes currently visible, indented by depth, with a
   chevron in front of the ones that fold. Folding is the only state here,
   and it is local: which branches are open is a property of this control
   in this moment, not of the value it produces.                             */

export interface TreeSelectNode<T extends string = string> {
  value: T
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  children?: ReadonlyArray<TreeSelectNode<T>>
  /** What typeahead matches on. Defaults to a string label. */
  search?: string
}

export interface TreeSelectProps extends Omit<SelectProps, 'options' | 'children'> {
  nodes: ReadonlyArray<TreeSelectNode>
  /** Branches open at first; the default is everything folded. */
  defaultExpanded?: ReadonlyArray<string>
  /** Only leaves can be chosen; branches are headings that fold. */
  leafOnly?: boolean
}

interface Flat {
  node: TreeSelectNode
  depth: number
}

/** The nodes on screen: every root, then the children of open branches. */
function visible(
  nodes: ReadonlyArray<TreeSelectNode>,
  open: ReadonlySet<string>,
): Flat[] {
  const out: Flat[] = []
  const walk = (list: ReadonlyArray<TreeSelectNode>, depth: number) => {
    for (const node of list) {
      out.push({ node, depth })
      if (node.children && open.has(node.value)) walk(node.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return out
}

/** The path of branches over a value, so the one chosen can be seen. */
function pathTo(nodes: ReadonlyArray<TreeSelectNode>, value: string): string[] | null {
  for (const node of nodes) {
    if (node.value === value) return []
    if (node.children) {
      const below = pathTo(node.children, value)
      if (below) return [node.value, ...below]
    }
  }
  return null
}

export function TreeSelect({
  nodes,
  defaultExpanded,
  leafOnly,
  value,
  defaultValue,
  ...rest
}: TreeSelectProps) {
  const labels = useLabels()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    // Whatever is chosen must be reachable when the list opens.
    const chosen = value ?? defaultValue
    const path = chosen !== undefined ? pathTo(nodes, chosen) : null
    return new Set([...(defaultExpanded ?? []), ...(path ?? [])])
  })

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const options = useMemo<ListboxOption[]>(
    () =>
      visible(nodes, open).map(({ node, depth }) => {
        const branch = node.children !== undefined && node.children.length > 0
        const isOpen = open.has(node.value)
        return {
          value: node.value,
          search:
            node.search ?? (typeof node.label === 'string' ? node.label : node.value),
          display: node.label,
          description: node.description,
          disabled: node.disabled || (leafOnly && branch),
          label: (
            <span
              className="flex items-center gap-1"
              style={{ paddingInlineStart: `${depth * 1.25}rem` }}
            >
              {branch ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isOpen ? labels.collapseRow : labels.expandRow}
                  aria-expanded={isOpen}
                  // Folding is not choosing: the press stops here, before the
                  // row picks the option and the popover closes.
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    toggle(node.value)
                  }}
                  className={cx(
                    'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-control',
                    'border-0 bg-transparent p-0 text-fg-muted hover:bg-hover hover:text-fg',
                  )}
                >
                  <Icon
                    className={cx(
                      'transition-transform duration-snap ease-snap',
                      isOpen && 'rotate-90',
                    )}
                  >
                    {chevronRight}
                  </Icon>
                </button>
              ) : (
                <span aria-hidden="true" className="inline-block size-5 shrink-0" />
              )}
              <span className="min-w-0 truncate">{node.label}</span>
            </span>
          ),
        }
      }),
    [nodes, open, leafOnly, labels],
  )

  return <Select options={options} value={value} defaultValue={defaultValue} {...rest} />
}
