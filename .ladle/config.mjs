/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'src/**/*.stories.tsx',
  viteConfig: 'vite.ladle.config.ts',
  outDir: 'dist-ladle',
  defaultStory: 'primitives--button--states',
  addons: {
    // The kit re-themes by re-declaring custom properties, not with `dark:`
    // classes, so the provider maps this toggle onto applyTheme() — the same
    // call a product would make.
    theme: { enabled: true, defaultState: 'light' },
    a11y: { enabled: true },
    rtl: { enabled: true },
    width: {
      enabled: true,
      options: { panel: 380, sidebar: 240, page: 1280 },
      defaultState: 0,
    },
  },
}
