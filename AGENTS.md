# Repository Guide for Agents

本文件面向在当前仓库工作的编码 Agent，记录仓库边界、项目结构、实现状态、验证命令和协作约束。用户产品说明与 Plugin 使用方式见 `README.md`。

## Repository Boundary

当前仓库实现：

- DeepSeek Harness Host Plugin
- Android Client 和未来 Desktop Client
- Protocol、Crypto、WebRTC、Client Core 等共享能力
- 依赖外部 Server 的 Mock Host/Smoke Client
- Server 设计与跨仓库协议契约

当前仓库禁止实现：

- Server runtime、Remote Web、Admin backend/frontend
- Server 数据库、migration、queue、rate limiter
- Server Docker image、Kubernetes、Terraform 或部署目录
- `apps/server`、`apps/server-web`、`apps/web` 等 Server 站点源码

Server、Remote Web 和 Admin 必须由独立 Server 仓库作为同一站点实现。本仓库必须保留 `docs/server.md` 和 `docs/protocol.md`，但不得据此新增 Server runtime。

## Project Structure

```text
apps/
  android/             React Native / Expo Android Client
packages/
  plugin/              DeepSeek Harness Host Plugin
  protocol/            Remote/Control frame 类型和运行时校验
  crypto/              X25519、HKDF、ChaCha20-Poly1305 基础能力
  webrtc/              Relay、WebRTC、LAN transport 抽象
  client-core/         RPC correlation 与 Remote event 分发
examples/
  mock-host/           外部 Server 互操作工具
docs/
  design/              产品与功能设计
  protocol.md          Host/Server/Client 权威线协议
  server.md            独立 Server 仓库设计输入
```

空的 Web/UI 预留目录不应创建。Expo 生成的 `.expo/web` cache、`.webp` 图片格式和 `packages/webrtc` 不属于 Remote Web 项目。

## Current Status

| 模块 | 状态 | 主要剩余工作 |
| --- | --- | --- |
| Host Plugin | 核心 runtime 已实现 | 真实 Server connector、Noise provider、Harness E2E |
| Android | MVP 已实现 | Noise IK、完整 resync、真机/外部 Server E2E |
| Protocol | 基础与 Control frame 已实现 | 完整 Zod schema、limits、golden vectors |
| Crypto | 基础原语已实现 | 标准 Noise IK、rekey、跨端 conformance |
| Relay Transport | Protocol v1 control/relay 已实现 | 心跳、限制协商、断线状态传播 |
| WebRTC | 基础骨架 | signaling、ICE、TURN、自动 fallback |
| Client Core | RPC/Event 基础实现 | reconnect、`sync.from`、full resync、idempotency |
| Mock Host | Protocol v1 联调实现 | 依赖独立 Server 做真实 smoke |
| Desktop | 未开始 | Android/Plugin 纵向链路稳定后开始 |
| Server/Remote Web/Admin | 仅文档 | 只能在独立 Server 仓库实现 |

完整任务和优先级以 `TODO.md` 为准。不得把 TODO 中的目标能力描述成已经完成。

## Development

环境：Node.js 22、pnpm 9.15.4。Android 原生开发还需要 Android Studio、Android SDK 和 JDK。

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

根 `check` 和 `test` 会先执行 `build:packages`，确保 workspace package 从 fresh clone 开始也能解析 `dist` 类型。

常用命令：

```bash
pnpm dev:plugin
pnpm android
pnpm dev:android
DSH_REMOTE_SERVER=ws://127.0.0.1:8080/ws/v1/connect pnpm dev:mock-host
```

Android 不能使用 Expo Go，因为 `react-native-webrtc` 依赖原生模块。

## Validation Baseline

截至 2026-08-15：

- `pnpm check` 通过
- `pnpm test` 通过：19 个测试文件、37 个测试
- `pnpm build` 通过，包括 Android Hermes bundle
- `git diff --check` 通过

已知构建警告：Metro 对 `@noble/hashes/crypto.js` 使用 package exports fallback。该问题记录在 `TODO.md`，不得静默删除说明。

## Implementation Rules

1. `docs/protocol.md` 是线协议权威来源。代码与文档冲突时，先按协议实现；必要的协议澄清必须同步更新文档和共享类型。
2. Plugin 不监听公网端口，只建立出站连接。
3. Remote business message 只能进入已认证的加密 channel；明文、未知 connection、错误 target、重放和 identity mismatch 必须 fail closed。
4. Server membership 与 Host 本地 trusted peer 必须同时成立。
5. v1 permission decision 只允许 `allow_once | deny`，禁止恢复 `allow_session`。
6. 不提供 Shell、PTY、任意文件读写、远程桌面或通用 Harness tool RPC。
7. Token、私钥、配对码、prompt、源码和工具输出不得写日志。
8. 优先复用现有 adapter、transport 和 protocol helper，不在 App 内复制另一套 wire format。
9. 不修改用户已有变更，不提交 `node_modules`、`dist`、Expo cache、Android build 产物或个人 Agent 配置。

## Test Policy

用户要求非核心功能不写 Test。测试预算只用于：

- Protocol 编解码、版本和 schema
- 身份、加密、篡改和重放
- Pairing、Control handshake、Relay authorization
- RPC correlation、权限 fail-closed、事件顺序和恢复
- Transport fallback/reconnect 等核心状态机

纯展示 UI、普通文案、静态说明、非关键脚本和样式调整不单独增加测试。

## Documentation Rules

- `README.md`：面向用户，写项目介绍、特性、安全边界和 Plugin/Client 使用。
- `AGENTS.md`：面向编码 Agent，写仓库结构、进度、命令和实现约束。
- `TODO.md`：未完成任务与优先级。
- `docs/server.md`：独立 Server 项目的产品/功能设计。
- `docs/protocol.md`：跨仓库协议规范。
- `vibe-coding.md`：原始需求背景，当前边界以 `README.md`、`AGENTS.md` 和 `docs/README.md` 为准。

文档发生范围变化时，应同时检查以上入口，避免 README、TODO、设计文档和实际目录互相冲突。
