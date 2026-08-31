# Codex Session / History 接入 DSH 展示层——完整需求提示词

> 将本文整体作为编码 Agent 的任务提示词使用。实现前必须阅读仓库根目录的
> `AGENTS.md`、`README.md`、`README.zh.md`、`TODO.md`、`docs/protocol.md`、
> `docs/design/README.md` 以及实际代码；若本文与仓库最新权威协议冲突，先澄清并同步文档，
> 不得凭本文恢复已经废弃的 Harness Remote 业务协议。
>
> 当前实施范围已经收紧为 Remote Plugin Host 与 DSH Desktop Plugin Web Client face。本文保留的
> Android 章节仅作为未来设计输入，不是当前 Plugin-only 第一版的完成条件。

## 任务

在 `deepseek-harness-remote` 仓库中，为 Remote Host 增加本机 Codex App Server 接入能力，
并将 Codex 的 `Thread -> Turn -> Item` 数据投影成 DSH Web 与 Android Client 可以共同展示和操作的
Session / History 视图。

Codex 必须继续作为现有 Remote Plugin 的组成部分，共用其 Host 注册、账号 membership、pinned
peer、Noise channel 和连接生命周期；不得拆成第二个 Plugin 或独立安装包。同时它必须在 Remote
内部保持独立业务领域，代码集中于 `packages/plugin/src/codex/`，使用自己的配置、capability、
RPC/event namespace、订阅、transfer 与 Client state，不得混入 Harness bridge。

这是一个**展示层投影与原生后端路由**功能，不是数据迁移：

- Codex Thread、History、运行状态、模型上下文和授权状态继续由 Codex App Server 保存和管理。
- DSH 只维护跨后端的展示模型、实时事件 reducer 和用户交互入口。
- 展示层发起的继续会话、发送、停止、改名或审批操作必须路由回 Codex App Server。
- 不得把 Codex Thread 写入 DSH SessionStore、Workspace、Harness 日志或任何自造数据库。
- 不得把 Codex Thread 伪装成 Harness rc.2 `ApiProxy` Session 或 alpha Typert Remote Session。

目标入口只有：

1. DSH Desktop 内由 Plugin 注入的 Web Client face。
2. `apps/android` Android Client，以及未来复用同一 Client Core 的原生 Client。

本需求不为 `apps/vscode` 增加 Codex 能力；不要删除现有 VS Code 功能，但不要修改它来完成本任务。
`apps/browser` 仍只是打开独立 Remote Web 的轻量入口，不承载 Codex transport 或会话 UI。
独立 Server、Remote Web 和 Admin runtime 仍属于外部 Server 仓库，不得在当前仓库新增
`apps/server`、`apps/web`、`apps/server-web` 或类似目录。

## 官方契约基线

实现必须以当前官方 Codex App Server 文档和运行时生成的 schema 为准：

