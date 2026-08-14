# TODO

本清单按当前代码和 2026-08-15 的验证结果维护。优先完成 Host Plugin + Android 的可用纵向链路。Server、Remote Web 和 Admin 只在独立 Server 仓库实现。

优先级定义：

- **P0**：Host Plugin + Android 第一条可用、安全、可恢复的端到端链路所必需
- **P1**：MVP 完整性和跨网络可靠性
- **P2**：Desktop、发布工程和后续体验完善

测试原则：只为协议、安全、状态恢复、权限和关键 transport 等核心逻辑补测试；非核心 UI、展示层和辅助脚本不单独写测试。

## 已完成基线

- [x] 建立 pnpm monorepo 与共享 TypeScript 配置
- [x] 完成 Protocol 基础 envelope、RPC/Event 名称和部分 schema
- [x] 完成 X25519、HKDF-SHA256、ChaCha20-Poly1305 基础原语
- [x] 完成 Host Plugin 的 Harness adapter、身份存储、配对控制、RPC 路由、事件序列、权限 fail-closed 与 doctor 基础能力
- [x] 完成 Android MVP 的 Server 配置、配对、设备、会话、聊天流、停止、权限处理、SecureStore 与基础重连
- [x] 建立 Relay、WebRTC、LAN transport 抽象与 Client Core RPC 基础能力
- [x] 提供依赖外部 Server 的 Mock Host 与 Android smoke client
- [x] 明确仓库边界并保留 Server 设计、Remote Protocol 文档
- [x] `pnpm check`、`pnpm test`、`pnpm build` 全部通过

## P0：协议与安全链路

- [ ] 将 `packages/protocol` 与 `docs/protocol.md` 逐项对齐，补齐 Control、Pairing、Connect、Relay、Signaling、RPC、Event、Error、Capability 和 Limits schema
- [x] 移除代码中的 `allow_session`，v1 权限结果只保留 `allow_once | deny`
- [ ] 实现并固定 `hello` / `hello.ack`、版本拒绝、能力协商和最大消息限制
- [ ] 选定成熟 Noise 实现并完成 `Noise_IK_25519_ChaChaPoly_SHA256` Host/Client 握手
- [ ] 定义握手后 transport key、方向 nonce/counter、rekey、断线销毁和身份绑定规则
- [ ] 增加协议 golden vectors 与跨端 conformance fixture
- [ ] 为加密篡改、防重放、错误身份、counter 越界等核心安全不变量补测试
- [ ] 确保业务 payload 只在认证后的端到端加密 channel 中传输

## P0：Host Plugin 纵向链路

- [ ] 实现真实 Server control connection provider：注册、认证、心跳、指数退避和连接状态上报
- [ ] 把 Pairing Controller 接到外部 Server API，完成 create、claim、Host confirm、过期与取消流程
- [ ] 接入 Noise IK 握手 relay，并只向 RPC Router 暴露认证后的 secure channel
- [ ] 将 Harness session/message/tool/agent 事件稳定映射到 Remote Protocol
- [ ] 完成 `sync.from` 与内存 replay buffer，回放窗口不足时返回全量同步信号
- [ ] 验证 `session.send`、流式 delta、tool events、`session.stop` 的真实 Harness 行为
- [ ] 验证远端权限请求与 Host 本地审批 UI 并存时的首次有效决策和超时行为
- [ ] 完成 Plugin 安装、加载、配置、配对、doctor 的实际用户路径
- [ ] 用真实 Harness + 外部 Server + Android 跑通一条可复现 smoke 流程
- [ ] 只为 RPC 映射、事件恢复和权限竞态等核心路径补测试

## P0：Android 收敛

- [ ] 将现有 Relay secure transport 替换为协议规定的 Noise IK channel
- [x] 跟进 Protocol schema，删除 `Allow session` 的类型与任何兼容分支
- [ ] 接入完整 capability negotiation、`sync.from` 和 replay-window-missed 全量刷新
- [ ] 验证前后台切换、网络变化、Server 重启和 Host 重启后的会话恢复
- [ ] 使用外部 Server 完成真机与 Emulator 端到端验收
- [ ] 生成可安装的 debug APK，记录最小复现和日志采集方式

## P1：Transport 与 Client Core

- [ ] 实现 WebRTC offer/answer/ICE 信令和 trickle ICE
- [ ] 接入 STUN/TURN 配置、短期 TURN credentials 与过期刷新
- [ ] 建立 `connecting -> direct -> relay -> reconnecting -> offline` 状态机
- [ ] 定义 direct 建连超时和 Relay 自动 fallback，切换过程中不得重复 RPC 或丢失已确认事件
- [ ] 实现 ping/pong、RTT、最后活动时间和可观测的连接错误分类
- [ ] 在 Client Core 中实现重连、pending RPC 处置、幂等请求 ID、event cursor 和全量 resync
- [ ] 为 fallback、重复响应、乱序事件、断线恢复等核心状态补测试

## P1：跨仓库 Server 联调

以下任务用于约束独立 Server 项目，不在本仓库添加 Server 源码：

- [ ] 将 `docs/server.md` 与 `docs/protocol.md` 作为独立 Server 仓库的实现基线
- [ ] 冻结 v1 REST、Control WebSocket、Relay 和 Signaling 合约
- [ ] 共享 conformance fixtures，并在两边 CI 中验证同一组协议向量
- [ ] 验证 Server 无法解密 Remote RPC、Event、消息内容和权限详情
- [ ] 验证配对码速率限制、过期、单次使用、Host 二次确认与 token rotation
- [ ] 验证独立 Server 项目将 Remote Web、Admin 与 API 作为一个站点实现和交付

## P2：Desktop Client

- [ ] 确认 Desktop 技术栈与 `dsh-desktop` 集成边界
- [ ] 复用 Client Core、协议、视觉 token 和主要 Remote 流程
- [ ] 使用系统 Keychain/Secret Service 保存身份私钥和 refresh token
- [ ] 完成多窗口、系统休眠/唤醒、代理网络和 deep link 配对处理
- [ ] 在 Host Plugin 与 Android 纵向链路稳定后再开始 Desktop 实现

## P2：工程与发布

- [ ] 增加 CI：install、check、核心测试和 build
- [ ] 修复 Android Metro 对 `@noble/hashes/crypto.js` 的 package exports fallback 警告
- [ ] 建立 Protocol 版本发布、兼容矩阵和变更记录
- [ ] 明确根仓库 License、包发布策略和版本号策略
- [ ] 补充 Plugin 安装、自部署 Server 地址配置、Android debug build 和故障排查文档
- [ ] 提供脱敏日志导出；日志不得包含 token、私钥、明文消息或权限详情
- [ ] 形成真实设备上的性能与长连接稳定性基线

## 不在本仓库实现

- Server runtime、Remote Web frontend、Admin backend 与统一站点托管
- Server 数据库模型、migration、队列、rate limiter、邮件或账号系统
- Server Docker image、Kubernetes chart、Terraform 或部署脚本
- 远程 Shell、任意文件浏览、远程桌面、任意 Harness tool RPC
- v1 中的永久授权或 session-wide permission grant

## 第一版完成标准

- [ ] Host Plugin 可安装到真实 DeepSeek Harness，并主动连接外部 Server
- [ ] Android 可通过 8 位配对码完成 Host 二次确认和身份持久化
- [ ] 客户端可查看 Host/Workspace、列出并打开会话、发送消息并接收流式事件
- [ ] 客户端可停止生成，并对权限请求执行 `Allow once` 或 `Deny`
- [ ] WebRTC 不可用时自动切到 Relay，用户能看到真实 transport 状态
- [ ] 网络中断后可通过 event cursor 恢复；回放窗口不足时可安全全量同步
- [ ] Relay 与 Server 日志不能读取业务明文，篡改或重放帧会被拒绝
- [ ] 核心协议、加密、权限、恢复和 fallback 测试通过，workspace check/build 通过
