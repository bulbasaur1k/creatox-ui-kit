import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'

const root = import.meta.dirname

/**
 * `theme.css` ships as source, not as compiled output: products that run their
 * own Tailwind import it so the kit's `@theme` block participates in their
 * build and both sides end up on one token set.
 */
/**
 * Only in demo mode: receives the interaction timings `demo/perf.ts` posts
 * from a phone on the same network and prints them, so the numbers taken on
 * the device land in the terminal next to the developer.
 */
function perfLog(): Plugin {
  return {
    name: 'creatox-perf-log',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__perf', (req, res) => {
        let body = ''
        req.on('data', (chunk: Buffer) => (body += chunk))
        req.on('end', () => {
          try {
            for (const line of JSON.parse(body) as string[]) console.log(`[perf] ${line}`)
          } catch {
            console.log(`[perf] unreadable: ${body.slice(0, 80)}`)
          }
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}

function shipThemeSource(): Plugin {
  return {
    name: 'creatox-ship-theme-source',
    apply: 'build',
    closeBundle() {
      mkdirSync(resolve(root, 'dist'), { recursive: true })
      copyFileSync(resolve(root, 'src/styles/theme.css'), resolve(root, 'dist/theme.css'))
    },
  }
}

export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo'

  return {
    // The workbench has its own index.html and it lives in demo/. Without this
    // the demo build looks for index.html at the package root, finds nothing,
    // and `npm run dev` serves an empty page at /.
    root: isDemo ? resolve(root, 'demo') : root,
    plugins: [
      react(),
      tailwind(),
      ...(isDemo
        ? [perfLog()]
        : [
            // Stories document the kit; they are not part of its API.
            dts({ include: ['src'], exclude: ['src/**/*.stories.tsx'] }),
            shipThemeSource(),
          ]),
    ],
    build: isDemo
      ? {
          outDir: resolve(root, 'dist-demo'),
          emptyOutDir: true,
          // Every page of the workbench, not only index.html: the table stand
          // and the dropdown stand are entries of their own, and the Pages
          // deploy ships all three under /demo/.
          rollupOptions: {
            input: {
              index: resolve(root, 'demo/index.html'),
              table: resolve(root, 'demo/table.html'),
              stress: resolve(root, 'demo/stress.html'),
            },
          },
        }
      : {
          lib: {
            entry: {
              index: resolve(root, 'src/index.ts'),
              // Its own entry, not a re-export from the main one: the engine
              // and the virtualizer behind it weigh more than the rest of the
              // kit, and a product that never imports `creatox-ui-kit/table`
              // must not have to resolve them.
              table: resolve(root, 'src/table/index.ts'),
            },
            formats: ['es'],
            fileName: (_format, name) => `${name}.js`,
          },
          rollupOptions: {
            // Runtime dependencies stay external. Bundling them would ship a
            // second copy of tailwind-merge to every product that already has
            // one, and two merge instances configured differently is worse
            // than the duplication: whichever the class string passes through
            // decides which utilities survive.
            external: [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'clsx',
              'tailwind-merge',
              'class-variance-authority',
              '@tanstack/react-table',
              '@tanstack/react-virtual',
            ],
            output: {
              chunkFileNames: 'chunks/[name]-[hash].js',
              assetFileNames: (asset) =>
                asset.names?.some((n) => n.endsWith('.css'))
                  ? 'styles.css'
                  : '[name][extname]',
            },
          },
          cssCodeSplit: false,
          sourcemap: true,
          emptyOutDir: true,
        },
    server: { port: 5180 },
  }
})
