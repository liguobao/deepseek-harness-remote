import { describe, expect, it, vi } from 'vitest'
import type { TypertGatewayLike } from '../src/harness-api-bridge.js'
import { TypertGatewaySwitch } from '../src/typert-gateway-switch.js'

describe('TypertGatewaySwitch', () => {
  it('routes command catalog and execution to the selected Host while leaving other calls local', async () => {
    const localInvoke = vi.fn(async () => 'local')
    const remoteInvoke = vi.fn(async () => 'remote')
    const gateway: TypertGatewayLike = { invoke: localInvoke }
    const target = new TypertGatewaySwitch(gateway)
    const alwaysLocal = target.local()

    target.install()
    await expect(gateway.invoke(command())).resolves.toBe('local')
    await expect(gateway.invoke(commandList())).resolves.toBe('local')
    target.selectRemote(remoteInvoke)
    await expect(gateway.invoke(command())).resolves.toBe('remote')
    await expect(gateway.invoke(commandList())).resolves.toBe('remote')
    await expect(gateway.invoke({ namespace: 'goals', method: 'create', args: { agentId: 's1' } })).resolves.toBe('local')
    await expect(alwaysLocal.invoke(command())).resolves.toBe('local')
    target.selectLocal()
    await expect(gateway.invoke(command())).resolves.toBe('local')
    expect(remoteInvoke).toHaveBeenCalledTimes(2)
  })

  it('returns an empty command catalog for legacy Hosts while forwarding execution', async () => {
    const localInvoke = vi.fn(async () => 'local')
    const remoteInvoke = vi.fn(async () => 'remote')
    const gateway: TypertGatewayLike = { invoke: localInvoke }
    const target = new TypertGatewaySwitch(gateway)

    target.install()
    target.selectRemote(remoteInvoke, { execute: true, list: false })

    await expect(gateway.invoke(command())).resolves.toBe('remote')
    await expect(gateway.invoke(commandList())).resolves.toEqual([])
    expect(remoteInvoke).toHaveBeenCalledOnce()
    expect(localInvoke).not.toHaveBeenCalled()
  })

  it('restores the original gateway method', () => {
    const invoke = vi.fn(async () => undefined)
    const gateway: TypertGatewayLike = { invoke }
    const target = new TypertGatewaySwitch(gateway)
    target.install()
    target.restore()
    expect(gateway.invoke).toBe(invoke)
  })
})

function command(): Parameters<TypertGatewayLike['invoke']>[0] {
  return { namespace: 'commands', method: 'execute', args: { agentId: 's1', line: '/permission danger-full-access', images: [] } }
}

function commandList(): Parameters<TypertGatewayLike['invoke']>[0] {
  return { namespace: 'commands', method: 'list', args: { agentId: 's1' } }
}
