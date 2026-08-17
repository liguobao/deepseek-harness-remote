import type { PairLink } from '../types'
import zhCN from '../locales/zh-CN'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '10.0.2.2'])

/** Private-network IPv4 ranges reachable only on a LAN/VPN (RFC1918, link-local, CGNAT). */
function isPrivateHostname(hostname: string): boolean {
  if (LOCAL_HOSTS.has(hostname)) return true
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (match === null) return false
  const [a, b] = [Number(match[1]), Number(match[2])]
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127)
  )
}

export function normalizeServerUrl(input: string): string {
  const value = input.trim().replace(/\/+$/, '')
  if (value.length === 0) throw new Error(zhCN.validation.serverRequired)

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new Error(zhCN.validation.serverInvalid)
  }

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isPrivateHostname(url.hostname))) {
    throw new Error(zhCN.validation.httpsRequired)
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(zhCN.validation.serverPartsForbidden)
  }
  return url.toString().replace(/\/$/, '')
}

export function websocketUrl(baseUrl: string): string {
  const url = new URL(normalizeServerUrl(baseUrl))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws/v1/connect'
  return url.toString()
}

export function parsePairLink(url: string): PairLink {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'dshremote:' || parsed.hostname !== 'pair') return {}
    if (parsed.searchParams.get('v') !== '1') return {}
    const server = parsed.searchParams.get('server') ?? undefined
    return server === undefined ? {} : { server }
  } catch {
    return {}
  }
}
