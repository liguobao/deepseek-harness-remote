import { build } from 'esbuild'
import { rm } from 'node:fs/promises'

const production = process.env.NODE_ENV === 'production'

await rm('dist', { recursive: true, force: true })

await build({
  entryPoints: ['src/popup.ts', 'src/background.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
})
