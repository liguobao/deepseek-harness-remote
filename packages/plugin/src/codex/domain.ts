import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { CodexAppFrameData, CodexAppStreamClosedData } from '@dsh-remote/protocol'
import type { ResolvedCodexConfig } from '../config.js'
import type { PeerConnectionContext } from '../connection-controller.js'
import type { SafeLogger } from '../logging.js'
import { RpcError } from '../safe-error.js'
import {
  CodexAppServerClient,
  CodexAppServerError,
  type CodexAppServerInbound,
  type CodexAppServerLike,
} from './app-server.js'
import {
  isThreadMutation,
  parseCodexCall,
  threadIdFromParams,
  type AllowedCodexAppMethod,
} from './method-policy.js'
import { CodexPathPolicy } from './path-policy.js'
import { CodexPeerBridge, type PublishCodexFrame } from './peer-bridge.js'

const APPROVAL_TTL_MS = 5 * 60_000
const DEFAULT_RESTART_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000] as const

interface PendingApproval {
  upstreamId: string | number
  connectionId: string
  threadId: string
  method: 'item/commandExecution/requestApproval' | 'item/fileChange/requestApproval'
  expiresAt: number
}

type AppServerFactory = (binary: string, logger: SafeLogger) => CodexAppServerLike

/**
 * Optional Codex business domain inside the existing Remote Plugin. It shares
 * Remote identity/transport with Harness, but owns its App Server process,
 * method policy, subscriptions, leases, and approval handles.
 */
export class CodexRemoteDomain {
  private appServer?: CodexAppServerLike
  private pathPolicy?: CodexPathPolicy
  private unsubscribeInbound?: () => void
  private unsubscribeUnavailable?: () => void
  private readonly peers = new Map<string, CodexPeerBridge>()
  private readonly turnOwners = new Map<string, string>()
  private readonly approvals = new Map<string, PendingApproval>()
  private approvalExpiryTimer?: ReturnType<typeof setTimeout>
  private restartTimer?: ReturnType<typeof setTimeout>
  private restartAttempt = 0
  private available = false
  private closed = false
  private state: 'disabled' | 'starting' | 'ready' | 'restarting' | 'unavailable' = 'disabled'
  private unavailableCode?: string

  constructor(
    readonly config: ResolvedCodexConfig,
    private readonly logger: SafeLogger,
    private readonly createAppServer: AppServerFactory = (binary, targetLogger) => new CodexAppServerClient(binary, targetLogger),
    private readonly restartDelaysMs: readonly number[] = DEFAULT_RESTART_DELAYS_MS,
  ) {}

  async start(): Promise<void> {
    if (this.closed) throw new RpcError('CODEX_CLOSED', 'The Codex Remote domain is closed.')
    if (!this.config.enabled) return
    try {
      this.pathPolicy = await CodexPathPolicy.create(this.config.allowedRoots)
      this.state = 'starting'
      await this.launchAppServer()
    } catch (error) {
      this.available = false
      this.state = 'unavailable'
      this.unavailableCode = errorCode(error)
      await this.disposeAppServer(this.appServer)
      this.logger.warn('Codex Remote domain unavailable', { code: this.unavailableCode })
    }
  }

  isAvailable(): boolean { return this.available && this.appServer?.isReady() === true }

  status(): {
    enabled: boolean
    available: boolean
    state: 'disabled' | 'starting' | 'ready' | 'restarting' | 'unavailable'
    restartAttempt: number
    error?: string
    allowedRootCount: number
  } {
    return {
      enabled: this.config.enabled,
      available: this.isAvailable(),
      state: this.state,
      restartAttempt: this.restartAttempt,
      ...(this.unavailableCode === undefined ? {} : { error: this.unavailableCode }),
      allowedRootCount: this.pathPolicy?.list().length ?? 0,
    }
  }

  createPeer(context: PeerConnectionContext, publish: PublishCodexFrame): CodexPeerBridge | undefined {
    if (!this.config.enabled || this.pathPolicy === undefined) return undefined
    const bridge = new CodexPeerBridge(this, context, publish, this.logger)
    this.peers.set(context.connectionId, bridge)
    return bridge
  }

