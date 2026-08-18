import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = join(root, 'package.json')
const versionPath = join(root, 'src', 'version.ts')

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const packageVersion = packageJson.version
if (typeof packageVersion !== 'string') {
  throw new Error('package.json must contain a string "version".')
}

const source = readFileSync(versionPath, 'utf8')
const match = source.match(/export const PLUGIN_VERSION\s*=\s*['"]([^'"]+)['"]/)
if (!match) {
  throw new Error('Cannot find PLUGIN_VERSION declaration in src/version.ts.')
}

const pluginVersion = match[1]
if (packageVersion !== pluginVersion) {
  throw new Error(
    `Version mismatch: package.json version is ${packageVersion}, but PLUGIN_VERSION is ${pluginVersion}. ` +
      'Keep these two versions in sync.'
  )
}

console.log(`Version sync verified: ${packageVersion}`)
