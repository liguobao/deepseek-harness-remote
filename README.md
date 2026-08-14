# DSH Remote

DSH Remote 是 DeepSeek Harness 的安全远程控制端。Harness 与工作区始终运行在 Host 机器上，已配对的客户端只通过受限协议查看设备和会话、继续对话、接收流式事件，以及处理权限请求；它不是远程桌面、Web Shell 或通用文件管理器。

> 当前状态：早期开发阶段。Host Plugin 核心和 Android MVP 已有可构建实现；Desktop 和完整 WebRTC/Noise 链路尚未完成。运行端到端流程需要一个符合 [Server 设计](docs/server.md) 与 [Remote Protocol v1](docs/protocol.md) 的外部 Server。

## 仓库边界

本仓库负责：

- DeepSeek Harness Host Plugin
- Android 客户端，以及后续 Desktop 客户端
- `protocol`、`crypto`、`webrtc`、`client-core` 等共享包
- 面向 Plugin/Client 联调的 Mock Host 工具
- Server 产品设计、功能设计与线协议文档

本仓库**不实现 Server、Remote Web 或 Admin**，也不包含 Server 数据库、迁移、Docker 镜像或部署代码。三者由另一个 Server 仓库作为同一站点实现和交付。本仓库中的 Server 文档是跨仓库契约，不代表这里需要增加相关源码。

## 当前进度

| 模块 | 状态 | 当前能力与主要缺口 |
| --- | --- | --- |
| Host Plugin | 核心已实现 | Harness adapter、Host 身份、可信设备、权限 fail-closed、RPC 路由、事件序列与回放已实现；真实 Server 连接器和 Noise IK 纵向联调待完成 |
| Android | MVP 已实现 | Server 配置、配对、设备/会话、聊天流、停止生成、权限处理、基础重连和 Relay 加密已实现；需要开发构建和外部 Server，尚未完成生产级 E2E |
| Protocol | 基础实现 | 已有 envelope、RPC/Event 名称和部分 Zod schema；需要与规范文档逐项收敛并补齐 conformance vectors |
| Crypto | 基础原语 | 已有 X25519、HKDF-SHA256、ChaCha20-Poly1305；完整 `Noise_IK_25519_ChaChaPoly_SHA256` 握手与密钥生命周期尚未完成 |
| WebRTC | 骨架 | 已有 Relay/LAN/WebRTC transport 抽象；信令、ICE、TURN 和自动 fallback 尚未形成完整状态机 |
| Client Core | 基础实现 | 已有 RPC 请求关联、事件分发、超时与关闭处理；重连、`sync.from`、能力协商与全量恢复待完成 |
| Mock Host | 可用于联调 | 可通过外部 Server 完成配对、会话/流式事件和权限交互演示；不是 Server 替代品 |
| Desktop Client | 未开始 | 尚无应用目录 |
| Server / Remote Web / Admin | 仅文档 | 必须在独立 Server 仓库中作为一个站点实现 |

完整工作清单见 [TODO.md](TODO.md)。

## 目录

```text
apps/
  android/             Android Remote Client
packages/
  plugin/              DeepSeek Harness Host Plugin
  protocol/            协议类型、名称与运行时校验
  crypto/              端到端加密基础原语
  webrtc/              Relay / WebRTC / LAN transport 抽象
  client-core/         客户端 RPC 与事件核心
examples/
  mock-host/           依赖外部 Server 的联调 Host
docs/
  server.md            独立 Server 仓库的设计输入
  protocol.md          Host / Server / Client 权威线协议
```

## 环境要求

- Node.js 22
- pnpm 9.15.4（以根 `package.json` 为准）
- Android 开发需要 Android Studio、Android SDK 和可用的 JDK
- Plugin 集成需要兼容 `0.1.0-rc.6` 系列的 DeepSeek Harness 包
- 联调需要符合协议文档的外部 DSH Remote Server

## 开发

安装依赖并验证整个 workspace：

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

### Android

Android 使用 `react-native-webrtc` 原生模块，因此不能运行在 Expo Go 中，必须使用 development build：

```bash
pnpm android
pnpm dev:android
```

Android Emulator 访问开发机服务时使用 `http://10.0.2.2:8080`。客户端只允许 `localhost`、`127.0.0.1` 和 `10.0.2.2` 使用明文 HTTP；生产环境必须使用 HTTPS/WSS。更多说明见 [Android README](apps/android/README.md)。

### Host Plugin

```bash
pnpm --filter @dsh-remote/plugin build
# 或监听源码变化
pnpm dev:plugin
```

Plugin 支持通过配置项 `serverUrl` 或环境变量 `DSH_REMOTE_SERVER` 指定 Server。当前包已经暴露 Harness adapter 与 Remote runtime service，但仍需接入符合协议的已认证连接 provider 才能形成真实远程链路。更多说明见 [Plugin README](packages/plugin/README.md)。

### Mock Host

Mock Host 用于在没有真实 Harness 的情况下验证客户端流程，但仍依赖外部 Server：

```bash
DSH_REMOTE_SERVER=ws://127.0.0.1:8080/ws/v1/connect pnpm dev:mock-host
```

它会创建配对流程并模拟设备、会话、消息流和权限请求。不要把它作为生产 Host 或 Server 使用。

## 文档入口

- [产品定义](PRODUCT.md)
- [视觉与交互设计](DESIGN.md)
- [设计文档索引](docs/design/README.md)
- [Plugin 产品设计](docs/design/plugin/product-design.md)
- [Plugin 功能设计](docs/design/plugin/functional-design.md)
- [共享基础能力设计](docs/design/shared-foundation.md)
- [Server 设计说明](docs/server.md)
- [Remote Protocol v1](docs/protocol.md)
- [原始需求背景（当前仓库边界以本文为准）](vibe-coding.md)

要把 Server 工作交给独立项目，至少复制 `docs/server.md` 和 `docs/protocol.md`；建议同时带上 `PRODUCT.md`、`docs/design/shared-foundation.md` 和 `vibe-coding.md` 作为产品背景与验收参考。

## 安全状态

- Plugin 的私钥默认保存在 `$DSH_HOME/remote` 或 `~/.dsh/remote`，权限异常时拒绝继续使用。
- Remote 权限处理保持 Harness 为最终授权方；远端只提交 `Allow once` 或 `Deny` 决策。
- 客户端不提供任意 Shell、文件系统或通用工具 RPC。
- 当前加密包提供构建块，Android Relay 也有计数器防重放，但完整 Noise IK 握手和跨端 conformance 尚未完成，因此当前版本不应作为生产级安全远程访问方案部署。

## 验证基线

截至 2026-08-15：

- `pnpm check`：通过
- `pnpm test`：通过，共 19 个测试文件、37 个测试
- `pnpm build`：通过，包括 Android Hermes bundle 导出
- Android 构建存在 `@noble/hashes/crypto.js` export fallback 警告，已记录在 TODO 中
