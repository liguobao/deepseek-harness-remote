import { hostname, platform } from 'node:os'
import type { Agent, AgentRegistry, AgentStatus } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent, SessionStore } from '@deepseek-ai/dsh-session'
import type { ApprovalOutcome, ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import type { RemoteMessage } from '@dsh-remote/protocol'
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
import { HOST_CAPABILITIES, RpcRouter } from './rpc-router.js'
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
}

export class HostPluginRuntime {
  readonly events = new EventSequencer()
  readonly pending: PendingApprovals
  readonly sessions: SessionAdapter
  readonly agents: AgentAdapter
  readonly permissions: PermissionAdapter
  readonly router: RpcRouter
  readonly connections: ConnectionController
  private identity?: HostIdentity
  private closed = false

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
    this.router = new RpcRouter(this.sessions, this.agents, this.pending, this.events, () => this.systemInfo())
    this.connections = new ConnectionController(this.identities, this.router, this.pending)
    this.permissions = new PermissionAdapter(
      this.pending,
      this.events,
      sessionId => this.connections.isSessionReachable(sessionId),
      event => { void this.connections.send(event) },
      config.approvalTimeoutMs,
    )
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error('remote runtime is closed')
    this.identity = await this.identities.loadOrCreate(this.config.deviceName)
    this.logger.info('host identity ready', {
      deviceId: shortId(this.identity.deviceId),
      fingerprint: this.identity.fingerprint,
      server: this.config.serverUrl ?? 'not configured',
    })
  }

  currentIdentity(): HostIdentity {
    if (this.identity === undefined) throw new Error('remote runtime has not started')
    return this.identity
  }

  acceptAuthenticatedPeer(channel: AuthenticatedPeerChannel): Promise<void> {
    this.currentIdentity()
    return this.connections.accept(channel)
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
      online: this.connections.isOnline(),
      peerDeviceId: this.connections.peerDeviceId() === undefined ? undefined : shortId(this.connections.peerDeviceId()!),
      trustedPeers: this.identities.listTrustedPeers().length,
      pendingApprovals: this.pending.snapshot().length,
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
      capabilities: [...HOST_CAPABILITIES],
      connectionMode: this.connections.connectionMode(),
      online: this.connections.isOnline(),
    }
  }

  private publish(event: Parameters<EventSequencer['publish']>[0], data: unknown, sessionId?: string): void {
    const message = this.events.publish(event, data, sessionId)
    void this.connections.send(message as RemoteMessage)
  }
}

function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }
