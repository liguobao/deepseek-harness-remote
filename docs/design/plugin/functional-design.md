# Harness Remote Plugin 功能设计

状态：Draft v0.1
目标项目：`packages/plugin`

## 1. 已确认的 Harness 接入面

基于当前 DeepSeek Harness 源码确认：

- 插件导出 `name` 与 `apply(ctx)`；消费服务时通过 `inject` 声明。
- 长生命周期网络资源应在 `ctx.effect()` 中创建并返回 disposer。
- `ctx.sessions` 是 `SessionStore`，提供 `list()`、`get(id)`、`create(id?, options?)`。
- `Session` 提供不可变 `header`、`events`、`seq` 和 typed `append()`。
- `ctx.on('session/created')` 与 `ctx.on('session/event')` 可以观察实时会话事件。
- `ctx.agents` 是 `AgentRegistry`，提供 `list()`、`get(id)`、`create()`、`resume()`。
- `Agent` 的用户输入入口是 `followup()` / `steer()`，取消入口是 `cancel()`；具体选择必须按 Agent 状态确定。
- `ctx.on('agent/status')` 可观察 `idle` / `running` 状态。
- approval 是 `ctx.approval` 服务，交互入口是 waterfall 事件 `approval/request`。
- 当前 Harness wire-safe approval outcome 只允许 Client 返回 `allowed-once` 或 `rejected`；`cancelled` 和 `unavailable` 是 Host 结果。
- workspace 服务键为 `ctx.workspaceRegistry`，可通过 `list()`、`get()` 和 session header 的 `cwd` 建立显示关系。
- dsh-desktop 已验证：独立插件可复制到 `$DSH_HOME/profiles/node_modules`，通过一次性 `--patch` 加载，不修改上游 CLI 和用户 patch。
- DSH Desktop 的 GitHub installer 读取仓库根 `package.json`；根包必须声明 `dsh.bundle.patch`，根 patch 的插件名和浏览器 `__ModuleLoader__` ID 都必须等于 `deepseek-harness-remote`。
- Web profile 的 `ctx.apiProxy` 是官方 UI 的 transport-independent Host API；`ctx.connection.rpc` 可提供 loopback-only 插件控制面。
- WebSocket downlink 持有 `apiProxy` service identity，因此可安装稳定 forwarder，并在新连接上按 Local/Remote 目标选择事件源。

## 2. 待验证接入点

以下必须在实现前用真实 Harness profile 做 spike：

- Remote approval answerer 与本机 Web UI answerer 的顺序和并存策略。
- 创建新会话时应调用 `ctx.agents.create()` 的最小模型/工作区配置。
- “停止生成”对当前 Agent 使用 `cancel()` 后的状态与会话事件完整性。
- session event 中不同 content block 到 Remote message/tool 模型的完整映射。
- persisted 但尚未恢复的会话列表是否必须通过 session query/persistence 服务补充。

这些项不得通过虚构 `ctx.permissions`、`ctx.workspace` 或自定义 Agent 方法规避。

## 3. 模块结构

```text
packages/plugin/src/
  index.ts
  config.ts
  service.ts
  identity-store.ts
  pairing-controller.ts
  connection-controller.ts
  client-runtime.ts
  client-secure-transport.ts
  api-proxy-switch.ts
  harness-api-bridge.ts
  remote-api-proxy.ts
  client.ts
  rpc-router.ts
  event-sequencer.ts
  pending-approvals.ts
  logging.ts
  adapters/
    session-adapter.ts
    agent-adapter.ts
    permission-adapter.ts
    workspace-adapter.ts
  bin/
    doctor.ts
```

构建同时生成两个浏览器入口：npm 子包的 `dist/client.js` 注册
`@dsh-remote/plugin`，GitHub 根包提交的 `dist/client.github.js` 注册
`deepseek-harness-remote`。根包还提交 `index.js` 和底层 `dist/index.js`，所以 Desktop 默认
禁用 GitHub build scripts 时仍可直接识别并加载；CI 必须验证这些提交产物与源码构建一致。

Host adapter 方向固定为：`Harness -> adapters -> protocol handlers`。原生 UI 方向固定为：`official apiProxy -> stable switch -> encrypted allowlist bridge -> remote apiProxy`。任何一条路径都不得退化成通用 Cordis/Harness 反射。

## 4. 插件生命周期

建议声明：

```ts
export const name = 'dsh-remote'
export const inject = ['sessions', 'agents', 'approval']
```

`workspaceRegistry` 可作为可选能力，通过 `ctx.inject()` 条件注册；缺失时仍可从 `session.header.cwd` 返回基础 workspace 信息。

`apply(ctx, config)` 的职责：

1. 校验配置，不进行网络阻塞。
2. 注册 session、agent 和 approval 监听器。
3. 在 `ctx.effect()` 中加载身份、启动连接与心跳。
4. disposer 顺序关闭新请求入口、拒绝 pending approval、关闭传输、停止定时器并 flush 非敏感日志。

## 5. 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `role` | `both` | `host`、`client` 或 `both` |
| `serverUrl` | 构建时默认值 | 必须允许用户覆盖，不写死生产域名 |
| `deviceName` | OS 主机名的可编辑副本 | 仅显示，不作为 ID |
| `forceRelay` | `false` | 联调/故障诊断 |
| `logLevel` | `info` | 禁止记录敏感正文 |
| `approvalTimeoutMs` | `120000` | 超时返回 fail-closed |
| `reconnect` | 开启 | 指数退避上限与 jitter |

## 6. 设备身份存储

默认目录：`$DSH_HOME/remote/`。

```text
device.json       # deviceId/name/publicKey/schemaVersion
device.key        # private key, mode 0600
trusted-peers.json
remote.log
```

Client 角色使用 `$DSH_HOME/remote/client/` 下的独立 device identity、trusted Host 和 Server credential，避免同一个 Server deviceId 同时注册为 Host 与 Client。

## 7. Local / Remote API switch

Plugin 不替换 Cordis `apiProxy` service identity，而是一次性安装稳定 forwarding domain。Local 模式调用启动时捕获的本机 API；Remote 模式调用 `RemoteHarnessApiProxy`。`settings`、`credentials` 和 `downloads` 始终不切到远端。

切换 Remote 前必须完成 Server membership、本地 pinned Host public key、presence 和 Noise IK 校验，并通过 `system.info` 确认 `harness.api.v1`。切换后浏览器刷新以重建官方 mux/host streams。远端 transport 意外关闭时 switch 立即回落 Local，现有 stream 结束，由官方 Connection 重连取得本机 baseline。

控制面独立注册在 loopback-only `/remote` channel，包含 status、device list、pairing claim/status、Host pairing create/confirm 和 mode.set；这些 endpoint 不经过远端 Host，也不能从 Server 调用。

写入采用临时文件 + 原子 rename；启动时校验 schema、权限和公私钥匹配。损坏密钥不得静默重建并继续信任旧 membership，应进入 `IDENTITY_INVALID` 并要求用户显式修复。

## 8. 连接控制器

状态：

```text
DISABLED -> LOADING_IDENTITY -> CONNECTING -> ONLINE
                              -> RECONNECTING -> ONLINE
                              -> OFFLINE
```

连接建立后发送 authenticated hello 和 capability handshake。心跳间隔 20-30 秒；断开使用带 jitter 的指数退避。Server 返回 `DEVICE_REVOKED` 时停止自动重连，等待本机重新配对。

MVP 先启用加密 Relay。连接控制器保留 transport factory，后续按 LAN/P2P/TURN/Relay 降级。

## 9. RPC 路由

所有请求依次经过：

1. envelope/version 校验。
2. secure-channel 认证与 replay 校验。
3. trusted peer 与 membership 校验。
4. capability 校验。
5. 参数 schema 校验。
6. adapter 调用。
7. 标准 response/error 映射。

单连接限制并发 RPC 数，避免远端耗尽 Host 内存。未知方法返回 `METHOD_NOT_FOUND`，不反射内部对象结构。

## 10. Session Adapter

### `sessions.list`

合并 live `ctx.sessions.list()` 与后续确认的持久会话查询源。MVP 至少返回 live sessions：`id`、title、cwd、running、updatedAt。