  async call(connectionId: string, input: unknown): Promise<unknown> {
    const envelope = parseCallEnvelope(input)
    const call = parseCodexCall(envelope.method, envelope.params)
    this.requireAppServer()

    if (call.method === 'account/read') {
      return sanitizeAccount(await this.callUpstream(call.method, call.params))
    }
    if (call.method === 'thread/list') {
      const params = await this.normalizeThreadList(call.params)
      return this.filterThreadList(await this.callUpstream(call.method, params))
    }
    if (call.method === 'thread/start') {
      const cwd = await this.requirePathPolicy().canonicalizeAllowed(call.params.cwd as string)
      const result = await this.callUpstream(call.method, {
        ...call.params,
        cwd,
        approvalPolicy: 'on-request',
        sandbox: 'workspace-write',
        serviceName: 'deepseek_harness_remote',
      })
      if (extractThread(result)?.id === undefined) {
        throw new RpcError('CODEX_INVALID_RESPONSE', 'Codex App Server returned an invalid thread.')
      }
      return result
    }

    const threadId = threadIdFromParams(call.params)
    const allowedThread = threadId === undefined ? undefined : await this.readAllowedThread(threadId)

    if (call.method === 'thread/read') {
      // assertThreadAllowed already produced a bounded summary, but make the
      // requested read again so includeTurns has its official semantics.
      return this.callUpstream(call.method, call.params)
    }
    if (call.method === 'thread/unsubscribe') {
      const bridge = this.peers.get(connectionId)
      bridge?.removeThreadSubscriptions(threadId!)
      if (this.hasSubscriber(threadId!)) return { status: 'unsubscribed' }
      return this.callUpstream(call.method, call.params)
    }

    let claimed = false
    if (isThreadMutation(call.method) && threadId !== undefined) {
      claimed = this.claimTurn(threadId, connectionId, call.method)
    }
    try {
      const upstreamParams = call.method === 'thread/resume' && allowedThread !== undefined
        ? {
            ...call.params,
            cwd: allowedThread.cwd,
            approvalPolicy: 'on-request',
            sandbox: 'workspace-write',
          }
        : call.method === 'thread/fork' && allowedThread !== undefined
          ? {
              ...call.params,
              cwd: allowedThread.cwd,
              approvalPolicy: 'on-request',
              sandbox: 'workspace-write',
            }
        : call.method === 'turn/start' && allowedThread !== undefined
          ? {
              ...call.params,
              cwd: allowedThread.cwd,
              approvalPolicy: 'on-request',
              sandboxPolicy: {
                type: 'workspaceWrite',
                writableRoots: [allowedThread.cwd],
                networkAccess: false,
                excludeTmpdirEnvVar: false,
                excludeSlashTmp: false,
              },
            }
          : call.params
      let result: unknown
      try {
        result = await this.callUpstream(call.method, upstreamParams)
      } catch (error) {
        // App Server rejects thread/resume when this process already has the
        // thread loaded. Remote callers should be able to resume defensively
        // before every turn, including immediately after thread/start.
        if (call.method === 'thread/resume'
          && allowedThread !== undefined
          && error instanceof RpcError
          && error.code === 'CODEX_UPSTREAM_ERROR') {
          return { thread: allowedThread.thread }
        }
        throw error
      }
      if (call.method === 'thread/resume' || call.method === 'thread/fork' || call.method === 'thread/unarchive') {
        await this.assertResultThreadAllowed(result)
      }
      return result
    } catch (error) {
      if (claimed && threadId !== undefined) this.turnOwners.delete(threadId)
      throw mapAppServerError(error)
    }
  }

  async respond(connectionId: string, input: unknown): Promise<{ resolved: true }> {
    await this.expireApprovals()
    const params = parseRespond(input)
    const approval = this.approvals.get(params.requestHandle)
    if (approval === undefined || approval.connectionId !== connectionId) {
      throw new RpcError('CODEX_APPROVAL_NOT_FOUND', 'The Codex approval is missing, expired, or belongs to another connection.')
    }
    this.approvals.delete(params.requestHandle)
    this.scheduleApprovalExpiry()
    await this.requireAppServer().respond(approval.upstreamId, { decision: params.decision })
    return { resolved: true }
  }

