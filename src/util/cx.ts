import { extendTailwindMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

/* ── Joining classes ───────────────────────────────────────────────────────
   `clsx` flattens the conditionals; `tailwind-merge` drops the losers.

   The second half is the one that matters. A class attribute has no cascade:
   `class="control-md h-12"` leaves both utilities standing and the winner is
   decided by which rule Tailwind happened to emit later, not by which the
   caller wrote last. So a product passing `className="h-12"` to a control was
   overriding it only by luck — which is exactly what the two consumers ran
   into. Merging resolves it by intent: the last one written wins.

   The configuration below is not optional. `tailwind-merge` groups classes by
   the property they set, and it only knows the properties of stock Tailwind —
   `control-md`, `px-field-md` and `rounded-control` are ours, so out of the
   box it would treat them as unrelated strings and merge nothing. Every
   custom utility the kit defines has to be declared here or the merge quietly
   does half its job.                                                         */

/** The composite row utilities set three properties at once, which is a shape
    `tailwind-merge` has no notion of: one class belongs to one group. They get
    a group of their own, and the three stock groups they overlap with are
    declared as overriding it — set a height by hand and you have opted out of
    the row, text size and padding included. */
type CxGroup = 'cx-control-row'

const merge = extendTailwindMerge<CxGroup>({
  extend: {
    classGroups: {
      'cx-control-row': [{ control: ['sm', 'md', 'lg'] }, { button: ['sm', 'md', 'lg'] }],
      // Sizing tokens live in `--spacing-*`, so these read as ordinary
      // spacing utilities — but only after the names are declared.
      h: [{ h: ['control-sm', 'control-md', 'control-lg', 'switch-block', 'choice'] }],
      w: [{ w: ['control-sm', 'control-md', 'control-lg', 'switch-inline', 'choice'] }],
      size: [
        { size: ['control-sm', 'control-md', 'control-lg', 'choice', 'switch-block'] },
      ],
      px: [
        {
          px: [
            'field-sm',
            'field-md',
            'field-lg',
            'button-sm',
            'button-md',
            'button-lg',
            'control-sm',
            'control-md',
            'control-lg',
          ],
        },
      ],
      'font-size': [
        {
          text: [
            'micro',
            'meta',
            'ui',
            'reading',
            'title',
            'identity',
            'display',
            'control-sm',
            'control-md',
            'control-lg',
            'field-sm',
            'field-md',
            'field-lg',
          ],
        },
      ],
      rounded: [{ rounded: ['control'] }],
      // Tailwind has no theme namespace for transition-duration, so the kit
      // declares these as utilities; the merger has to be told the same.
      duration: [{ duration: ['instant', 'snap', 'enter'] }],
      'max-w': [{ 'max-w': ['app', 'narrow', 'medium', 'wide'] }],
    },
    conflictingClassGroups: {
      h: ['cx-control-row'],
      px: ['cx-control-row'],
      'font-size': ['cx-control-row'],
      size: ['cx-control-row'],
    },
  },
})

/** Joins class names, resolving Tailwind conflicts in favour of the last one. */
export function cx(...parts: ClassValue[]): string {
  return merge(clsx(parts))
}

export { cva, type VariantProps } from 'class-variance-authority'
export type { ClassValue }
