import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml', 'root package must declare a DSH bundle patch')
assert.equal(manifest.dsh?.client?.platform, 'web', 'root package must declare its browser client face')
assert.ok(
  manifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-settings-plugins'),
  'root browser client must load after the official plugin settings surface',
)
assert.equal(manifest.main, './index.js', 'root package must expose a prebuilt Host entry at package root')
assert.equal(manifest.exports?.['./client'], './packages/plugin/dist/client.github.js', 'root package must export the GitHub-root browser client entry')

for (const file of [
  'index.js',
  'cordis.patch.yml',
  'packages/plugin/dist/index.js',
  'packages/plugin/dist/client.github.js',
  'packages/plugin/public.d.ts',
]) {
  assert.ok(existsSync(join(root, file)), `DSH plugin artifact is missing: ${file}`)
}

const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
assert.match(patch, new RegExp(`name:\\s*['\"]?${manifest.name.replaceAll('-', '\\-')}['\"]?`), 'root patch must load the installed root package')

const rootHostEntry = readFileSync(join(root, 'index.js'), 'utf8')
assert.match(rootHostEntry, /packages\/plugin\/dist\/index\.js/, 'root Host entry must forward to the committed bundle')

const hostBundle = readFileSync(join(root, 'packages/plugin/dist/index.js'), 'utf8')
assert.doesNotMatch(hostBundle, /(?:from\s+|require\()['\"]@dsh-remote\//, 'Host bundle must not import unpublished workspace packages')

const clientBundle = readFileSync(join(root, 'packages/plugin/dist/client.github.js'), 'utf8')
assert.match(clientBundle, /window\.__ModuleLoader__\.load/, 'browser client entry must register with the DSH module loader')
assert.match(clientBundle, /settings\.plugin\.item/, 'browser client must contribute its options inside Plugin configuration')
assert.doesNotMatch(clientBundle, /settings\.plugins\.tab/, 'browser client must not create a separate plugin settings tab')

let githubClient
runInNewContext(clientBundle, {
  window: { __ModuleLoader__: { load: handoff => { githubClient = handoff } } },
})
assert.equal(githubClient?.id, manifest.name, 'browser client module id must match the GitHub root package name')
assert.equal(typeof githubClient?.factory, 'function', 'browser client entry must register a factory')

const npmClientBundle = readFileSync(join(root, 'packages/plugin/dist/client.js'), 'utf8')
let npmClient
runInNewContext(npmClientBundle, {
  window: { __ModuleLoader__: { load: handoff => { npmClient = handoff } } },
})
assert.equal(npmClient?.id, '@dsh-remote/plugin', 'npm client module id must match the nested package name')

console.log(`Verified DSH bundle package ${manifest.name}@${manifest.version}`)
