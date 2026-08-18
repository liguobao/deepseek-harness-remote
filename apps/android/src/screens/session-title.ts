import type { RemoteSession } from '../types'

type SessionMetadataRecord = Record<string, unknown>

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text.length > 0 ? text : undefined
}

function getMetadata(session: RemoteSession): SessionMetadataRecord | undefined {
  const values = session.projections?.values
  if (typeof values !== 'object' || values === null || Array.isArray(values)) return undefined
  const metadata = values.sessionListMetadata
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return undefined
  return metadata as Record<string, unknown>
}

function getLastPathComponent(cwd?: string): string | undefined {
  if (typeof cwd !== 'string') return undefined
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  const part = parts.at(-1)
  return part === undefined || part.length === 0 ? undefined : part
}

export function resolveSessionDisplayTitle(session: RemoteSession): string | undefined {
  const title = trimString(session.title)
  if (title !== undefined) return title

  const metadata = getMetadata(session)
  const projectedTitle = trimString(metadata?.title)
  if (projectedTitle !== undefined) return projectedTitle

  return getLastPathComponent(session.cwd)
}
