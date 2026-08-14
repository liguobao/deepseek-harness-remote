# 共享基础功能设计

状态：Draft v0.2

## 1. 目的

统一 Desktop 双角色 Plugin 与外部 Server 的身份、加密、连接和传输边界。业务层以
Harness 官方 `ApiProxy` 为唯一事实来源，不再维护平行的 Remote Session/Event 协议。
Android 源码暂时保留，但在迁移到 ApiProxy 前不属于当前可用链路。

## 2. 包边界

| 包 | 职责 | 不负责 |
| --- | --- | --- |
| `@dsh-remote/protocol` | Control/Relay envelope 与 ApiProxy 隧道 envelope | Harness 业务模型、UI |
| `@dsh-remote/crypto` | 设备密钥、Noise IK、AEAD counter | 设备授权、传输选择 |
| `@dsh-remote/webrtc` | Relay、LAN、WebRTC/TURN transport 抽象 | ApiProxy、会话状态 |
| `@dsh-remote/client-core` | 隧道 RPC 关联和事件分发 | Harness 业务 reducer、UI |
| `@dsh-remote/plugin` | 配对、信任、secure channel、ApiProxy allowlist 和 Local/Remote switch | Server runtime、Harness 业务重建 |

## 3. 端到端边界

```text
Harness Web UI
  -> Client Plugin ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> Noise secure channel
  -> opaque Server relay
  -> Host Plugin HarnessApiBridge
  -> official Host ApiProxy
```

Server 可以读取路由和连接元数据，但不能解密 ApiProxy payload。

## 4. 身份与配对

每个 Host/Client 具有独立 deviceId、显示名、平台和 X25519 identity key。私钥只保存
在设备本地。身份、device credential 和 trusted peer 按规范化 Server origin 与角色隔离。

设备码使用 8 位无歧义 Base32、10 分钟 TTL、单次消费。Client claim 不是授权；Host
必须在本机核对 fingerprint 并明确允许。建立业务通道时，Server membership 与 Host
本地 trusted peer 必须同时成立。

## 5. 唯一业务协议

Secure channel 中只接受：

- `harness.api.call`
- `harness.api.respond`
- `harness.api.stream.open`
- `harness.api.stream.close`
- 对应 response/error 与 `harness.api.frame`、`harness.api.stream.closed`

Session、Message、Tool、Approval、Question、Workspace 和 Goal 的结构全部沿用对应版本
的官方 ApiProxy contract。Plugin 不复制其 schema，也不提供旧 `sessions.*`、
`session.send`、`permissions.respond` 或 `sync.from`。

Client 与 Host Plugin 作为同一发布物安装，不做旧业务协议兼容。真正的跨版本协商只保留
在 Control/Relay 层；ApiProxy contract 变化由 Plugin 版本一起升级。

## 6. 传输与恢复

当前可用数据面是 Relay；未来优先级为 `LAN -> P2P -> TURN -> Relay`。上层只依赖
`RemoteTransport`。

断线时：

1. pending tunnel RPC 失败；
2. 原生 mux/host stream 结束；
3. Desktop `ApiProxySwitch` 立即回落 Local；
4. 再次选择 Remote 时重新建 Noise channel，并由官方 UI 重新打开 stream、读取 history baseline。

Plugin 不维护第二套 seq replay buffer 或 full-resync 机制。

## 7. 安全边界

- Plugin 只建立出站连接，不监听公网端口。
- 业务 payload 只能进入完成 Noise IK 和 membership/trust 校验的 channel。
- Host 以固定 allowlist 代理 ApiProxy，禁止 credentials/settings、任意目录、native open、附件和下载。
- 未知 method、错误 target、重放、counter gap、identity mismatch 全部 fail closed。
- token、私钥、配对码、prompt、源码、工具输出和 ciphertext 不写日志。

## 8. 核心测试

- Control/Relay 编解码、版本和 frame limits。
- Noise transcript、identity binding、篡改和重放拒绝。
- pairing 单次消费与 membership/local trust 双重授权。
- ApiProxy allowlist、RPC 关联、stream open/close、断线清理。
- transport fallback/reconnect 状态机。
