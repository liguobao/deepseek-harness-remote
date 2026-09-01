# CodeX 虚拟 Workspace / Session 接入——完整需求提示词

> 将本文整体作为编码 Agent 的任务提示词使用。实现前必须阅读仓库根目录的
> `AGENTS.md`、`README.md`、`README.zh.md`、`TODO.md`、`docs/protocol.md` 与实际代码。

## 任务

在 `deepseek-harness-remote` 的现有 Remote Plugin 中接入官方 CodeX App Server，并把 CodeX
工作目录、Thread 与 History 暂时伪装成 DSH 原生 Workspace、Session 与 Session Event。

目标不是新增一套 CodeX 页面，而是让 DSH 已有的 Workspace/Session 列表、Conversation Renderer、
Composer、Tool、file change 与 approval UI 直接消费 CodeX 数据。

CodeX 必须继续位于同一个 Remote Plugin 中，并作为 `packages/plugin/src/codex/` 下的独立领域。
不得拆成第二个 Plugin，不修改 DSH 主仓库，不为 Android 或 VS Code 增加本功能，也不得在本仓库
增加 Remote Web、Server 或 Admin runtime。

## 产品入口

本功能只有一个入口：用户从 DSH Desktop 的 Remote 工作区操作进入远端 Host 后，在原有工作区
选择器中选择 CodeX 虚拟工作区。

```text
连接 Remote Host
  -> 选择工作区
     -> Harness Workspace
     -> CodeX virtual Workspace
        -> 进入 DSH 原生 Workspace/Session/Conversation 流程
```

禁止增加本地模式下的 CodeX 切换按钮、独立 CodeX 页面/弹窗/时间线/Composer、第二套 Thread
导航，以及 Android 或 VS Code CodeX 入口。Host 未启用 CodeX、App Server 不可用或 capability
未协商时，Remote 工作区选择器不显示可操作的 CodeX 工作区。

## 数据所有权

这是展示载体，不是数据迁移：

- CodeX App Server 始终保存并管理 Thread、Turn、Item、History、运行状态与审批状态；
- Plugin 只在 Client 进程内维护临时 Workspace/Session 映射与 stream 状态；
- 不得把虚拟 Workspace、Session 或 Event 写入 DSH SessionStore、Workspace 数据库、Harness 日志
  或自建数据库；
- 用户操作必须路由回 CodeX App Server 的白名单方法；
- 退出 CodeX 模式、切换 Host 或断开连接时必须销毁虚拟 carrier、订阅和审批状态；
- 重新进入或重连时重新读取 `thread/list` 与 `thread/read(includeTurns: true)` baseline。

## 架构

```text
DSH 原生 Workspace / Session / Conversation / Composer
                         |
                         | rc.2 ApiProxy 或 alpha Typert target
                         v
             CodeX Virtual Harness（仅内存）
                         |
                         | CodexRemoteClient
                         v
              已认证、端到端加密 Remote channel
                         |
                         v
                 Remote Host Plugin
                         |
                         | 固定 allowlist
                         v
               Codex App Server (stdio)
```

已有 Remote Host 认证、账号 membership、pinned identity、Noise IK、LAN/P2P/TURN/Relay、连接隔离与
固定 App Server allowlist 必须继续复用。Server 只中继密文，不理解 CodeX 内容。

## 虚拟标识

```text
Workspace ID = codex-workspace:project:<projectId>
Session ID   = codex:<threadId>
```

Workspace 只来自 CodeX App Server 的 `project/list`。一个 CodeX project 对应一个虚拟 Workspace；
该 project id 或 project root 能归属的 Thread 对应 Session。Client 不根据 `thread/list.cwd` 合成额外
Workspace。映射只代表当前 CodeX catalog，不创建 DSH 本地记录。

## 官方 CodeX 契约

Host 只通过 stdio 启动 `codex app-server`。实现以当前官方 schema 和运行时生成的 schema 为准，
不得读取或解析 `~/.codex` 的私有 JSONL、SQLite 或其它内部存储。

第一版允许的方法包括 `account/read`、`model/list`、`thread/list`、`thread/read`、`thread/start`、
`thread/resume`、`thread/fork`、`thread/name/set`、`thread/archive`、`thread/unarchive`、
`thread/unsubscribe`、`turn/start`、`turn/steer` 与 `turn/interrupt`。

禁止 raw App Server 代理、Shell、PTY、`command/*`、`process/*`、任意 `config/*`、任意文件读取、
`thread/delete`、`thread/shellCommand`、`thread/inject_items` 与远程 API Key 登录。

`project/list` 是 CodeX Workspace 的唯一来源。`thread/list` 必须经过 Host 项目归属过滤；其它带
`threadId` 的调用必须再次验证该 Thread 属于 CodeX 暴露的 project，不能只信任 Client 发来的 ID。

## DSH 原生数据面

DSH 0.1.x 存在两个兼容面，Plugin 必须复用现有 switch：

1. rc.2：向 `ApiProxySwitch` 提供虚拟 `ApiProxy`；
2. alpha.1/alpha.2：向 `TypertGatewaySwitch` 提供虚拟 carrier target。

禁止修改 DSH 主仓库注册 Session Provider，也不要新增另一套线协议。虚拟 target 只实现原生 UI
实际需要的白名单 endpoint；未知 endpoint 必须返回稳定的 `method-not-found`，不允许回落到 Host
本地 Harness Session。

alpha 基线至少支持 `workspace/list`、`workspace/follow`、`workspace/create`、`session/list`、
`session/create`、`session/fork`、`session/rename`、`workspace/archiveSession`、
`session/modelCatalog`、`session/control`、`session/follow` 与 `$events`。rc.2 至少支持等价的
`workspace.*`、`sessions.*`、events mux/host 与 `respond`。

