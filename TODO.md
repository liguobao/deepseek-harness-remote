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
- [x] 配合 dsh-file-viewer 的远端只读文件 stat/list/分块预览桥与 Client provider
- [x] 不同 Web Client 同时连接一个 Host；RPC、stream 与断开清理按 connectionId 隔离
- [x] 删除自定义 Session/Agent/Workspace/Permission adapters、event replay 和旧 Host RPC 路由

## P0：Plugin 可用链路

- [ ] 在真实 dsh-desktop 中验证 GitHub 安装、重启、Host/Client 配置和 Bundle 入口
- [ ] 用两台真实 Harness + 外部 Server 跑通同账号授权、选择 Remote、创建/继续会话
- [ ] 验证原生 mux/host stream、approval/question respond 与断线关闭行为
- [ ] 用手机 Web 与电脑 Web 同时连接一个真实 Host，验证并发操作、同设备重连和流隔离
- [ ] 验证 allowlist 覆盖官方 UI 的必需方法；允许已认证 Remote peer 通过官方 seam 管理 Host 实时注册的 settings 命名空间与全局 credential 引用（credential 值只写），并保持 `settings.openDocument`、native path、目录写入、任意文件访问、attachment upload 和 download 禁止
- [ ] 用两台真实 Harness 验证 dsh-file-viewer 文本、图片、PDF、大文件分块与断线回落
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

## VS Code Client

`apps/vscode` 已实现 Extension 基础入口、SecretStorage 连接身份/凭证、账号密码与扫码登录、同账号
Host 列表与 identity fingerprint 固定、Adaptive transport + Noise，以及 Host → Workspace → Session
层级导航和编辑区会话面板。该能力仍是开发者预览，剩余工作：

- [ ] 在真实 VS Code Extension Host、外部 Server 与跨机 Harness Host 上完成 E2E
- [ ] 增加 token 失效恢复与连接断开后的自动重连
- [ ] 接入 mux stream、历史增量、流式聊天、approval/question 响应界面
- [ ] 验证 VSIX 在 macOS、Windows、Linux 的系统 SecretStorage 与代理网络行为

## Browser Launcher

`apps/browser` 只作为 Chrome/Edge 的 Remote Web 入口，不实现第二套完整 Client。它负责
从已登录 Remote Web 换取独立 Browser device credential、在线 Host 列表和打开 Remote Web。

- [x] 收缩为 Web 授权入口和在线 Host 列表，删除扩展内账号/扫码登录、Remote transport 与会话 UI
- [x] 临时读取同源 Web 登录授权，经专用 exchange 接口换取隔离的 Browser device credential，不持久化 Web Token
- [x] 点击在线 Host 后直接打开同源 `/app/remote/{hostId}`，复用浏览器已有 Web 登录状态
- [ ] 加载 unpacked 扩展，联调 Web 授权、presence 刷新和目标 Host 跳转

## Android 恢复开发

`apps/android` 已迁移到当前 ApiProxy-only 数据面：账号登录注册、成员设备列表与 identity key
固定、Adaptive transport + Noise secure channel、`harness.api.call/respond/stream.open/close`
tunnel 与 mux frame 聊天。功能已对标 Web 端 Remote 控制台：新建/继续/归档会话、历史分页、
模型目录与切换、相册图片 Prompt（Host limits 预检 + transfer 分块）、Workspace 管理（创建+只读目录浏览/重命名/删除/排序）、连接详情面板与
传输偏好（Auto/TURN/Relay），以及跟随系统/英文/简体中文语言设置。剩余工作：

- [x] 数据面端到端联调（本地 Server + 真实插件 Host + smoke client）：账号授权、加密 Relay、
      mux 流、会话列表、`host.describe` 透传与 approval `client-response` 应答
- [x] 更新 smoke client：优先选择在线 Host（presence 探测）、按插件 bridge 的嵌套帧类型匹配
      `assistant/chunk`（原实现永远匹配不到）
- [ ] 真机/模拟器 UI E2E：账号登录、设备列表、连接、会话与聊天（本机无 KVM/真机，待有设备环境）
- [ ] 真机验证 Android Photo Picker 多选、超限提示与大图片 transfer
- [ ] 重连后 mux stream 重开与 `session.history` baseline 重建的真机验证
- [ ] WebRTC P2P/TURN 路径真机验证（react-native-webrtc 与 Host werift 互操作）
- [ ] 同步协议 conformance fixtures 到 Android 侧校验

`apps/android` 与 Mock Host 曾作为旧 Remote RPC 原型冻结；现在 Android 直接实现/消费官方
ApiProxy contract，不得在 Plugin Host 恢复 `sessions.*`、`session.send`、
`permissions.respond` 或 `sync.from`。

## 不在本仓库实现

- Server、Remote Web、Admin runtime 及其数据库、队列和部署代码
- Shell、PTY、绕过 dsh-file-viewer provider 的任意文件访问、文件写入、远程桌面或通用 Harness tool RPC
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
