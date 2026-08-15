# Repository Guide for Agents

本文件面向在当前仓库工作的编码 Agent，记录仓库边界、项目结构、实现状态、验证命令和协作约束。用户产品说明与 Plugin 使用方式见 `README.md`。

## Repository Boundary

当前仓库实现：

- DeepSeek Harness 双角色 Plugin（Remote Host + 本地 Harness Client 模式）
- 冻结的 Android Client 原型（尚未迁移到 ApiProxy-only 数据面）
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
  android/             冻结的 React Native / Expo Android 原型
packages/
  plugin/              双角色 Plugin、原生 API 代理与 Web Client 切换入口
  protocol/            Remote/Control frame 类型和运行时校验
  crypto/              X25519、HKDF、ChaCha20-Poly1305 与 Noise IK
  webrtc/              Relay、WebRTC、LAN transport 抽象
  client-core/         RPC correlation 与 Remote event 分发
examples/
  mock-host/           外部 Server 互操作工具
docs/
  design/              产品与功能设计
  plugin-integration.md Host 账号登录、授权注册与凭证接入契约
  protocol.md          Host/Server/Client 权威线协议
  server.md            独立 Server 仓库设计输入
```

仓库根包同时是 DSH Desktop 的 GitHub 安装边界：根 `package.json` 必须保留
`dsh.bundle.patch`、Host/Client exports 和 `cordis.patch.yml`；GitHub 默认禁用
构建脚本，所以根 `index.js`、`packages/plugin/dist/index.js` 与 `client.github.js` 是需要提交的发布入口。

空的 Web/UI 预留目录不应创建。Expo 生成的 `.expo/web` cache、`.webp` 图片格式和 `packages/webrtc` 不属于 Remote Web 项目。

## Current Status

| 模块 | 状态 | 主要剩余工作 |
| --- | --- | --- |
| Plugin Host | 账号密码/主机匹配码接入、同账号 peer 校验、隔离身份/凭证、Relay/Noise IK 与 ApiProxy allowlist bridge 已实现；无自定义 Harness 业务适配层 | 真实 Harness 跨机 E2E、legacy owner 恢复体验 |
| Plugin Client Mode | 账号接入、自有设备 Host/Client 直接切换、同账号 Host 发现与 key pinning、Local/Remote ApiProxy switch、Settings 与 Web 入口已实现 | 真实 dsh-desktop 安装/E2E、断线重连 |
| Android | 旧 Remote RPC 原型已冻结，与当前 ApiProxy-only Host 不兼容 | 若恢复该产品线，先迁移到 ApiProxy contract |
| Protocol | Control/Relay 与 ApiProxy tunnel 基础已实现 | 清理冻结 Android 的旧类型、完整 Zod schema、limits、golden vectors |
| Crypto | 基础原语与标准 Noise IK 已实现 | 第三方实现审查、rekey、跨端 conformance |
| Relay Transport | Protocol v1 control/relay 已实现 | 心跳、限制协商、断线状态传播 |
| WebRTC | 基础骨架 | signaling、ICE、TURN、自动 fallback |
| Client Core | ApiProxy tunnel RPC/Event 关联基础已实现 | reconnect、pending call/stream 恢复 |
| Mock Host | 旧 Android Remote RPC 联调工具，当前冻结 | 若恢复 Android 再迁移或替换 |
| Desktop | 已复用 Harness Web UI 接入 Plugin Client face | 原生窗口安装与跨机 E2E |
| Server/Remote Web/Admin | 本仓库仅保留文档；独立 Server 仓库已有实现 | runtime 变更只在独立 Server 仓库完成，并同步跨仓库契约 |

完整任务和优先级以 `TODO.md` 为准。不得把 TODO 中的目标能力描述成已经完成。

## Development

环境：Node.js 22、pnpm 9.15.4。Android 原生开发还需要 Android Studio、Android SDK 和 JDK。

```bash
pnpm install
pnpm --filter './packages/**' -r build
pnpm -r check
node scripts/verify-dsh-plugin.mjs
pnpm -r test
NODE_ENV=production pnpm -r build
```

先构建 `packages/**`，确保 workspace package 从 fresh clone 开始也能解析 `dist` 类型。根 `package.json` 刻意不声明 `scripts`，避免 pnpm 将 DSH Desktop 的 GitHub 安装误判为需要执行构建脚本。

常用命令：

```bash
pnpm --filter @dsh-remote/plugin build --watch
pnpm --filter @dsh-remote/android android
pnpm --filter @dsh-remote/android start
DSH_REMOTE_SERVER=ws://127.0.0.1:8080/ws/v1/connect pnpm --filter @dsh-remote/mock-host dev
```

Android 不能使用 Expo Go，因为 `react-native-webrtc` 依赖原生模块。

## Validation Baseline

截至 2026-08-15：

- workspace check 与 DSH bundle 校验通过
- workspace test 通过：24 个测试文件、52 个测试（Plugin 13 个文件、27 个测试）
- workspace build 通过，包括 Android Hermes bundle
- `git diff --check` 通过

已知构建警告：Metro 对 `@noble/hashes/crypto.js` 使用 package exports fallback。该问题记录在 `TODO.md`，不得静默删除说明。

## Implementation Rules

1. `docs/protocol.md` 是线协议权威来源。代码与文档冲突时，先按协议实现；必要的协议澄清必须同步更新文档和共享类型。
2. Plugin 不监听公网端口，只建立出站连接。
3. Remote business message 只能进入已认证的加密 channel；明文、未知 connection、错误 target、重放和 identity mismatch 必须 fail closed。
4. Server membership 与 Host 本地 trusted peer 必须同时成立。
5. v1 permission decision 只允许 `allow_once | deny`，禁止恢复 `allow_session`。
6. 不提供 Shell、PTY、任意文件读写、远程桌面或通用 Harness tool RPC。
7. Token、私钥、主机匹配码、prompt、源码和工具输出不得写日志。
8. Harness 业务层只使用官方 `ApiProxy`；禁止恢复 session/agent/workspace/permission adapter 或另一套 wire format。
9. 不修改用户已有变更，不提交 `node_modules`、Expo cache、Android build 产物或个人 Agent 配置；唯一允许提交的 `dist` 是根 DSH GitHub Bundle 所需的 `packages/plugin/dist/index.js` 与 `client.github.js`，另需保留根 Host 入口 `index.js`。

## Test Policy

用户要求非核心功能不写 Test。测试预算只用于：

- Protocol 编解码、版本和 schema
- 身份、加密、篡改和重放
- Account authorization、Host registration code、Control handshake、Relay authorization
- RPC correlation、权限 fail-closed、事件顺序和恢复
- Transport fallback/reconnect 等核心状态机

纯展示 UI、普通文案、静态说明、非关键脚本和样式调整不单独增加测试。

## Documentation Rules

- `README.md`：面向用户，写项目介绍、特性、安全边界和 Plugin/Client 使用。
- `AGENTS.md`：面向编码 Agent，写仓库结构、进度、命令和实现约束。
- `TODO.md`：未完成任务与优先级。
- `docs/server.md`：独立 Server 项目的产品/功能设计。
- `docs/plugin-integration.md`：Host Plugin 对接独立 Server 的账号认证、设备认证与凭证状态机。
- `docs/protocol.md`：跨仓库协议规范。
- `vibe-coding.md`：原始需求背景，当前边界以 `README.md`、`AGENTS.md` 和 `docs/README.md` 为准。

文档发生范围变化时，应同时检查以上入口，避免 README、TODO、设计文档和实际目录互相冲突。
