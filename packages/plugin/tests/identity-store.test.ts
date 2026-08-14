import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { IdentityInvalidError, IdentityStore, serverStorageDirectory } from '../src/identity-store.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('IdentityStore', () => {
  it('creates and reloads one stable device identity', async () => {
    const directory = await temporaryDirectory()
    const first = await new IdentityStore({ directory }).loadOrCreate('Workstation')
    const second = await new IdentityStore({ directory }).loadOrCreate('Renamed workstation')
    expect(second).toMatchObject({ deviceId: first.deviceId, publicKey: first.publicKey, privateKey: first.privateKey, name: 'Renamed workstation' })
    expect(first.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    if (process.platform !== 'win32') {
      expect((await stat(join(directory, 'device.key'))).mode & 0o777).toBe(0o600)
    }
  })

  it('persists trusted peers without private material', async () => {
    const hostDirectory = await temporaryDirectory()
    const clientDirectory = await temporaryDirectory()
    const hostStore = new IdentityStore({ directory: hostDirectory })
    await hostStore.loadOrCreate('Host')
    const client = await new IdentityStore({ directory: clientDirectory }).loadOrCreate('Client')
    await hostStore.trustPeer({ deviceId: client.deviceId, name: client.name, platform: 'linux', publicKey: client.publicKey })
    const stored = await readFile(join(hostDirectory, 'trusted-peers.json'), 'utf8')
    expect(stored).toContain(client.publicKey)
    expect(stored).not.toContain(client.privateKey)
    expect(hostStore.isTrusted(client.deviceId, client.publicKey)).toBe(true)
  })

  it('fails closed for incomplete or overly permissive identity files', async () => {
    const incomplete = await temporaryDirectory()
    await writeFile(join(incomplete, 'device.json'), '{}')
    await expect(new IdentityStore({ directory: incomplete }).loadOrCreate('Host')).rejects.toBeInstanceOf(IdentityInvalidError)

    if (process.platform !== 'win32') {
      const permissive = await temporaryDirectory()
      await new IdentityStore({ directory: permissive }).loadOrCreate('Host')
      await chmod(join(permissive, 'device.key'), 0o644)
      await expect(new IdentityStore({ directory: permissive }).loadOrCreate('Host')).rejects.toThrow(/0600/)
    }
  })

  it('isolates Host and Client identities by normalized Server origin', async () => {
    const root = await temporaryDirectory()
    const firstHost = serverStorageDirectory(root, 'https://one.example.com', 'host')
    const firstClient = serverStorageDirectory(root, 'https://one.example.com', 'client')
    const secondHost = serverStorageDirectory(root, 'https://two.example.com', 'host')
    expect(firstHost).not.toBe(firstClient)
    expect(firstHost).not.toBe(secondHost)
    expect(serverStorageDirectory(root, 'https://one.example.com/', 'host')).toBe(firstHost)
  })
})

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-remote-plugin-'))
  directories.push(directory)
  return directory
}
