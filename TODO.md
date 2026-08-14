# TODO

本清单按 2026-08-15 的 ApiProxy-only Desktop Plugin 方向维护。当前不投入 Android 产品线；
Server、Remote Web 和 Admin 只在独立 Server 仓库实现。

测试预算只用于协议、安全、配对、认证连接、ApiProxy allowlist/stream 生命周期和核心
transport 状态机；普通 UI、文案和辅助脚本不单独补测试。

## 已完成基线

- [x] pnpm monorepo、共享 Protocol/Crypto/Transport/Client Core
- [x] Host 账号授权注册、device token rotation 与按 Server/角色隔离的身份状态
- [x] 一次性配对码、Host 本机 fingerprint 确认、membership + local trust 双重授权
- [x] Relay control、标准 Noise IK、counter/replay 拒绝与 opaque ciphertext
- [x] Desktop Plugin Host/Client 双角色、Settings 配置和 GitHub/npm Bundle 入口
- [x] 官方 ApiProxy Local/Remote switch、Host allowlist bridge、mux/host stream 与断线回落
- [x] 删除自定义 Session/Agent/Workspace/Permission adapters、event replay 和旧 Host RPC 路由

## P0：Plugin 可用链路

- [ ] 在真实 dsh-desktop 中验证 GitHub 安装、重启、Host/Client 配置和 Bundle 入口
- [ ] 用两台真实 Harness + 外部 Server 跑通授权、配对、选择 Remote、创建/继续会话
- [ ] 验证原生 mux/host stream、approval/question respond 与断线关闭行为
- [ ] 验证 allowlist 覆盖官方 UI 的必需方法，并保持 credentials/settings/native path/目录/附件/download 禁止
- [ ] 完善账号过期、`DEVICE_OWNERSHIP_REQUIRED` 和 legacy owner 的显式恢复体验
- [ ] 增加 transport 关闭后 pending unary/stream 的确定错误与可诊断状态

## P0：协议与安全

- [ ] 将 `packages/protocol` 与 `docs/protocol.md` 的 Control、Pairing、Connect、Relay、ApiProxy tunnel、Error 和 Limits schema 逐项对齐
- [ ] 清理仅供冻结 Android 原型使用的旧 Session/Event 类型
- [ ] 固定 hello/hello.ack 版本拒绝、能力与最大消息限制
- [ ] 完成 Noise 实现独立安全审查、长期连接 rekey 与断线密钥清理策略
- [ ] 增加 golden vectors 与跨 Server/Plugin conformance fixture
- [ ] 补齐篡改、重放、错误 identity、counter 越界和 relay frame limit 测试

## P1：Transport 与恢复

- [ ] 实现 control heartbeat、RTT、最后活动时间和错误分类
- [ ] 完成 WebRTC offer/answer/ICE、STUN/TURN 与短期 credential
- [ ] 建立 `connecting -> direct -> relay -> reconnecting -> offline` 状态机
- [ ] 定义 direct 超时和 Relay fallback，切换中不得重复已提交的 ApiProxy mutation
- [ ] 重新连接后重开原生 mux/host stream，并由官方 UI 重新获取 history baseline

## P1：跨仓库 Server 联调

- [ ] 持续同步 `server.md`、`protocol.md` 与 Host Plugin 接入契约
- [ ] 冻结 REST、Control WebSocket、Relay 和 Signaling 合约
- [ ] 在两仓 CI 使用同一组 conformance fixtures
- [ ] 验证 Server 无法解密 ApiProxy payload，且 pairing/token/membership/IDOR 防护成立

## P2：工程与发布

- [ ] 使用系统 Keychain/Secret Service 保存身份私钥和 refresh token
- [ ] 完成多窗口、休眠/唤醒、代理网络和 deep link 配对
- [ ] 明确版本、License、发布策略与兼容矩阵
- [ ] 提供脱敏日志导出和真实设备长连接性能基线
- [ ] 修复冻结 Android 原型的 Metro exports fallback 警告（仅在恢复 Android 产品线时）

## Android 冻结说明

`apps/android` 和旧 Mock Host 暂时保留作历史原型，不与当前 ApiProxy-only Host 保持运行时
兼容，也不进入第一版验收。若恢复 Android，必须直接实现/消费官方 ApiProxy contract，
不得在 Plugin Host 恢复 `sessions.*`、`session.send`、`permissions.respond` 或 `sync.from`。

## 不在本仓库实现

- Server、Remote Web、Admin runtime 及其数据库、队列和部署代码
- Shell、PTY、任意文件读写、远程桌面或通用 Harness tool RPC
- 绕过 ApiProxy allowlist 的 Cordis service 反射

## 第一版完成标准

- [ ] 双角色 Plugin 可安装到真实 DeepSeek Harness 并主动连接外部 Server
- [x] Host 账号授权注册后只使用独立 device credential 常驻
- [ ] Desktop Client 完成 Host 二次确认并在原生 UI 切换 Local/Remote
- [ ] 原生会话、stream、tool、approval/question 通过 ApiProxy tunnel 正常工作
- [ ] 连接断开后旧 stream/answer 失效并安全回落 Local
- [ ] Relay capture 无法解密 payload，篡改、重放和 identity mismatch 被拒绝
- [ ] 核心 check/test/build 与 Bundle 校验通过