- [Codex App Server](https://developers.openai.com/codex/app-server)
- App Server 的核心模型是 `Thread -> Turn -> Item`。
- `thread/list` 用于分页列出持久化 Thread。
- `thread/read` 配合 `includeTurns: true` 用于读取完整持久化历史，且不会自动 resume 或订阅。
- `thread/resume` 用于恢复已有 Thread；`turn/start` 用于发送新的用户输入。
- `item/started`、`item/agentMessage/delta`、`item/completed`、`turn/completed`、
  `thread/status/changed` 等通知用于实时更新展示层。
- `thread/turns/list` 与 `thread/items/list` 当前属于实验能力，不得作为第一版唯一历史路径。
- App Server 可以用 `codex app-server generate-ts` 或 `generate-json-schema` 生成与实际 Codex
  版本一致的 schema。不要手写并假定所有上游 Item 变体永远不变。

App Server 与 Plugin Host 之间第一版只使用默认 stdio JSONL transport。不得把 App Server
WebSocket 监听器暴露到公网、局域网或现有 Server；官方目前仍将 WebSocket transport 标记为
experimental/unsupported。本仓库现有 Noise + Adaptive transport 继续是 Web/Client 到 Host 的唯一
Remote 业务通道。

## 产品目标

用户连接一个 Remote Host 后，应看到两个并列且来源明确的业务入口：

```text
Remote Host
├─ Harness Workspaces / Sessions
└─ Codex Threads
```

Codex 入口必须支持：

1. 展示 Host 本机允许访问的 Codex Thread 列表。
2. 显示 Thread 名称、预览、工作目录、创建/更新时间、归档/置顶状态和运行状态。
3. 打开 Thread 后展示持久化 History。
4. 将用户消息、助手消息、命令执行、MCP/工具调用、文件变更、审批、错误和状态变化投影为
   DSH 风格的统一时间线。
5. 恢复已有 Thread，并继续发送文本 Prompt。
6. 显示助手文本 delta 和工具/文件变更的实时生命周期。
7. 中断当前 Turn。
8. 对 Codex 发出的命令执行、文件变更或工具审批进行单次允许或拒绝。
9. 断线重连后重新读取持久化 baseline，再合并实时事件，保证展示不重不漏。
10. 始终明确标记该 Session 的 `backend` 是 `codex`，避免用户误以为数据已经导入 Harness。

第一版只要求文本 Prompt。图片、附件、语音、动态工具注册、Goal、Review、Skills、模型/Personality
完整设置 UI 可以留作后续能力，但数据模型不得阻止以后新增这些 Item 类型。

## 非目标

以下能力不得在本需求中实现：

- 把 Codex History 导入或复制为真正的 DSH Session。
- 读取、修改或解析 `~/.codex` 内部 JSONL、SQLite 或其它私有存储格式。
- 注册假的 Harness `ApiProxy`、Typert namespace、Session adapter、Workspace adapter 或 permission adapter。
- 将 Codex 原生事件翻译成新的 Host 端 Harness wire format。
- 直接暴露 App Server JSON-RPC、Shell、PTY、`command/exec`、`process/*` 或 `thread/shellCommand`。
- 远程传入 API Key、访问令牌或 `account/login/start(type=apiKey)`。
- `thread/delete`、`thread/inject_items`、任意 `config/*` 写入、任意文件读取或通用进程控制。
- `acceptForSession`、session-scoped permission、execpolicy amendment 或任何超出仓库
  `allow_once | deny` 边界的持久授权。
- 在当前仓库实现独立 Remote Web、Server runtime、Admin、数据库、队列或部署配置。
- 为 `apps/vscode` 增加 Codex Session/History UI。

## 总体架构

```text
DSH Desktop Web Client                    Android Client
         |                                      |
         | loopback control                     | RemoteClientCore
         v                                      v
本机 Plugin ClientModeRuntime --------> 共享 CodexRemoteClient / Projection
                         |
                         | Noise IK + LAN/P2P/TURN/Relay
                         v
                  Remote Host Plugin
                         |
                         | 固定 allowlist 的 Codex carrier
                         v
               CodexAppServerSupervisor
                         |
                         | stdio JSONL
                         v
                  codex app-server
```

保持以下数据所有权：

```text
Codex App Server：Thread、Turn、Item、History、运行状态、模型上下文
Host Plugin：进程生命周期、JSON-RPC correlation、allowlist、订阅路由、限流
Client Core：Codex 原生 DTO、DSH 展示投影、baseline/live 合并、去重
Web/Android：展示状态和短期 UI 交互状态
Server：只中继密文，不保存或理解 Codex 内容
```

## Host App Server 生命周期

新增 Host 级单例 `CodexAppServerSupervisor`，不要为每个 Remote connection 启动一个 App Server：

- 由 Plugin Host 以当前 OS 用户身份启动配置的 `codex` binary。
- 使用 `codex app-server` 默认 stdio transport。
- 每次启动先发送一次 `initialize`，再发送 `initialized`。
- 使用独立且真实的 `clientInfo.name`，例如 `deepseek_harness_remote`；不要冒充 `codex_vscode`。
- 管理本地 JSON-RPC request id，与 Remote 外层 request id 隔离。
- 验证响应 id、响应形态和上游通知形态；未知通知可以安全传给 projector，但不得使进程崩溃。
- 对启动失败、binary 不存在、未登录、版本不兼容、上游退出、过载和请求超时返回稳定的安全错误码。
- App Server 进程不随任意单个 Web/Android connection 断开而结束。
- 支持有界重启和指数退避；重启后不盲目重发 mutation。
- 关闭 Plugin 时终止子进程、清理 pending request 和 subscription。
- 任何日志都不得包含 prompt、history、源码、路径、工具输出、令牌或 App Server 原始 payload。

Plugin 配置至少需要：

```ts
interface CodexRemoteConfig {
  enabled?: boolean
  binary?: string
  allowedRoots?: string[]
}
```

安全默认值：

- `enabled` 默认 `false`，由 Host 本机用户显式启用。
- `binary` 默认 `codex`，不得允许 Remote Client 改写。
- `allowedRoots` 必须在 Host 本机配置；Thread 的 canonical `cwd` 必须位于某个授权根下才可列出、
  读取或操作。没有合法 `cwd` 或越界的 Thread 默认不向 Remote 暴露。
- 路径判定必须使用 canonical path 和目录边界，不能使用字符串前缀比较。

只有 `enabled`、binary 初始化、Codex 账户状态和安全配置均可用时，Host 才宣告 Codex capability。

## Remote capability 与 carrier

在现有加密 capability probe 中增加可选能力：

```text
codex.appserver.v1
codex.appserver.transfer.v1
```

不得把它们命名为 Harness Session capability，也不得要求 Server 理解这些能力的业务 payload。

第一版 Remote RPC 建议为：

```text
codex.app.call
codex.app.respond
codex.app.stream.open
codex.app.stream.close

codex.app.transfer.open
codex.app.transfer.chunk
codex.app.transfer.commit
codex.app.transfer.read
codex.app.transfer.close
```

Remote event 建议为：

```text
codex.app.frame
codex.app.stream.closed
```

`codex.app.call` 的入站 envelope 可以保持官方 `{ method, params }`，但 Host 必须用代码内编译期
固定 allowlist 校验 `method` 和每个 method 的 params schema。它不是通用反射入口。

第一版允许的 App Server method：

```text
account/read
model/list

thread/list
thread/read
thread/start
thread/resume
thread/fork
thread/name/set
thread/archive
thread/unarchive
thread/unsubscribe

turn/start
turn/steer
turn/interrupt
```

是否实际展示改名、归档、fork、模型选择按钮可以分阶段实现，但 Host allowlist 与 params schema 必须
在协议文档中明确。任何未列出 method 必须返回 `METHOD_NOT_ALLOWED`。

明确拒绝：

```text
thread/delete
thread/shellCommand
thread/inject_items
thread/rollback
thread/backgroundTerminals/*
command/*
process/*
config/*
account/login/start(type=apiKey)
动态工具注册和未经显式评审的实验 API
```

### 大 History 传输

`thread/read(includeTurns: true)` 的响应可能超过单条 4 MiB secure message。复用现有 Harness transfer
实现中已验证的分块、canonical base64、严格顺序、恰好一次、连接隔离、超时和清理模式，但使用独立
的 Codex transfer capability 和状态容器：

- 重组后必须再次验证 `{ method, params }` 并经过同一 allowlist，不能借 transfer 绕过检查。
- 响应分块必须绑定发起它的 `connectionId`，另一连接不能读取或关闭。
- 不得因为历史更大而静默提升仓库全局上限；优先复用当前经过协议评审的 transfer 上限，若需要改变，
  必须先同步 `docs/protocol.md`、shared types、limits 和核心测试。
- `thread/turns/list` / `thread/items/list` 只能作为未来实验 capability，不能替代第一版稳定 baseline。

## 多 Client 与订阅隔离

一个 Host 级 App Server stdio connection 需要被多个认证 Remote Client 安全复用：

- Host 维护虚拟 `streamId -> connectionId -> threadId` subscription。
- `thread/read` 只读 baseline，不自动获得操作权。
- 多个 Client 可以同时观察同一 Thread。
- 同一 Thread 同时只允许一个 Remote connection 拥有 active turn mutation lease。
- 由某连接发起 `thread/resume` / `turn/start` 后，该连接成为当前 Turn owner。
- App Server 发出的 server request/approval 只路由给对应 Turn owner。
- `codex.app.respond` 必须携带 Host 生成的 opaque request handle；Host 验证该 handle 确实由同一
  `connectionId` 收到、未过期、未回答且对应当前 Thread/Turn。
- Client 断开时清理其虚拟 subscription。未决审批默认 fail closed；不得自动授予。
- 连接替换、设备撤销、membership 失效和 Noise channel 关闭时，旧 handle 与 stream 立即失效。
- App Server 的全局 notification 不得广播给未订阅对应 Thread 的连接。

## Approval 投影与限制

支持展示下列 Codex server request：

- `item/commandExecution/requestApproval`
- `item/fileChange/requestApproval`
- `item/permissions/requestApproval`（只显示请求并允许返回其受限子集时，必须另做严格 schema 评审）
- `tool/requestUserInput` 或 MCP elicitation 可以先显示为不支持/需要回到 Host，后续再实现。

第一版 Remote 决策只允许：

```text
accept  -> 单次允许
decline -> 拒绝
cancel  -> 取消/拒绝
```

不得允许 `acceptForSession`、session scope、永久网络/文件授权或 execpolicy amendment。即使上游
`availableDecisions` 包含这些值，Remote UI 也不能展示或提交。重复、过期、错误连接或伪造回答必须
fail closed。

## Client Core 展示模型

在 `packages/client-core` 中新增后端无关的展示 DTO。不要直接把 Codex 类型塞进 Android 当前
Harness `RemoteSession`，也不要把 Harness reducer 修改成识别伪造 Codex NativeSessionEvent。

建议类型：

```ts
export type AgentBackend = 'harness' | 'codex'

export interface DisplaySession {
  id: string
  backend: AgentBackend
  nativeId: string
  sessionTreeId?: string
  title?: string
  preview?: string
  cwd?: string
  createdAt: number
  updatedAt: number
  status: 'idle' | 'running' | 'waiting' | 'failed'
  archived?: boolean
  pinned?: boolean
}

export interface DisplayHistoryItem {
  id: string
  sessionId: string
  backend: AgentBackend
  kind:
    | 'message'
    | 'tool'
    | 'file-change'
    | 'approval'
    | 'status'
    | 'error'
    | 'unknown'
  role?: 'user' | 'assistant'
  text?: string
  status?: 'running' | 'completed' | 'failed' | 'declined'
  createdAt?: number
  nativeRef: {
    threadId?: string
    turnId?: string
    itemId?: string
    requestHandle?: string
  }
  details?: Record<string, unknown>
}
```

展示 id 可以使用 `codex:${threadId}` 作为前端 namespace，但调用 App Server 时必须使用保存在
`nativeId` / `nativeRef` 中的原始 ID。不得把带前缀的展示 id 写回 App Server 或 Harness。

## Codex -> DSH 展示投影

实现纯函数 projector，至少覆盖：

| Codex | DSH 展示模型 |
| --- | --- |
| Thread | `DisplaySession` |
| `thread.id` | `nativeId`；展示 id 为 `codex:<id>` |
| `thread.sessionId` | `sessionTreeId`，不得由 thread id 推导 |
| `thread.name` | title |
| `thread.preview` | preview |
| `thread.cwd` | cwd / Workspace 展示分组 |
| active status | running |
| `waitingOnApproval` | waiting |
| user message Item | `kind=message, role=user` |
| agent message Item | `kind=message, role=assistant` |
| agent message delta | 更新同一 assistant message |
| command execution | `kind=tool` |
| MCP / dynamic tool call | `kind=tool` 或 unknown fallback |
| file change | `kind=file-change` |
| approval request | `kind=approval` |
| turn/item failure | `kind=error` 或对应 item 的 failed 状态 |
| 未识别 Item | `kind=unknown`，保留安全摘要 |

Projection 必须：

- 确定性：相同 baseline 得到相同展示 id、顺序和内容。
- 幂等：重复应用 `item/started`、delta、completed 或重连 baseline 不产生重复卡片。
- 保序：优先使用上游 Thread/Turn/Item 顺序和稳定 id，不伪造 Harness seq。
- 容错：未知 Item/notification 不崩溃、不丢失整个 Thread，以 unknown 卡片安全降级。
- 无副作用：projector 不发网络请求、不写文件、不修改原始 Codex对象。
- 脱敏：unknown/details 不得无条件展开任意原始 payload；UI 默认折叠工具输出和路径。

建议新增：

```text
packages/client-core/src/display-session.ts
packages/client-core/src/codex-types.ts
packages/client-core/src/codex-client.ts
packages/client-core/src/codex-projection.ts
packages/client-core/src/codex-event-reducer.ts
```

## Baseline、实时事件与重连

打开 Thread：

```text
thread/read(includeTurns: true)
  -> validate native response
  -> projectThreadToDisplaySession()
  -> projectThreadToHistory()
  -> render baseline
```

继续操作前才执行 `thread/resume`。单纯查看 History 不应改变 App Server 的 loaded/subscription 状态。

实时更新：

```text
item/started
item/agentMessage/delta
item/completed
turn/started
turn/completed
thread/status/changed
server request / approval
  -> 同一 Codex event reducer
  -> DisplayHistoryItem[]
```

断线重连：

1. 重新建立 Control/Noise/Adaptive transport。
2. 重新探测 `codex.appserver.v1`。
3. 对当前 Thread 调用 `thread/read(includeTurns: true)` 获取 persisted baseline。
4. 用 `threadId + turnId + itemId` 与本地 live state 去重合并。
5. 重新打开虚拟 subscription。
6. 如果 Thread 仍 active，再恢复状态展示；不要因为 `thread/resume` 本身不更新时间而误判。
7. 对结果未知的 `turn/start`、rename、archive 等 mutation 不得自动重发；先读 baseline 确认状态。

不要为 Codex 新建第二套永久 replay buffer。Server 不存储 Codex History，Client 本地也不把它当作
权威数据源。

## Web Client face

“Web”指 `packages/plugin/src/client.ts` 注入到 DSH Desktop 的 Plugin Web UI，不是独立 Server
Remote Web。

现有 Web face 主要通过 loopback control route 调用本机 `ClientModeRuntime`。新增明确命名的控制端点：

```text
codex.threads.list
codex.thread.read
codex.thread.start
codex.thread.resume
codex.thread.rename
codex.thread.archive
codex.turn.start
codex.turn.steer
codex.turn.interrupt
codex.approval.respond
codex.events.open
codex.events.next
codex.events.close
```

如果本地 `connection` service 没有已确认的 streaming RPC，不要猜测 API。第一版可以在 loopback
control route 上实现有界 long-poll：

- `events.open` 返回本地 subscription id。
- `events.next` 最多等待 20–25 秒，返回 cursor 后的新事件。
- Web 收到结果后立即发下一次 `events.next`。
- `events.close` 或 Web component unmount 时释放队列。
- 队列必须有界；溢出时返回 full-resync-required，Web 重新读 baseline。

Web UI 建议：

```text
Remote
└─ Host
   ├─ Harness Workspaces
   └─ Codex Threads
      ├─ Thread 列表
      └─ Thread 对话/时间线面板
```

Codex UI 可以复用视觉组件和 `DisplaySession` / `DisplayHistoryItem`，但不得通过假的 ApiProxy 注入
Harness 原生 sessions service。页面必须显示 Codex 来源标记；Tool、file change、unknown details 默认折叠。

## Android Client

Android 通过共享 `CodexRemoteClient` 直接连接 Host carrier，不经过 Desktop loopback control。

建议新增独立状态与页面：

```text
apps/android/src/state/codex-store.ts
apps/android/src/state/codex-event-reducer.ts
apps/android/src/screens/codex-threads-screen.tsx
apps/android/src/screens/codex-chat-screen.tsx
```

若共享 projector 已能直接在 React Native 使用，不要在 Android 再复制一份映射逻辑。现有 Harness
`selectedSession`、History seq、approval 和 message store 保持不变；Codex 使用独立 native state，
最终只通过共享展示 DTO 与组件层汇合。

Android Host 页面显示 Harness 与 Codex 两个入口。Host 未宣告 capability 时不显示可操作 Codex
入口；Host 未安装/未登录/未授权根目录时显示安全、明确且不泄露本机路径的状态。

## 操作路由

展示层操作必须按 `backend` 路由：

```ts
switch (session.backend) {
  case 'harness':
    // 保持现有 ApiProxy / Typert Remote 路径
    break
  case 'codex':
    // 使用 nativeRef.threadId 调用 Codex App Server carrier
    break
}
```

对应关系：

| DSH 展示动作 | Codex App Server |
| --- | --- |
| 列出 Session | `thread/list` |
| 查看 History | `thread/read(includeTurns: true)` |
| 新建 Session | `thread/start` |
| 继续 Session | `thread/resume` |
| 发送消息 | `turn/start` |
| 追加要求 | `turn/steer` |
| 停止 | `turn/interrupt` |
| 改名 | `thread/name/set` |
| 归档/恢复 | `thread/archive` / `thread/unarchive` |

操作按钮可以分阶段交付，但任何已经显示为可用的动作必须走上述原生路由，不得转换成 Harness mutation。

## 安全与隐私要求

- 所有 Codex Remote 业务消息只能进入通过 Server membership、Host trusted peer、Noise IK 和 counter
  防重放验证的现有 secure channel。
- Server 只能看到控制元数据和密文，不能读取 Thread、prompt、history、cwd、源码或工具输出。
- Host capability 只在本机显式启用且 App Server 可用时宣告。
- Thread 必须同时满足连接身份授权与 `allowedRoots` cwd 约束。
- 未知 method、未知 stream、错误 target、错误 connection、重放、跨连接 transfer/request handle、
  identity mismatch 全部 fail closed。
- 不在日志、错误 message、telemetry 或 diagnostics 中写入 Codex payload、prompt、history、源码、工具
  输出、token、私钥或完整本机路径。
- 对外错误使用稳定 code 与固定安全文案；原始 App Server error 只允许经过显式字段白名单后投影。
- Remote 不允许直接传递 App Server account token、API key 或覆盖 Host `codex` binary/config。
- 不新增公网监听端口。
- 不提供 raw shell/PTY/process API。Codex Agent 自身通过 `turn/start` 在其 sandbox/approval 体系中执行
  工作，不等于允许 Remote 直接执行任意命令。
- `thread/shellCommand` 明确禁止，因为它绕过 Thread sandbox 并具有完整本机权限。

## 错误与状态

至少定义并在协议与 UI 中处理：

```text
CODEX_DISABLED
CODEX_BINARY_NOT_FOUND
CODEX_APP_SERVER_START_FAILED
CODEX_APP_SERVER_EXITED
CODEX_AUTH_REQUIRED
CODEX_VERSION_UNSUPPORTED
CODEX_THREAD_NOT_FOUND
CODEX_THREAD_OUTSIDE_ALLOWED_ROOTS
CODEX_THREAD_BUSY
CODEX_APPROVAL_NOT_FOUND
CODEX_APPROVAL_EXPIRED
CODEX_RESPONSE_TOO_LARGE
CODEX_FULL_RESYNC_REQUIRED
CODEX_UPSTREAM_OVERLOADED
```

不要把所有错误折叠成 “request failed”。是否可重试必须由错误类型决定；mutation 结果未知时默认不可
自动重试。

## 预期文件改动

实现前先检索实际结构，以下为建议而非强制文件名：

```text
packages/protocol/src/index.ts
packages/client-core/src/index.ts
packages/client-core/src/display-session.ts
packages/client-core/src/codex-types.ts
packages/client-core/src/codex-client.ts
packages/client-core/src/codex-projection.ts
packages/client-core/src/codex-event-reducer.ts

packages/plugin/src/config.ts
packages/plugin/src/index.ts
packages/plugin/src/service.ts
packages/plugin/src/rpc-router.ts
packages/plugin/src/client-runtime.ts
packages/plugin/src/client.ts
packages/plugin/src/codex-app-server.ts
packages/plugin/src/codex-contract.ts
packages/plugin/src/codex-bridge.ts

apps/android/src/services/...
apps/android/src/state/codex-store.ts
apps/android/src/state/codex-event-reducer.ts
apps/android/src/screens/codex-threads-screen.tsx
apps/android/src/screens/codex-chat-screen.tsx

docs/protocol.md
docs/design/README.md
docs/design/plugin/product-design.md
docs/design/plugin/functional-design.md
README.md
README.zh.md
AGENTS.md
TODO.md
```

不要修改 `apps/vscode` 来完成本需求。不要新增 Server/Remote Web runtime。

## 测试要求

遵守仓库“非核心 UI 不单独写测试”的政策。测试预算只用于本功能的协议、安全和核心状态机：

1. Codex capability 与 wire schema 编解码。
2. App Server JSON-RPC correlation、mismatched id、timeout、退出与 pending cleanup。
3. Host method allowlist 与每个 method 的 params fail-closed 校验。
4. 禁止 `thread/shellCommand`、`command/*`、`process/*`、`config/*`、`thread/inject_items`。
5. transfer 严格顺序、大小、canonical base64、connection isolation 和断线清理。
6. approval request handle 必须来自同一 connection/thread/turn，重复、伪造、过期回答被拒绝。
7. `acceptForSession`、session scope 和 execpolicy amendment 被拒绝。
8. `allowedRoots` canonical path 与目录边界校验，包括符号链接和相似前缀路径。
9. Codex Thread/Turn/Item projector 的确定性、幂等、unknown fallback 和顺序。
10. baseline + live event 去重；重连后 full baseline 不重复消息/tool/file-change。
11. 多 Client 订阅隔离，未订阅连接收不到其它 Thread 事件。
12. mutation lease、断线 fail-closed 和结果未知不自动重发。

纯展示样式、静态文案、普通按钮布局和非关键动画不单独增加测试。

## 文档同步要求

这是仓库范围变化，不能只改代码。实现时同步：

- `README.md` 与 `README.zh.md`：功能、前置条件、安全边界、Host 启用方式和 Web/Android 使用方式。
- `AGENTS.md`：Repository Boundary、结构、Current Status、Implementation Rules、验证基线。
- `TODO.md`：未完成的真实 App Server、Web、Android、重连、多 Client 和 E2E 工作。
- `docs/protocol.md`：capability、RPC、event、limits、allowlist、错误、重连和安全规则。
- `docs/design/README.md` 与 Plugin 产品/功能设计：Codex 是独立数据面，展示层与 Harness 汇合。
- `docs/server.md` / `docs/plugin-integration.md`：仅当 Host capability 或跨仓库契约确实变化时同步，
  不得据此在本仓库新增 Server runtime。

不得把计划目标描述成已经完成；文档状态必须与实际实现和测试一致。

## 分阶段交付

按可验证的纵向切片实施，避免一次性同时改完所有 UI：

### 阶段 1：协议与 Host 只读能力

- App Server supervisor、initialize、account/read。
- capability probe。
- `thread/list`、`thread/read(includeTurns: true)`。
- allowed roots、allowlist、transfer 和安全测试。

验收：真实 Host 可通过现有加密连接列出允许范围内 Thread 并读取完整 History；无 Web/Android UI
也能用测试 Client 验证。

### 阶段 2：共享 Projection

- Codex native DTO。
- `DisplaySession` / `DisplayHistoryItem`。
- baseline projector、live reducer、unknown fallback 和去重测试。

验收：同一 fixture 可稳定投影为 DSH 展示 Session/History，重复 baseline/live 不产生重复项。

### 阶段 3：Desktop Web 展示

- Remote Host 下增加 Codex Threads 入口。
- Thread 列表、History、状态和折叠 Tool/File Change 卡片。
- loopback long-poll 或经确认的本地 stream seam。

验收：DSH Desktop Web 能查看 Host Codex Thread 和实时状态，且不切换/伪造 Harness ApiProxy。

### 阶段 4：Codex 操作

- `thread/start/resume/name/set/archive/unarchive`。
- `turn/start/steer/interrupt`。
- approval 展示与单次回应。
- mutation lease、多 Client 和断线行为。

验收：Web 可在投影 UI 中继续 Codex Thread，所有操作仍由 App Server 执行与持久化。

### 阶段 5：Android Client

- Codex Thread list/chat screens。
- 复用 Client Core projector 和 event reducer。
- Prompt、Stop、approval、重连 baseline。

验收：Android 与 Desktop Web 对同一 Host Thread 显示一致，任一端操作后另一端重新读 baseline 可看到
相同持久化结果。

### 阶段 6：真实 E2E 与收尾

- DSH Desktop Host + Web Client 跨机 E2E。
- Android 真机 Relay、TURN、P2P 路径。
- App Server crash/restart、Host 重启、Client 网络切换、多 Client 并发。
- README、协议、TODO、发布 bundle 与版本同步。

## 验收标准

全部满足才可宣称第一版完成：

1. Host 本机显式启用后，Plugin 通过 stdio 启动并初始化官方 Codex App Server。
2. Host 未启用、未安装、未登录或配置不安全时不宣告 capability。
3. Web 和 Android 能显示允许根目录内的 Codex Thread 列表。
4. `thread/read(includeTurns: true)` History 被稳定投影成 DSH 风格时间线。
5. 用户消息、助手消息、命令、工具、文件变更、审批、错误和 unknown Item 均有安全展示。
6. Display Session 明确标记 `backend=codex`；Codex 数据未写入 Harness SessionStore。
7. 继续、发送、停止、改名和审批均路由回 App Server 原生方法。
8. Host 不提供 raw shell、PTY、process、任意 config 或任意 App Server method。
9. 远程审批只允许单次允许/拒绝，错误连接、伪造和重放被拒绝。
10. 大 History 经过有界、按连接隔离的分块传输。
11. 断线重连通过 baseline + live reducer 恢复，不维护第二套永久 replay buffer。
12. 多 Client 事件和审批严格隔离；Server 无法解密 Codex 内容。
13. 不修改 `apps/vscode` 来提供 Codex UI，不新增当前仓库禁止的 Remote Web/Server runtime。
14. 核心测试、workspace check、bundle 校验、build、test 与 `git diff --check` 通过。
15. README、中文 README、AGENTS、TODO、协议和设计文档与真实实现状态一致。

## 实施与验证要求

实施时：

- 先检查 dirty worktree，保留所有用户已有变更。
- 先按仓库要求构建 `packages/**`，再运行 workspace check/build/test。
- 使用 `apply_patch` 修改文件，不提交 `node_modules`、Expo cache、Android build 产物或个人配置。
- 根包与 Plugin 发布入口规则继续遵守 `AGENTS.md`；需要提交的 bundle 产物按现有脚本生成和验证。
- 不为赶进度削弱 allowlist、trusted peer、membership、Noise、counter、transfer 或 approval 检查。
- 遇到上游 Codex schema 与本文示例不同，以实际 `generate-ts` / `generate-json-schema` 和官方文档为准，
  同步修订本文相关设计，不要用不安全的 `any` 透传掩盖不兼容。

至少运行：

```bash
pnpm install
pnpm --filter './packages/**' -r build
pnpm -r check
node scripts/verify-dsh-plugin.mjs
pnpm -r test
NODE_ENV=production pnpm -r build
git diff --check
```

最后报告：

- 实现了哪些纵向阶段。
- 关键协议、安全和 Projection 决策。
- 运行了哪些验证及结果。
- 仍需真实 Codex/DSH Desktop/Android 环境完成的 E2E。
- 未完成项必须加入 `TODO.md`，不得描述成已完成。
