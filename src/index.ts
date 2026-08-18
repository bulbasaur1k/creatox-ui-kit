/**
 * creatox-ui-kit
 *
 * A web-native, object-centric React UI kit.
 *
 * Two ideas run through everything here:
 *
 *  1. The interface should reflect the structure of the domain, not the
 *     structure of a component library. Hence the domain layer: an object has
 *     an identity, a state, relationships and actions, and those are
 *     components, not conventions.
 *
 *  2. State that the browser already models belongs to the browser. Disclosure
 *     is <details>, modals are <dialog>, menus are [popover], tab state is a
 *     radio group, tooltips are generated content. Less JavaScript runs, and
 *     what does run is the part that is genuinely application logic.
 *
 * Styling is Tailwind v4. Every token lives in one `@theme` block and dark
 * mode re-declares those same variables, so no component carries a `dark:`
 * class and retheming means overriding variables and nothing else.
 */

// Vite extracts this to dist/styles.css at build time and drops the import
// from the emitted JS, so consumers import the stylesheet explicitly:
//   import 'creatox-ui-kit/styles.css'
import './styles/index.css'

export * from './layout'
export * from './primitives'
export * from './domain'
// The merge, and the recipe builder wired to it. A product composing its own
// variants needs the same configuration: any other `tailwind-merge` instance
// does not know this kit's utilities and will not resolve their conflicts.
export { cx, cva, type VariantProps, type ClassValue } from './util/cx'
export { useLabels, useLocale, LABELS_EN, LABELS_RU, type Labels } from './util/intl'
export type { Space } from './util/tokens'
