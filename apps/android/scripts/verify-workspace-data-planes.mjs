import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const androidRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(androidRoot, '../..')

const [appConfig, packageMetadata, remoteGateway, alphaClient] = await Promise.all([
  readJson(resolve(androidRoot, 'app.json')),
  readJson(resolve(androidRoot, 'package.json')),
  readFile(resolve(repositoryRoot, 'packages/client-core/dist/remote-gateway.js'), 'utf8'),
  readFile(resolve(repositoryRoot, 'packages/client-core/dist/harness-alpha-client.js'), 'utf8'),
])

const appVersion = appConfig?.expo?.version
if (typeof appVersion !== 'string' || appVersion.length === 0) {
  throw new Error('apps/android/app.json must define expo.version.')
}
if (packageMetadata?.version !== appVersion) {
  throw new Error(
    `Android version mismatch: package.json=${String(packageMetadata?.version)} app.json=${appVersion}`,
  )
}

for (const marker of ['harness.api.v1', 'harness.remote.v1', 'harness.remote.call']) {
  if (!remoteGateway.includes(marker)) {
    throw new Error(`Compiled client-core is stale or incomplete: missing ${marker}.`)
  }
}
if (!alphaClient.includes('HarnessAlphaClient')) {
  throw new Error('Compiled client-core is stale or incomplete: missing HarnessAlphaClient.')
}

console.log(`Android workspace data planes verified: rc.2 ApiProxy + alpha Typert Remote (${appVersion})`)

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}
