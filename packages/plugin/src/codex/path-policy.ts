import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative } from 'node:path'
import { RpcError } from '../safe-error.js'

export class CodexPathPolicy {
  private constructor(private readonly roots: readonly string[]) {}

  static async create(configuredRoots: readonly string[]): Promise<CodexPathPolicy> {
    const roots: string[] = []
    for (const configured of configuredRoots) {
      if (!isAbsolute(configured)) {
        throw new RpcError('CODEX_ROOT_INVALID', 'Codex allowed roots must be absolute directories.')
      }
      const canonical = await realpath(configured)
      if (!(await stat(canonical)).isDirectory()) {
        throw new RpcError('CODEX_ROOT_INVALID', 'Codex allowed roots must be directories.')
      }
      if (!roots.includes(canonical)) roots.push(canonical)
    }
    if (roots.length === 0) {
      throw new RpcError('CODEX_ROOTS_REQUIRED', 'Codex Remote requires at least one allowed root.')
    }
    return new CodexPathPolicy(roots)
  }

  list(): readonly string[] { return this.roots }

  async canonicalizeAllowed(path: string): Promise<string> {
    if (!isAbsolute(path)) throw new RpcError('CODEX_PATH_NOT_ALLOWED', 'The Codex working directory is not allowed.')
    let canonical: string
    try {
      canonical = await realpath(path)
    } catch {
      throw new RpcError('CODEX_PATH_NOT_ALLOWED', 'The Codex working directory is not available.')
    }
    if (!(await stat(canonical)).isDirectory() || !this.roots.some(root => contains(root, canonical))) {
      throw new RpcError('CODEX_PATH_NOT_ALLOWED', 'The Codex working directory is not allowed.')
    }
    return canonical
  }

  async allows(path: unknown): Promise<boolean> {
    if (typeof path !== 'string') return false
    try {
      await this.canonicalizeAllowed(path)
      return true
    } catch {
      return false
    }
  }
}

function contains(root: string, candidate: string): boolean {
  const child = relative(root, candidate)
  return child === '' || (child !== '..' && !child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(child))
}
