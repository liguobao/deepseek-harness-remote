import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'

const LEGACY_PLACEHOLDER_VERSION = '0.0.1'

export function normalizeHarnessVersion(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const version = value.trim()
  if (version.length === 0 || version.length > 64 || /[\u0000-\u001f]/u.test(version)) return undefined
  return version
}

export function selectHarnessVersion(
  reportedVersion: string | undefined,
  distributionVersion: string | undefined,
): string | undefined {
  if (reportedVersion !== undefined && reportedVersion !== LEGACY_PLACEHOLDER_VERSION) return reportedVersion
  return distributionVersion
}

/**
 * Compatibility fallback for Harness builds whose host.describe still returns
 * the historical 0.0.1 placeholder. The running CLI entrypoint sits below the
 * @deepseek-ai/dsh package root, so walk only its ancestor chain.
 */
export async function readHarnessDistributionVersion(
  entrypoint: string | undefined = process.argv[1],
): Promise<string | undefined> {
  if (entrypoint === undefined || !isAbsolute(entrypoint)) return undefined
  let directory = dirname(entrypoint)
  for (let depth = 0; depth < 8; depth += 1) {
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as Record<string, unknown>
      if (manifest.name === '@deepseek-ai/dsh') return normalizeHarnessVersion(manifest.version)
    } catch {
      // Most ancestors do not contain a package manifest.
    }
    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }
  return undefined
}