  async detachPeer(connectionId: string): Promise<void> {
    const bridge = this.peers.get(connectionId)
    if (bridge !== undefined) this.peers.delete(connectionId)
    for (const [threadId, owner] of this.turnOwners) {
      if (owner === connectionId) this.turnOwners.delete(threadId)
    }
    const appServer = this.appServer
    const pending = [...this.approvals.entries()].filter(([, approval]) => approval.connectionId === connectionId)
    for (const [handle, approval] of pending) {
      this.approvals.delete(handle)
      await appServer?.respond(approval.upstreamId, { decision: 'decline' }).catch(() => undefined)
    }
    this.scheduleApprovalExpiry()
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.available = false
    this.state = this.config.enabled ? 'unavailable' : 'disabled'
    if (this.restartTimer !== undefined) clearTimeout(this.restartTimer)
    this.restartTimer = undefined
    for (const bridge of [...this.peers.values()]) await bridge.closeAll()
    this.peers.clear()
    this.turnOwners.clear()
    if (this.approvalExpiryTimer !== undefined) clearTimeout(this.approvalExpiryTimer)
    this.approvalExpiryTimer = undefined
    this.approvals.clear()
    this.unsubscribeInbound?.()
    this.unsubscribeInbound = undefined
    this.unsubscribeUnavailable?.()
    this.unsubscribeUnavailable = undefined
    await this.appServer?.close()
    this.appServer = undefined
  }

  private async launchAppServer(): Promise<void> {
    let lastError: unknown
    for (const binary of codexBinaryCandidates(this.config.binary)) {
      try {
        await this.launchAppServerCandidate(binary)
        return
      } catch (error) {
        lastError = error
        if (!canTryNextBinary(error)) throw error
      }
    }
    throw lastError ?? new RpcError('CODEX_START_FAILED', 'Codex App Server could not be started.')
  }

  private async launchAppServerCandidate(binary: string): Promise<void> {
    const appServer = this.createAppServer(binary, this.logger)
    this.appServer = appServer
    this.unsubscribeInbound = appServer.onInbound(message => {
      void this.handleInbound(message).catch(error => {
        this.logger.warn('Codex inbound handling failed', { code: errorCode(error) })
      })
    })
    this.unsubscribeUnavailable = appServer.onUnavailable(code => {
      if (this.available && this.appServer === appServer) {
        void this.handleAppServerUnavailable(appServer, code)
      }
    })
    try {
      await appServer.start()
      const account = await appServer.call('account/read', { refreshToken: false }, 15_000)
      if (!accountCanRun(account)) {
        throw new RpcError('CODEX_AUTH_REQUIRED', 'Codex is not signed in on this Host.')
      }
      if (this.closed || this.appServer !== appServer) {
        await appServer.close().catch(() => undefined)
        return
      }
      this.available = true
      this.state = 'ready'
      this.restartAttempt = 0
      this.unavailableCode = undefined
      this.logger.info('Codex Remote domain ready', { allowedRootCount: this.requirePathPolicy().list().length })
    } catch (error) {
      await this.disposeAppServer(appServer)
      throw error
    }
  }

  private async handleAppServerUnavailable(appServer: CodexAppServerLike, code: string): Promise<void> {
    if (this.closed || this.appServer !== appServer) return
    this.available = false
    this.state = 'restarting'
    this.unavailableCode = code
    this.turnOwners.clear()
    this.approvals.clear()
    if (this.approvalExpiryTimer !== undefined) clearTimeout(this.approvalExpiryTimer)
    this.approvalExpiryTimer = undefined
    await Promise.all([...this.peers.values()].map(peer => peer.failStreams('failed')))
    await this.disposeAppServer(appServer)
    this.scheduleRestart()
  }

  private scheduleRestart(): void {
    if (this.closed || this.restartTimer !== undefined) return
    if (this.restartAttempt >= this.restartDelaysMs.length) {
      this.state = 'unavailable'
      this.logger.warn('Codex App Server restart attempts exhausted', { attempts: this.restartAttempt })
      return
    }
    const delayMs = Math.max(0, this.restartDelaysMs[this.restartAttempt] ?? 0)
    this.restartAttempt += 1
    this.state = 'restarting'
    this.restartTimer = setTimeout(() => {
      this.restartTimer = undefined
      void this.restartAfterFailure()
    }, delayMs)
    this.restartTimer.unref?.()
    this.logger.warn('Codex App Server restart scheduled', { attempt: this.restartAttempt, delayMs })
  }

