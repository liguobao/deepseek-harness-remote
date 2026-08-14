import type { PairLink } from '../types'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '10.0.2.2'])

export function normalizeServerUrl(input: string): string {
  const value = input.trim().replace(/\/+$/, '')
  if (value.length === 0) throw new Error('Enter the address of your DSH Remote server.')

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new Error('Enter a valid server address, for example https://remote.example.com.')
  }

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('Use HTTPS. Plain HTTP is only allowed for local development.')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The server address cannot include credentials, query parameters, or a fragment.')
  }
  return url.toString().replace(/\/$/, '')
}

export function websocketUrl(baseUrl: string): string {
  const url = new URL(normalizeServerUrl(baseUrl))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws/v1/connect'
  return url.toString()
}

export function normalizePairingCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^23456789A-HJ-NP-Z]/g, '').slice(0, 8)
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw
}

export function parsePairLink(url: string): PairLink {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'dshremote:' || parsed.hostname !== 'pair') return {}
    return {
      server: parsed.searchParams.get('server') ?? undefined,
      code: parsed.searchParams.get('code') ?? undefined,
    }
  } catch {
    return {}
  }
}
