export async function socketText(data: string | ArrayBuffer | Blob): Promise<string> {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data)
  return new TextDecoder().decode(await data.arrayBuffer())
}

export function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64')
  return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  if (typeof atob === 'function') return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
  return new Uint8Array(Buffer.from(padded, 'base64'))
}