  private async restartAfterFailure(): Promise<void> {
    if (this.closed) return
    try {
      await this.launchAppServer()
    } catch (error) {
      this.available = false
      this.state = 'restarting'
      this.unavailableCode = errorCode(error)
      this.logger.warn('Codex App Server restart failed', {
        attempt: this.restartAttempt,
        code: this.unavailableCode,
      })
      this.scheduleRestart()
    }
  }

  private async disposeAppServer(appServer: CodexAppServerLike | undefined): Promise<void> {
    if (appServer === undefined || this.appServer !== appServer) return
    this.unsubscribeInbound?.()
    this.unsubscribeInbound = undefined
    this.unsubscribeUnavailable?.()
    this.unsubscribeUnavailable = undefined
    this.appServer = undefined
    await appServer.close().catch(() => undefined)
  }

  private async handleInbound(message: CodexAppServerInbound): Promise<void> {
    if (!this.available) return
    if (message.kind === 'request') {
      await this.handleServerRequest(message)
      return
    }
    const threadId = extractThreadId(message.params)
    if (message.method === 'turn/completed' && threadId !== undefined) this.turnOwners.delete(threadId)
    if (message.method === 'serverRequest/resolved') this.resolveUpstreamApproval(message.params)
    if (threadId === undefined) return
    await Promise.all([...this.peers.values()].map(peer => peer.publishInbound(threadId, {
      method: message.method,
      params: message.params,
    })))
  }

  private async handleServerRequest(message: Extract<CodexAppServerInbound, { kind: 'request' }>): Promise<void> {
    const appServer = this.requireAppServer()
    await this.expireApprovals()
    if (message.method !== 'item/commandExecution/requestApproval'
      && message.method !== 'item/fileChange/requestApproval') {
      await appServer.respondError(message.id, -32601, 'This Remote client does not support the server request.')
      return
    }
    const threadId = extractThreadId(message.params)
    const owner = threadId === undefined ? undefined : this.turnOwners.get(threadId)
    const peer = owner === undefined ? undefined : this.peers.get(owner)
    if (threadId === undefined || owner === undefined || peer === undefined || !peer.hasThreadSubscription(threadId)) {
      await appServer.respond(message.id, { decision: 'decline' })
      return
    }
    const requestHandle = randomUUID()
    this.approvals.set(requestHandle, {
      upstreamId: message.id,
      connectionId: owner,
      threadId,
      method: message.method,
      expiresAt: Date.now() + APPROVAL_TTL_MS,
    })
    this.scheduleApprovalExpiry()
    try {
      await peer.publishInbound(threadId, {
        method: message.method,
        params: sanitizeApprovalParams(message.params, requestHandle),
      })
    } catch (error) {
      this.approvals.delete(requestHandle)
      this.scheduleApprovalExpiry()
      await appServer.respond(message.id, { decision: 'decline' }).catch(() => undefined)
      throw error
    }
  }

  private async readAllowedThread(threadId: string): Promise<{ thread: Record<string, unknown>; cwd: string }> {
    const result = await this.callUpstream('thread/read', { threadId, includeTurns: false })
    const thread = extractThread(result)
    if (thread === undefined || thread.id !== threadId || typeof thread.cwd !== 'string') {
      throw new RpcError('CODEX_THREAD_NOT_ALLOWED', 'The Codex thread is not available through this Remote Host.')
    }
    try {
      return { thread, cwd: await this.requirePathPolicy().canonicalizeAllowed(thread.cwd) }
    } catch {
      throw new RpcError('CODEX_THREAD_NOT_ALLOWED', 'The Codex thread is not available through this Remote Host.')
    }
  }

  private async assertResultThreadAllowed(result: unknown): Promise<void> {
    const thread = extractThread(result)
    if (thread === undefined || typeof thread.id !== 'string') {
      throw new RpcError('CODEX_INVALID_RESPONSE', 'Codex App Server returned an invalid thread.')
    }
    if (thread.cwd === undefined) {
      await this.readAllowedThread(thread.id)
      return
    }
    if (!await this.requirePathPolicy().allows(thread.cwd)) {
      throw new RpcError('CODEX_THREAD_NOT_ALLOWED', 'The Codex thread is outside the configured Remote roots.')
    }
  }

