import { hostname, platform } from 'node:os'
import type { Agent, AgentRegistry, AgentStatus } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent, SessionStore } from '@deepseek-ai/dsh-session'
import type { ApprovalOutcome, ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { createEvent, type RemoteEventName, type RemoteMessage } from '@dsh-remote/protocol'
import { AgentAdapter } from './adapters/agent-adapter.js'
import { PermissionAdapter } from './adapters/permission-adapter.js'
import { SessionAdapter } from './adapters/session-adapter.js'
import { WorkspaceAdapter } from './adapters/workspace-adapter.js'
import { ConnectionController } from './connection-controller.js'
import type { ResolvedConfig } from './config.js'
import { EventSequencer } from './event-sequencer.js'
import type { HostIdentity, IdentityStore } from './identity-store.js'
import type { SafeLogger } from './logging.js'
import { PendingApprovals } from './pending-approvals.js'
import { PairingController, PairingError, type PairingClaim } from './pairing-controller.js'
import { HOST_CAPABILITIES, RpcRouter } from './rpc-router.js'
import { HostServerApi, ServerApiError, type HostAccountAuthorization } from './server-api.js'
import { HostServerConnection } from './server-connection.js'
import { ServerCredentialStore } from './server-credentials.js'
import { HarnessApiBridge } from './harness-api-bridge.js'
import type { AuthenticatedPeerChannel } from './types.js'

interface SessionTitleService {
  get(session: Session): { title: string } | undefined
  rename(session: Session, title: string): unknown
}

export interface RuntimeDependencies {
  sessions: SessionStore
  agents: AgentRegistry
  workspaceRegistry?: WorkspaceRegistry
  sessionTitle?: SessionTitleService
  apiProxy?: ApiProxy
}

export interface HostRemoteStatus {
  configured: boolean
  online: boolean
  error?: string
  account?: string
  accountRequired: boolean
}

export class HostPluginRuntime {
  readonly events = new EventSequencer()
  readonly pending: PendingApprovals
  readonly sessions: SessionAdapter
  readonly agents: AgentAdapter
  readonly permissions: PermissionAdapter
  readonly router: RpcRouter
  readonly connections: ConnectionController
  readonly pairings?: PairingController
  private identity?: HostIdentity
  private readonly serverApi?: HostServerApi
  private serverConnection?: HostServerConnection
  private closed = false
  private readonly harnessApiAvailable: boolean

  constructor(
    private readonly config: ResolvedConfig,
    private readonly identities: IdentityStore,
    dependencies: RuntimeDependencies,
    private readonly logger: SafeLogger,
  ) {
    this.pending = new PendingApprovals(config.approvalTimeoutMs, (request, outcome) => {
      this.publish('permission.resolved', {
        requestId: request.requestId,
        sessionId: request.sessionId,
        outcome,
        decision: outcome === 'allowed-once' ? 'allow_once' : outcome === 'rejected' ? 'deny' : undefined,
        resolvedAt: Date.now(),
      }, request.sessionId)
    })
    const workspaces = new WorkspaceAdapter(dependencies.workspaceRegistry)
    this.sessions = new SessionAdapter(
      dependencies.sessions,
      dependencies.agents,
      workspaces,
      this.pending,
      this.events,
      dependencies.sessionTitle,
    )
    this.agents = new AgentAdapter(dependencies.agents, dependencies.sessionTitle)
    const harnessApi = dependencies.apiProxy === undefined ? undefined : new HarnessApiBridge(
      dependencies.apiProxy,
      (event, data) => this.publishHarnessEvent(event, data),
    )
    this.harnessApiAvailable = harnessApi !== undefined
    this.router = new RpcRouter(this.sessions, this.agents, this.pending, this.events, () => this.systemInfo(), harnessApi)
    this.connections = new ConnectionController(this.identities, this.router, this.pending)
    this.permissions = new PermissionAdapter(
      this.pending,
      this.events,
      sessionId => this.connections.isSessionReachable(sessionId),
      event => { void this.connections.send(event) },
      config.approvalTimeoutMs,
    )
    if (config.serverUrl !== undefined) {
      this.serverApi = new HostServerApi(config.serverUrl, new ServerCredentialStore(identities.directory))
      this.pairings = new PairingController(identities, this.serverApi)
    }
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error('remote runtime is closed')
    this.identity = await this.identities.loadOrCreate(this.config.deviceName)
    this.logger.info('host identity ready', {
      deviceId: shortId(this.identity.deviceId),
      fingerprint: this.identity.fingerprint,
      server: this.config.serverUrl ?? 'not configured',
    })
    if (this.serverApi !== undefined && this.pairings !== undefined) {
      this.serverApi.bindIdentity(this.identity)
      this.serverConnection = new HostServerConnection(
        this.config,
        this.identity,
        this.identities,
        this.serverApi,
        this.pairings,
        this.connections,
        this.logger,
      )
      this.serverConnection.start()
    }
  }

  currentIdentity(): HostIdentity {
    if (this.identity === undefined) throw new Error('remote runtime has not started')
    return this.identity
  }

  acceptAuthenticatedPeer(channel: AuthenticatedPeerChannel): Promise<void> {
    this.currentIdentity()
    return this.connections.accept(channel)
  }

  async createPairing() {
    if (this.pairings === undefined || this.serverConnection === undefined) {
      throw new PairingError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before creating a pairing.')
    }
    if (!this.serverConnection.isOnline()) {
      throw new PairingError('HOST_OFFLINE', 'The Host control connection is not online yet.')
    }
    return this.pairings.create()
  }

  pendingPairings(): PairingClaim[] { return this.pairings?.pending() ?? [] }

  hostStatus(): HostRemoteStatus {
    const error = this.serverConnection?.lastError()
    const account = this.serverApi?.currentAccount()
    return {
      configured: this.serverApi !== undefined,
      online: this.serverConnection?.isOnline() ?? false,
      ...(error === undefined ? {} : { error }),
      ...(account === undefined ? {} : { account }),
      accountRequired: error === 'ACCOUNT_AUTH_REQUIRED' || error === 'AUTH_INVALID' || error === 'TOKEN_EXPIRED',
    }
  }

  async authorizeHost(email: string, password: string): Promise<HostAccountAuthorization> {
    if (this.serverApi === undefined) {
      throw new ServerApiError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before signing in.', false)
    }
    const result = await this.serverApi.authorizeHost(this.currentIdentity(), email, password)
    this.serverConnection?.resume()
    this.logger.info('Host account authorized')
    return result
  }

  confirmPairing(pairingId: string, decision: 'approve' | 'deny') {
    if (this.pairings === undefined) throw new PairingError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before confirming a pairing.')
    return this.pairings.confirm(pairingId, decision)
  }

  onSessionCreated(session: Session): void {
    this.publish('session.created', this.sessions.summary(session), String(session.id))
  }

  onSessionEvent(session: Session, event: SessionEvent): void {
    for (const mapped of this.sessions.mapEvent(session, event)) this.publish(mapped.event, mapped.data, mapped.sessionId)
  }

  onAgentStatus(agent: Agent, status: AgentStatus): void {
    const sessionId = String(agent.id)
    this.publish('agent.status', { sessionId, status }, sessionId)
    this.publish('session.updated', this.sessions.summary(agent.session), sessionId)
  }

  answerApproval(request: ApprovalRequest, next: () => Promise<ApprovalOutcome>): Promise<ApprovalOutcome> {
    return this.permissions.answer(request, next)
  }

  async revokePeer(deviceId: string): Promise<boolean> {
    const revoked = await this.identities.revokePeer(deviceId)
    if (revoked) await this.connections.revoke(deviceId)
    return revoked
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.serverConnection?.stop()
    this.pending.failAll('unavailable')
    await this.connections.close()
    this.logger.info('host runtime stopped')
  }

  diagnostics() {
    return {
      loaded: this.identity !== undefined,
      deviceId: this.identity === undefined ? undefined : shortId(this.identity.deviceId),
      identityValid: this.identity !== undefined,
      serverConfigured: this.config.serverUrl !== undefined,
      serverOnline: this.serverConnection?.isOnline() ?? false,
      serverError: this.serverConnection?.lastError(),
      online: this.connections.isOnline(),
      peerDeviceId: this.connections.peerDeviceId() === undefined ? undefined : shortId(this.connections.peerDeviceId()!),
      trustedPeers: this.identities.listTrustedPeers().length,
      pendingApprovals: this.pending.snapshot().length,
      pendingPairings: this.pairings?.pending().length ?? 0,
      lastSeq: this.events.currentSeq(),
    }
  }

  private systemInfo(): Record<string, unknown> {
    const identity = this.currentIdentity()
    return {
      deviceId: identity.deviceId,
      deviceName: identity.name,
      hostname: hostname(),
      os: platform(),
      harnessVersion: 'unknown',
      pluginVersion: '0.1.0',
      protocol: 1,
      capabilities: HOST_CAPABILITIES.filter(capability => capability !== 'harness.api.v1' || this.harnessApiAvailable),
      connectionMode: this.connections.connectionMode(),
      online: this.connections.isOnline(),
    }
  }

  private publish(event: Parameters<EventSequencer['publish']>[0], data: unknown, sessionId?: string): void {
    const message = this.events.publish(event, data, sessionId)
    void this.connections.send(message as RemoteMessage)
  }

  private publishHarnessEvent(event: RemoteEventName, data: unknown): Promise<void> {
    return this.connections.send(createEvent(event, data))
  }
}

function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }
