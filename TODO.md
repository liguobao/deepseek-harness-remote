# TODO

本清单按 2026-08-16 的 ApiProxy-only Desktop Plugin 方向维护。Android 产品线已恢复开发，
与 Plugin 共享同一 Control/Relay 与 ApiProxy contract；Server、Remote Web 和 Admin 只在独立
Server 仓库实现。

Desktop 已使用独立 Remote 工作区入口：本地选择账号下的 Host 与远端 Workspace，或通过
只读目录浏览添加 Workspace，随后复用原生 Harness UI。当前实现需要真实 Desktop E2E 验证
后才能作为稳定能力发布。

测试预算只用于协议、安全、账号授权、认证连接、ApiProxy allowlist/stream 生命周期和核心
transport 状态机；普通 UI、文案和辅助脚本不单独补测试。

## 已完成基线

- [x] pnpm monorepo、共享 Protocol/Crypto/Transport/Client Core
- [x] Host 账号密码/主机匹配码接入、Client 账号接入、device token rotation 与按 Server/角色隔离的身份状态
- [x] 同账号 membership、受保护 peer descriptor 与本地 pinned trust 双重授权
- [x] Relay control、标准 Noise IK、counter/replay 拒绝与 opaque ciphertext
- [x] Desktop Plugin Host runtime、Settings 配置和 GitHub/npm Bundle 入口
- [x] Host ApiProxy allowlist bridge、mux/host stream 与后台 Local/Remote ApiProxy switch
- [x] Remote 模态框、主机自过滤、OS/Harness/Plugin 版本展示、远端 Workspace 与目录选择
- [x] Remote Header、LAN/P2P/TURN/Relay 链路、端到端加密状态与退出入口
- [x] 不同 Web Client 同时连接一个 Host；RPC、stream 与断开清理按 connectionId 隔离
- [x] 删除自定义 Session/Agent/Workspace/Permission adapters、event replay 和旧 Host RPC 路由

## P0：Plugin 可用链路

- [ ] 在真实 dsh-desktop 中验证 GitHub 安装、重启、Host/Client 配置和 Bundle 入口
- [ ] 用两台真实 Harness + 外部 Server 跑通同账号授权、选择 Remote、创建/继续会话
- [ ] 验证原生 mux/host stream、approval/question respond 与断线关闭行为
- [ ] 用手机 Web 与电脑 Web 同时连接一个真实 Host，验证并发操作、同设备重连和流隔离
- [ ] 验证 allowlist 覆盖官方 UI 的必需方法，并保持 credentials/settings/native path/目录写入/文件内容/附件/download 禁止
- [ ] 在 macOS、Windows、Linux 验证 native picker 只读目录兜底、symlink、权限错误和大目录截断
- [ ] 完善账号过期、`DEVICE_OWNERSHIP_REQUIRED` 和 legacy owner 的显式恢复体验
- [ ] 增加 transport 关闭后 pending unary/stream 的确定错误与可诊断状态

## P0：协议与安全

- [ ] 将 `packages/protocol` 与 `docs/protocol.md` 的 Control、Account Authorization、Connect、Relay、ApiProxy tunnel、Error 和 Limits schema 逐项对齐
- [ ] 清理仅供冻结 Android 原型使用的旧 Session/Event 类型
- [ ] 固定 hello/hello.ack 版本拒绝、能力与最大消息限制
- [ ] 完成 Noise 实现独立安全审查、长期连接 rekey 与断线密钥清理策略
- [ ] 增加 golden vectors 与跨 Server/Plugin conformance fixture
- [ ] 补齐篡改、重放、错误 identity、counter 越界和 relay frame limit 测试

## P1：Transport 与恢复

- [ ] 实现 control heartbeat、RTT、最后活动时间和错误分类
- [x] 完成 WebRTC offer/answer/ICE、STUN/TURN、短期 credential 与 Relay fallback 基础链路
- [ ] 完善 `connecting -> direct -> relay -> reconnecting -> offline` UI 状态机和网络切换恢复
- [ ] 定义 direct 超时和 Relay fallback，切换中不得重复已提交的 ApiProxy mutation
- [ ] 重新连接后重开原生 mux/host stream，并由官方 UI 重新获取 history baseline

## P1：跨仓库 Server 联调

- [ ] 持续同步 `server.md`、`protocol.md` 与 Host Plugin 接入契约
- [ ] 冻结 REST、Control WebSocket、Relay 和 Signaling 合约
- [ ] 在两仓 CI 使用同一组 conformance fixtures
- [ ] 验证 Server 无法解密 ApiProxy payload，且 host registration code/token/membership/IDOR 防护成立

## P2：工程与发布

- [ ] 使用系统 Keychain/Secret Service 保存身份私钥和 refresh token
- [ ] 完成多窗口、休眠/唤醒、代理网络和系统浏览器账号授权
- [ ] 明确版本、License、发布策略与兼容矩阵
- [ ] 提供脱敏日志导出和真实设备长连接性能基线
- [ ] 修复冻结 Android 原型的 Metro exports fallback 警告（仅在恢复 Android 产品线时）

## Android 恢复开发

`apps/android` 已迁移到当前 ApiProxy-only 数据面：账号登录注册、成员设备列表与 identity key
固定、Adaptive transport + Noise secure channel、`harness.api.call/respond/stream.open/close`
tunnel 与 mux frame 聊天。剩余工作：

- [ ] 真机/模拟器与外部 Server + 真实 Host 跑通账号登录、设备列表、连接、会话与聊天 E2E
- [ ] 验证重连后重新打开 mux stream 并由 `session.history` 重建 baseline
- [ ] 验证 WebRTC P2P/TURN 路径（react-native-webrtc 与 Host werift 互操作）
- [ ] 补齐 approval/question 应答的端到端验证（frame rpcId 与 `client-response` 回显）
- [ ] 更新 Mock Host 或新增 Android smoke client，替换旧 Android Remote RPC 联调工具
- [ ] 同步协议 conformance fixtures 到 Android 侧校验

`apps/android` 与 Mock Host 曾作为旧 Remote RPC 原型冻结；现在 Android 直接实现/消费官方
ApiProxy contract，不得在 Plugin Host 恢复 `sessions.*`、`session.send`、
`permissions.respond` 或 `sync.from`。

## 不在本仓库实现

- Server、Remote Web、Admin runtime 及其数据库、队列和部署代码
- Shell、PTY、任意文件读写、远程桌面或通用 Harness tool RPC
- 绕过 ApiProxy allowlist 的 Cordis service 反射

## 第一版完成标准

- [ ] 双角色 Plugin 可安装到真实 DeepSeek Harness 并主动连接外部 Server
- [x] Host 账号授权注册后只使用独立 device credential 常驻
- [x] Desktop Client 使用同账号注册并从授权设备详情固定 Host identity key
- [ ] Desktop Client 在真实原生 UI 打开 Remote Workspace 并退出回到 Local
- [ ] 原生会话、stream、tool、approval/question 通过 ApiProxy tunnel 正常工作
- [ ] 连接断开后旧 stream/answer 失效并安全回落 Local
- [ ] Relay capture 无法解密 payload，篡改、重放和 identity mismatch 被拒绝
- [ ] 核心 check/test/build 与 Bundle 校验通过