  private async normalizeThreadList(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (params.cwd === undefined) return params
    const values = Array.isArray(params.cwd) ? params.cwd : [params.cwd]
    const cwd = await Promise.all(values.map(value => this.requirePathPolicy().canonicalizeAllowed(value as string)))
    return { ...params, cwd: Array.isArray(params.cwd) ? cwd : cwd[0] }
  }

  private async filterThreadList(result: unknown): Promise<unknown> {
    if (!isRecord(result) || !Array.isArray(result.data)) {
      throw new RpcError('CODEX_INVALID_RESPONSE', 'Codex App Server returned an invalid thread list.')
    }
    const allowed: unknown[] = []
    for (const value of result.data) {
      if (!isRecord(value) || typeof value.id !== 'string') continue
      if (await this.requirePathPolicy().allows(value.cwd)) allowed.push(value)
    }
    return { ...result, data: allowed }
  }

  private claimTurn(threadId: string, connectionId: string, method: AllowedCodexAppMethod): boolean {
    const owner = this.turnOwners.get(threadId)
    if (method === 'turn/interrupt') {
      if (owner === undefined) {
        // A replacement connection may recover an already-running persisted
        // turn. Claim only for this explicit mutation; passive viewers still
        // remain observers and cannot steal a live connection's lease.
        this.turnOwners.set(threadId, connectionId)
        return true
      }
      if (owner !== connectionId) throw new RpcError('CODEX_TURN_OWNED', 'Only the connection that started this Codex turn can interrupt it.')
      return false
    }
    if (owner !== undefined && owner !== connectionId) {
      throw new RpcError('CODEX_TURN_OWNED', 'Another Remote connection owns the active Codex turn.')
    }
    if (owner === connectionId) return false
    this.turnOwners.set(threadId, connectionId)
    return true
  }

  private hasSubscriber(threadId: string): boolean {
    return [...this.peers.values()].some(peer => peer.hasThreadSubscription(threadId))
  }

  private resolveUpstreamApproval(params: unknown): void {
    if (!isRecord(params) || (typeof params.requestId !== 'string' && typeof params.requestId !== 'number')) return
    for (const [handle, approval] of this.approvals) {
      if (approval.upstreamId === params.requestId) this.approvals.delete(handle)
    }
  }

  private async expireApprovals(): Promise<void> {
    const now = Date.now()
    const appServer = this.appServer
    for (const [handle, approval] of this.approvals) {
      if (approval.expiresAt > now) continue
      this.approvals.delete(handle)
      await appServer?.respond(approval.upstreamId, { decision: 'decline' }).catch(() => undefined)
    }
    this.scheduleApprovalExpiry()
  }

  private scheduleApprovalExpiry(): void {
    if (this.approvalExpiryTimer !== undefined) clearTimeout(this.approvalExpiryTimer)
    this.approvalExpiryTimer = undefined
    const nextExpiry = Math.min(...[...this.approvals.values()].map(approval => approval.expiresAt))
    if (!Number.isFinite(nextExpiry)) return
    this.approvalExpiryTimer = setTimeout(() => {
      this.approvalExpiryTimer = undefined
      void this.expireApprovals().catch(error => {
        this.logger.warn('Codex approval expiry failed', { code: errorCode(error) })
      })
    }, Math.max(0, nextExpiry - Date.now()))
    this.approvalExpiryTimer.unref?.()
  }

  private requireAppServer(): CodexAppServerLike {
    if (!this.isAvailable() || this.appServer === undefined) {
      throw new RpcError('CODEX_UNAVAILABLE', 'Codex Remote is disabled or unavailable on this Host.')
    }
    return this.appServer
  }

  private async callUpstream(method: string, params: unknown): Promise<unknown> {
    try {
      return await this.requireAppServer().call(method, params)
    } catch (error) {
      throw mapAppServerError(error)
    }
  }

  private requirePathPolicy(): CodexPathPolicy {
    if (this.pathPolicy === undefined) throw new RpcError('CODEX_UNAVAILABLE', 'Codex Remote path policy is unavailable.')
    return this.pathPolicy
  }
}

