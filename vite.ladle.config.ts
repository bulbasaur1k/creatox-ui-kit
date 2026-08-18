import { defineConfig } from 'vite'
import tailwind from '@tailwindcss/vite'

/**
 * Ladle merges the project's Vite config into its own. The main config builds a
 * library — entry, externals, dts, single CSS asset — and none of that applies
 * to a documentation site, so Ladle gets its own minimal config instead.
 *
 * No React plugin here, and that is deliberate. Ladle brings its own Fast
 * Refresh and runs the Vite it bundles — currently 6 — while this project's
 * `@vitejs/plugin-react` is built for the Rolldown-based Vite 8 the library
 * uses. Listing it puts a Rolldown-only transform inside a Vite that has no
 * Rolldown, and every module fails with `Missing field moduleType`: the
 * showcase serves, and every story comes out blank.
 */
export default defineConfig({
  plugins: [tailwind()],
})