## History 到原生事件的映射

每次打开 Session 时，调用 `thread/read({ threadId, includeTurns: true })`，按 Turn 和 Item 原顺序生成
单调递增 `seq` 的 DSH 原生事件：

| CodeX 数据 | DSH 原生事件 |
| --- | --- |
| Turn 开始/结束 | `turn/start`、`turn/end` |
| Turn 内步骤 | `step/start`、`step/end` |
| `userMessage` | `user/message` |
| `agentMessage` | `assistant/message` |
| assistant delta | `assistant/chunk` |
| `reasoning` / `plan` 及其 delta | assistant message / 原生 reasoning chunk；Turn plan 同步为 `todo/write` |
| command/MCP/dynamic tool/file change | `tool/call` + `tool/result` |
| command/file output delta、MCP progress | 原位替换同一 `tool/result` 的有界累计内容 |
| file patch update | 只含 path/kind 的文件变更工具卡片；不透传原始 diff |
| Thread status / model reroute | 原生 session status / `request/context` 与 model-selection projection |
| Web Search/Subagent/Image/Compaction/Review Mode | 具有安全摘要的原生 `tool/call` + `tool/result` |
| CodeX error | 可由原生 renderer 安全展示的 assistant/error 事件 |

snapshot 必须包含原生 header、cursor、records、`hasMore` 与安全 projection。未知 Item 不得泄漏原始
对象。实时订阅处理 `turn/started`、`item/started`、`item/completed`、assistant/reasoning/plan
delta、command/file/MCP progress、file patch update、`thread/status/changed`、`model/rerouted`、
`turn/completed` 和 command/file-change approval request。后续 CodeX 新增且尚未识别的 Item 继续安全忽略，
不得把原始对象作为通用 JSON 卡片透传。

断线后以新的 persisted baseline 替换临时 live 状态，不维护第二套永久 replay buffer，不自动重放
任何 mutation。

## 原生操作路由

| DSH 原生动作 | CodeX App Server |
| --- | --- |
| 新建 Session | `thread/start` |
| Fork Session | `thread/fork` |
| Rename Session | `thread/name/set` |
| Archive Session | `thread/archive` |
| 打开既有 Session | `thread/read`; 不得自动 resume |
| Composer 发送 | `thread/resume` 后 `turn/start` |
| 运行中 steer | `turn/steer` + `expectedTurnId` |
| Stop | `turn/interrupt` |
| Approval | Host 的 `codex.app.respond` |

Composer 接受文本和剪贴板粘贴的 PNG、JPEG、WebP、GIF 图片；图片只以受限 base64 input 通过
CodeX transfer 传输，并在 Host 边界转换成 App Server data URL。通用附件、外部 URL、Host path
与 DSH inbox queue 必须明确返回受限错误。远程审批只允许单次 `allow_once` 或 `deny`，不得提供
session-scoped 或永久授权。

## 生命周期与安全

- 虚拟 target 必须按当前选中的 Remote Host 创建，不能调用本机 CodeX；
- 切换回 Harness、切换 Host、退出 Remote、授权清除或连接断开时立即 close；
- 所有 stream、pending waiter、abort listener 和 approval handle 必须释放；
- 多 Client 的 stream 与 approval 必须按加密 connection 隔离；
- Token、私钥、prompt、history、源码、工具输出和完整路径不得写日志；
- 未知 connection、错误 target、重放、identity mismatch 与越权 root 必须 fail closed。

## 实现位置

```text
packages/plugin/src/codex/virtual-harness.ts  # 虚拟原生载体与事件投影
packages/plugin/src/client-runtime.ts         # 创建、切换、销毁 target
packages/plugin/src/client.ts                 # 仅 Remote 工作区选择入口
```

旧的独立 CodeX sidebar、conversation override、timeline 与 composer 代码必须删除，不得只用 CSS 隐藏。

## 测试与验证

核心测试至少覆盖 Workspace 分组与稳定 ID、History 事件顺序与 seq、live delta/completion、Composer
到 `thread/resume + turn/start/steer`、interrupt/rename/fork/archive/approval、未知 endpoint fail closed、
close/abort/断线，以及 rc.2/alpha 原生 schema 兼容。

完成前运行：

```bash
pnpm --filter './packages/**' -r build
pnpm -r check
node scripts/verify-dsh-plugin.mjs
pnpm -r test
NODE_ENV=production pnpm -r build
git diff --check
```

还必须启动两个 DeviceId 不同的 DSH Desktop 实例加载本插件，验证 Remote Host 选择 -> CodeX 工作区
-> 原生 Session 列表 -> 原生 Conversation History -> 原生 Composer 发送 -> 实时回复/审批 -> 退出 Remote。

## 验收标准

1. CodeX 入口只出现在 Remote 工作区选择阶段；
2. 选择后显示 DSH 原生 Workspace、Session、Conversation 和 Composer，不出现独立 CodeX 页面；
3. History 和 live frame 能由原生 renderer 正确消费；
4. 原生操作正确路由回 CodeX App Server；
5. 虚拟记录不进入 DSH SessionStore、Workspace 数据库或 Harness 日志；
6. Host allowlist、CodeX `project/list` authority、membership、identity 固定、Noise 与连接隔离仍然生效；
7. 退出或断线后无残留虚拟 target、stream 或 approval；
8. 不修改 Android、VS Code、Server runtime 或 DSH 主仓库；
9. 核心测试、check、bundle 校验、build、test 与 `git diff --check` 通过；
10. README、中文 README、AGENTS、TODO、协议和本文与真实实现一致。