export type CodexDomainFrame = CodexAppFrameData | CodexAppStreamClosedData

/**
 * Prefer Codex bundled with the current ChatGPT desktop app on macOS when the
 * user kept the default command. Explicit binary configuration is never
 * rewritten or supplemented.
 */
export function codexBinaryCandidates(
  configured: string,
  hostPlatform: NodeJS.Platform = process.platform,
  userHome: string = homedir(),
): string[] {
  if (configured !== 'codex' || hostPlatform !== 'darwin') return [configured]
  return [...new Set([
    '/Applications/ChatGPT.app/Contents/Resources/codex',
    join(userHome, 'Applications', 'ChatGPT.app', 'Contents', 'Resources', 'codex'),
    configured,
  ])]
}

function parseCallEnvelope(input: unknown): { method: string; params: unknown } {
  if (!isRecord(input) || typeof input.method !== 'string' || !('params' in input)
    || Object.keys(input).some(key => key !== 'method' && key !== 'params')) {
    throw new RpcError('INVALID_MESSAGE', 'The Codex call envelope is invalid.')
  }
  return { method: input.method, params: input.params }
}

function parseRespond(input: unknown): { requestHandle: string; decision: 'accept' | 'decline' | 'cancel' } {
  if (!isRecord(input)
    || typeof input.requestHandle !== 'string'
    || !['accept', 'decline', 'cancel'].includes(String(input.decision))
    || Object.keys(input).some(key => key !== 'requestHandle' && key !== 'decision')) {
    throw new RpcError('INVALID_MESSAGE', 'The Codex approval response is invalid.')
  }
  return input as { requestHandle: string; decision: 'accept' | 'decline' | 'cancel' }
}

function accountCanRun(result: unknown): boolean {
  if (!isRecord(result) || typeof result.requiresOpenaiAuth !== 'boolean') return false
  return result.requiresOpenaiAuth === false || isRecord(result.account)
}

function sanitizeAccount(result: unknown): unknown {
  if (!isRecord(result)) throw new RpcError('CODEX_INVALID_RESPONSE', 'Codex App Server returned invalid account state.')
  const account = isRecord(result.account) ? result.account : undefined
  return {
    authenticated: account !== undefined || result.requiresOpenaiAuth === false,
    requiresOpenaiAuth: result.requiresOpenaiAuth === true,
    ...(account === undefined ? {} : {
      account: {
        ...(typeof account.type === 'string' ? { type: account.type } : {}),
        ...(typeof account.planType === 'string' ? { planType: account.planType } : {}),
      },
    }),
  }
}

function extractThread(result: unknown): Record<string, unknown> | undefined {
  return isRecord(result) && isRecord(result.thread) ? result.thread : undefined
}

function extractThreadId(params: unknown): string | undefined {
  if (!isRecord(params)) return undefined
  if (typeof params.threadId === 'string') return params.threadId
  if (isRecord(params.thread) && typeof params.thread.id === 'string') return params.thread.id
  if (isRecord(params.turn) && typeof params.turn.threadId === 'string') return params.turn.threadId
  return undefined
}

function sanitizeApprovalParams(params: unknown, requestHandle: string): unknown {
  if (!isRecord(params)) return { requestHandle }
  const safe = { ...params }
  delete safe.proposedExecpolicyAmendment
  delete safe.additionalPermissions
  safe.availableDecisions = ['accept', 'decline', 'cancel']
  safe.requestHandle = requestHandle
  return safe
}

function mapAppServerError(error: unknown): Error {
  if (error instanceof RpcError) return error
  if (error instanceof CodexAppServerError) {
    return new RpcError(error.code, error.message, undefined, error.code === 'CODEX_REQUEST_TIMEOUT')
  }
  return new RpcError('CODEX_UPSTREAM_ERROR', 'Codex App Server could not complete the request.')
}

function errorCode(error: unknown): string {
  if (error instanceof RpcError || error instanceof CodexAppServerError) return error.code
  return 'CODEX_START_FAILED'
}

function canTryNextBinary(error: unknown): boolean {
  return !(error instanceof RpcError) || !['CODEX_AUTH_REQUIRED', 'CODEX_CLOSED'].includes(error.code)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