### `sessions.get`

通过 `ctx.sessions.get(SessionId(id))` 解析 live session，将 `session.events` 和 `session.surface` 投影为 Remote messages/tools。返回当前 `seq`，用于后续增量订阅。

### `sessions.create`

通过 `ctx.agents.create(options)` 创建 Agent + Session，而不是单独调用 `ctx.sessions.create()` 生成没有 driver 的空会话。模型、cwd 和 preset 从显式参数或 Harness 默认配置解析。

### `session.send`

解析 `ctx.agents.get(sessionId)`：

- `idle`：使用 `agent.followup(userMessage)`。
- `running` 且产品语义是补充当前 turn：使用 `agent.steer(userMessage)`。
- 不支持状态返回 `SESSION_NOT_READY`，不直接 `session.append('user/message')` 绕过 Agent inbox。

### `session.stop`

调用目标 Agent 的公开取消能力。RPC 只表示取消已接受；最终状态以 `agent.status` 和会话终止事件为准。

## 11. Streaming 映射

`ctx.on('session/event', (session, event))` 是权威事件源。

| Harness event | Remote event |
| --- | --- |
| `user/message` | `message.created` |
| `assistant/chunk` | `message.delta` |
| `assistant/message` | `message.created` 或流式消息 finalize |
| `tool/call` | `tool.started` |
| `tool/result` | `tool.finished` |
| `approval/asked` | 审计关联，不单独作为交互请求 |
| `approval/decided` | `permission.resolved` |
| `agent/status` | `agent.status` |

每个 Remote event 由 `EventSequencer` 分配 Host 级单调 `seq`，保留 bounded replay buffer。敏感 content 只进入端到端加密 payload。

## 12. Permission Adapter

交互请求来自 `ctx.on('approval/request', ...)`，不是从 `approval/asked` 审计事件反推。

处理流程：

1. 验证存在已认证、订阅该 session 的可信 Client。
2. 生成 Remote `requestId`，保存与 Harness request 的 pending resolver。
3. 发送 `permission.requested`，包含 toolName、callId、reason 和可安全展示的命令上下文。
4. 等待 `permissions.respond`、AbortSignal、Client 断开或超时。
5. `allow_once -> allowed-once`，`deny -> rejected`。
6. 其他状态返回 `unavailable` 或 `cancelled`，始终 fail closed。

`allow_session` 在当前 Harness API 中没有等价 approval outcome。MVP 不宣称支持；只有未来 Harness 提供明确、可审计的 session-scoped grant capability 后才通过 capability handshake 开启。

本机 UI 与 Remote answerer 的并存属于实现前 spike。任何方案都必须保证不会出现两个相互矛盾的最终决定，且本机 `never` policy 永远优先拒绝。

## 13. 配对控制器

- 调用 Server 创建 pairing，展示 code/QR 内容。
- 接收 claim 通知后验证 Client 公钥与 fingerprint。
- Host 确认必须来自本机可信交互面；Remote 请求不能自我确认。
- 确认成功后原子写入 trusted peer。
- 拒绝、过期和错误达到上限后清除 pending 状态。

## 14. 日志和指标

允许记录：connectionId、peer deviceId 的截断形式、transport、持续时间、状态迁移、错误码、P2P/Relay 结果。

禁止记录：token、私钥、共享密钥、完整 prompt、源码、工具输出、TURN 密码和 permission 原始敏感参数。

## 15. 核心测试

- Mock Harness context 验证 RPC 到 adapter 的路由。
- `session/event` 到 Remote event 的顺序和投影。
- Agent idle/running 时 send 的入口选择。
- approval allow/deny/abort/timeout/disconnect 的 fail-closed 行为。
- 插件 unload 清理 pending 和网络资源。
- 身份损坏、设备撤销和重放消息拒绝。

doctor 输出、终端排版、普通配置默认值等非核心功能不单独写测试。

## 16. 实现门槛

进入真实插件实现前必须完成：

1. approval 并存 spike。
2. Agent create/send/stop spike。
3. event content 映射样本。
4. 一份固定的 capability 矩阵。
5. Mock Host 上已跑通相同协议的 Android vertical slice。
