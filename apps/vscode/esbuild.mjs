import { build } from 'esbuild'
import { cp, copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

await build({
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode'],
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
})

const require = createRequire(import.meta.url)
const target = join(import.meta.dirname, 'media', 'harness')
await rm(target, { recursive: true, force: true })
await mkdir(join(target, 'plugins'), { recursive: true })
const frontend = dirname(require.resolve('@deepseek-ai/dsh-web-frontend/package.json'))
await cp(join(frontend, 'dist'), target, { recursive: true })
const plugins = [
  '@deepseek-ai/dsh-typert-registry', '@deepseek-ai/dsh-api-gateway', '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-theme',
  '@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-tool',
  '@deepseek-ai/dsh-client-ui-input-trigger', '@deepseek-ai/dsh-client-ui-commands',
  '@deepseek-ai/dsh-client-ui-model-selection', '@deepseek-ai/dsh-client-ui-permission-presets',
]
for (const id of plugins) {
  const root = dirname(require.resolve(`${id}/package.json`))
  await copyFile(join(root, 'lib', 'client.js'), join(target, 'plugins', `${id.slice('@deepseek-ai/'.length)}.js`))
}
await copyFile(join(import.meta.dirname, 'src', 'harness-connection.js'), join(target, 'plugins', 'dsh-client-connection.js'))
await copyFile(join(import.meta.dirname, 'src', 'harness-layout.js'), join(target, 'plugins', 'dsh-client-ui-layout.js'))
