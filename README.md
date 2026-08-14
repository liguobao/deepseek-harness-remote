# DSH Remote

DSH Remote 是 DeepSeek Harness 的安全远程控制方案。Harness、代码仓库和执行环境始终留在 Host 机器上，已配对的客户端通过受限协议查看会话、继续对话、接收 Agent 流式输出，并处理 Harness 权限请求。

它不是远程桌面、Web Shell、SSH 替代品或通用文件管理器。客户端不能绕过 Harness 调用任意 Shell、文件系统或工具接口。

> DSH Remote 当前是开发预览版本，需要符合 [Server 设计](docs/server.md) 和 [Remote Protocol v1](docs/protocol.md) 的外部 Server。完整 Noise IK 和生产级跨端互操作仍在完善中，请勿用于生产环境。

## 特性

- **Host 保持本地**：Harness 会话、Workspace、提示词和工具输出不迁移到 Server。
- **设备配对**：使用一次性 8 位设备码，Client claim 后必须由 Host 本机确认。
- **设备身份**：Host 和 Client 使用持久 X25519 身份密钥，配对时校验公钥 fingerprint。
- **会话控制**：查看、创建和打开 Harness 会话，发送后续指令并停止生成。
- **实时事件**：接收消息增量、工具调用、Agent 状态和权限请求。
- **权限不扩权**：远端只能为当前 Harness request 选择 `Allow once` 或 `Deny`，默认 fail closed。
- **加密 Relay**：Server 负责协调和转发，不应读取 Remote RPC、Event 或会话业务明文。
- **连接恢复**：客户端处理网络变化和应用前后台切换，并为事件回放与完整同步保留协议能力。
- **自部署契约**：Server、Remote Web 和 Admin 由独立 Server 项目作为同一站点实现。

## 工作方式

```text
DeepSeek Harness
      |
Host Plugin
      |
authenticated encrypted channel
      |
external DSH Remote Server
      |
Android / future Desktop Client
```

Plugin 只建立出站连接，不在 Host 上公开监听 HTTP/WebSocket 端口。Server 负责设备注册、配对协调、在线状态、WebRTC signaling 和加密 Relay，但不能获得 Harness Remote authority；Server membership 与 Host 本地 trusted peer 必须同时成立。

## Host Plugin

`@dsh-remote/plugin` 是 DeepSeek Harness 的 Cordis Plugin，注入现有的 session、agent 和 approval 服务：

```ts
export const inject = ['sessions', 'agents', 'approval']
```

它提供：

- Harness session、agent、workspace 和 approval adapter
- Host 身份与 trusted peer 持久化
- Remote RPC 路由和 capability 限制
- Host 级事件序列与断线回放窗口
- 权限超时、断线和异常时的 fail-closed 处理
- 已认证连接的接入与撤销接口

### 构建

当前 Plugin 通过源码 workspace 使用：

```bash
pnpm install
pnpm --filter @dsh-remote/plugin build
```

构建产物位于 `packages/plugin/dist`。将该 package 交给 DeepSeek Harness 的 Cordis profile/patch loader 加载；Plugin 导出标准的 `name`、`Config` 和 `apply(ctx, config)`。

Plugin 不创建公开端口；它会主动连接配置的 Server，完成设备注册、Token 轮换、WSS 控制面、Relay 与 Noise IK。只有通过 Server membership、本机 trusted peer 和 Noise static identity 三重校验的通道才会进入 Harness RPC。

### 配置

Plugin 可通过 Cordis 配置对象加载：

```ts
{
  enabled: true,
  serverUrl: 'https://dsh.r2049.cn',
  deviceName: 'Workstation',
  forceRelay: false,
  logLevel: 'info',
  approvalTimeoutMs: 120000,
  reconnect: {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    jitter: 0.2
  }
}
```

也可以使用环境变量设置 Server：

```bash
export DSH_REMOTE_SERVER=https://dsh.r2049.cn
```

生产 Server 必须使用 HTTPS/WSS；只有 `localhost`、`127.0.0.1` 和 `::1` 允许开发期 HTTP。

### 配置项

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 是否启用 Plugin |
| `serverUrl` | `DSH_REMOTE_SERVER` | 外部 Remote Server 地址 |
| `deviceName` | Hostname | Host 显示名称 |
| `forceRelay` | `false` | 强制 Relay，用于联调和诊断 |
| `logLevel` | `info` | `debug`、`info`、`warn` 或 `error` |
| `approvalTimeoutMs` | `120000` | Remote approval 等待时间 |
| `reconnect` | 开启 | 指数退避、最大延迟和 jitter |

### 身份与数据

Plugin 将身份保存在 `$DSH_HOME/remote`，未设置 `DSH_HOME` 时使用 `~/.dsh/remote`：

- `device.json`：设备 ID、名称、公钥和 schema 版本
- `device.key`：Host 私钥，权限必须为 `0600`
- `trusted-peers.json`：Host 已确认的 Remote Client
- `server-credentials.json`：当前 Server 的短期 access token 与轮换 refresh token，权限必须为 `0600`

私钥损坏、公私钥不匹配或权限过宽时，Plugin 会拒绝继续使用该身份，而不是静默重建并继承旧信任。

更完整的集成说明见 [Plugin README](packages/plugin/README.md)、[产品设计](docs/design/plugin/product-design.md) 和 [功能设计](docs/design/plugin/functional-design.md)。

## Android Client

Android Client 支持 Server 注册、Token 轮换、设备配对、Host fingerprint 校验、设备和会话浏览、流式聊天、停止生成及权限处理。

`react-native-webrtc` 包含原生代码，因此不能运行在 Expo Go 中，需要 development build：

```bash
pnpm android
pnpm dev:android
```

Android Emulator 访问开发机 Server 时使用 `http://10.0.2.2:8080`；生产环境必须使用 HTTPS/WSS。操作流程：

1. 输入外部 DSH Remote Server 地址。
2. 在 Host Plugin 侧创建一次性配对码。
3. 在 Android Client 输入配对码并核对 Host fingerprint。
4. 在 Host 本机确认 Client 名称和 fingerprint。
5. 打开 Host、Workspace 和 Harness session。

更多说明见 [Android README](apps/android/README.md)。

## Server

Server、Remote Web 和 Admin 不在本仓库实现。独立 Server 项目必须把三者作为一个站点交付，并严格遵守：

- [Server 设计说明](docs/server.md)
- [Remote Protocol v1](docs/protocol.md)

向 Server 项目交接时，至少复制以上两份文档；[产品定义](PRODUCT.md) 和 [共享基础设计](docs/design/shared-foundation.md) 可作为补充背景。

## 安全边界

- Host 私钥和 Client 私钥只能保存在各自设备本地。
- Server credential 不能代替 Host trusted peer，也不能直接调用 Harness RPC。
- Relay payload 必须经过端到端认证加密；TLS/WSS 不是唯一安全边界。
- 设备撤销后，Token、membership 和现有连接都必须失效。
- 日志不得记录 Token、私钥、配对码、完整 prompt、源码或工具输出。
- 当前实现仍在完成标准 Noise IK 握手与跨端 conformance，不应被视为生产级安全发布。

## 文档

- [产品定义](PRODUCT.md)
- [设计系统](DESIGN.md)
- [设计文档索引](docs/design/README.md)
- [项目协作与实现状态](AGENTS.md)
- [工作清单](TODO.md)
