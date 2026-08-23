import type { RemoteHost } from './types.js'

/** Full serializable launcher state pushed from the service worker to the popup. */
export interface AppSettings { serverUrl: string }
export interface AppState {
  settings?: AppSettings
  authorized: boolean
  account?: string
  hosts: RemoteHost[]
  refreshing: boolean
  openingHostId?: string
  notice?: string
  authorizationBusy: boolean
  authorizationError?: string
}

export const emptyState: AppState = {
  authorized: false,
  hosts: [],
  refreshing: false,
  authorizationBusy: false,
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function relativeTime(value: number): string {
  const elapsed = Math.max(0, Date.now() - value)
  if (elapsed < 60_000) return 'now'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`
  return `${Math.floor(elapsed / 86_400_000)}d ago`
}
