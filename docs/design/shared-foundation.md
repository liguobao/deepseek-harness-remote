# 共享基础功能设计

状态：Draft v0.1

## 1. 目的

统一双角色 Plugin、Android 客户端，以及独立 Server 项目内 Remote Web 的协议、身份、加密、连接、重连与错误语义。Plugin Client 模式复用 Harness 原生 Web UI；任何业务项目不得自行定义另一套消息格式或直接依赖具体传输实现。

## 2. 包边界

| 包 | 职责 | 不负责 |
| --- | --- | --- |
| `@dsh-remote/protocol` | 消息 envelope、RPC、事件、握手、能力、错误码、版本验证 | 网络连接、密钥存储、UI |
| `@dsh-remote/crypto` | 设备密钥、共享密钥派生、AEAD、nonce/counter、重放防护 | 设备授权、传输选择 |
| `@dsh-remote/webrtc` | LAN、WebRTC、TURN、Relay 的统一 `RemoteTransport` | 业务 RPC、会话状态 |
| `@dsh-remote/client-core` | RPC 关联、事件订阅、重连、同步、传输降级 | React 页面、Harness API |

## 3. 端到端边界

```text
Harness API / official apiProxy
  -> Plugin Adapter or native API allowlist bridge
  -> Remote Protocol
  -> Secure Channel
  -> RemoteTransport
  -> Server signaling/relay
  -> RemoteTransport
  -> Client Core
  -> Product UI
```

Server 可以读取路由 envelope 和连接元数据，但不能解密 `payload` 中的会话业务内容。

## 4. 身份模型

每个 Host 和 Client 首次运行生成：

- `deviceId`：UUIDv7 或 ULID，不使用 hostname、MAC 或硬盘序列号。
- `deviceName`：用户可修改的显示名称。
- `platform`：操作系统/浏览器类别，仅用于展示和兼容性判断。
- `publicKey` / `privateKey`：设备身份密钥对。
- `fingerprint`：由公钥稳定派生，配对确认时展示。

私钥只能保存在设备本地。Host 第一版写入 `$DSH_HOME/remote/` 并限制文件权限；独立 Server 项目中的 Web Client 写入 IndexedDB，并明确提示浏览器存储、页面生命周期和备份能力有限。

Host identity、账号状态、device credential 与配对关系必须按规范化后的 `serverUrl`
隔离。切换 Server 时不得发送或自动迁移旧 Server 的 deviceId、token、private key
或 trusted peer；如果未来提供迁移，必须是用户明确发起且重新经过目标 Server 授权。

### Host 账号授权与设备认证

Host 接入包含两个互不替代的认证层：

- 站点账号认证：用户登录目标 Server，web account token 只用于注册 Host 和账号接口；
- 设备认证：Host 注册成功后取得独立 access/refresh token，用于 WebSocket、pairing
  和后台常驻连接。

Host 注册必须携带同一 Server 签发的 web account token；Client 仍可匿名注册作为
pairing bootstrap。Server 返回账号拥有的 Host 只表示归属元数据，本机缺少对应
private key 时不能自动恢复、冒充或认领该 Host。

## 5. 配对协议

设备码使用 8 位无歧义 Base32，展示为 `XXXX-XXXX`，至少约 40 bit 熵。

状态机：

```text
CREATED -> CLAIMED -> HOST_CONFIRMED -> CONSUMED
   |          |              |
   +-------> EXPIRED <-------+
              |
           REJECTED
```

约束：

- 10 分钟 TTL，单次使用。
- 按 IP、设备和设备码限速，并限制连续错误次数。
- Client claim 只表示“请求绑定”，不是授权完成。
- Host 必须看到 Client 名称与 fingerprint，并明确允许或拒绝。
- 确认后双方保存对端公钥；Server 只保存公开身份和 membership。
- 设备码泄露不能代替 Host 确认，也不能产生可长期复用的 token。

## 6. 握手与能力

握手至少携带：

```json
{
  "remoteProtocol": 1,
  "role": "host",
  "deviceId": "01K...",
  "pluginVersion": "0.1.0",
  "harnessVersion": "...",
  "platform": "linux",
  "capabilities": [
    "sessions.list",
    "sessions.send",
    "session.streaming",
    "permission.allow-once",
    "permission.deny"
  ]
}
```

客户端只能展示双方能力交集。缺少能力时隐藏或禁用操作，并给出版本/能力说明；不得通过调用后猜测是否支持。

## 7. 协议 envelope

所有业务消息使用统一 envelope：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "rpc.request",
  "timestamp": 1786,
  "payload": {}
}
```

MVP RPC：

- `system.info`
- `workspace.get`
- `sessions.list`
- `sessions.get`
- `sessions.create`
- `session.send`
- `session.stop`
- `permissions.respond`
- `connection.ping`
- `sync.from`
- `harness.api.call`
- `harness.api.respond`
- `harness.api.stream.open`
- `harness.api.stream.close`

MVP Event：

- `session.created`
- `session.updated`
- `message.created`
- `message.delta`
- `tool.started`
- `tool.updated`
- `tool.finished`
- `permission.requested`
- `permission.resolved`
- `agent.status`
- `connection.stats`
- `harness.api.frame`
- `harness.api.stream.closed`

明确禁止增加绕过 Harness 的通用 `shell.exec`、`filesystem.read`、`filesystem.write` RPC。Native API bridge 的 method 字段只能选择固定 allowlist，不得映射成任意 `ApiProxy`、Cordis service 或 Harness tool 调用。

## 8. 事件顺序与恢复

每条 Host 事件必须包含单调递增的 `seq`，Client 持久化每台 Host 的 `lastSeq`。

断线恢复顺序：

1. 重连 signaling。
2. 尝试恢复/重建首选传输。
3. 发送 `sync.from(lastSeq)`。
4. Host 重放仍保留的事件。
5. 若窗口已过期，返回 `FULL_RESYNC_REQUIRED`。
6. Client 调用 `sessions.get` 重建当前会话，再继续订阅。

重复事件按 `(hostDeviceId, seq)` 去重。RPC 按 `requestId` 关联，重连时未确认的非幂等请求不得自动重发。

## 9. 传输策略

目标优先级：`LAN -> P2P -> TURN -> Relay`。第一条 vertical slice 允许先实现 Relay，但上层只能依赖：

```ts
interface RemoteTransport {
  connect(): Promise<void>
  send(data: Uint8Array): Promise<void>
  onMessage(cb: (data: Uint8Array) => void): () => void
  close(): Promise<void>
  getStats(): TransportStats
}
```

连接状态统一为：

```text
CONNECTING
CONNECTED_LAN
CONNECTED_P2P
CONNECTED_TURN
CONNECTED_RELAY
RECONNECTING
OFFLINE
```

任何情况下优先保证“能连接”，但 UI 必须准确展示降级后的实际模式。

## 10. 加密通道

设计选择：成熟库实现 `X25519 + HKDF-SHA256 + ChaCha20-Poly1305`，不自行设计密码算法。

每个方向使用独立子密钥和单调 counter。AEAD 附加数据绑定：协议版本、发送方设备、接收方设备、连接 ID、消息类型和 counter。接收方维护 replay window；重复、过旧、认证失败或设备不匹配的帧全部拒绝。

密钥轮换发生在新连接或达到消息/时长阈值时。日志禁止记录私钥、共享密钥、明文载荷、token、TURN 密码和完整 prompt。

## 11. 错误语义

稳定错误码至少包括：

- `ACCOUNT_AUTH_REQUIRED`
- `DEVICE_OWNERSHIP_REQUIRED`
- `DEVICE_REVOKED`
- `CONNECTION_FAILED`
- `P2P_FAILED`
- `RPC_TIMEOUT`
- `UNSUPPORTED_VERSION`
- `PERMISSION_DENIED`
- `SESSION_NOT_FOUND`
- `HARNESS_UNAVAILABLE`
- `FULL_RESYNC_REQUIRED`
- `RATE_LIMITED`
- `PAIRING_EXPIRED`

协议错误包含可诊断的 `code` 与安全的 `message`。客户端将错误转换为用户文案，不显示 `undefined`、原始异常栈或笼统的 `Network Error`。

## 12. 核心测试范围

只为核心行为编写自动化测试：

- 协议编解码、版本拒绝、RPC 关联和事件顺序。
- 密钥交换、加解密、篡改拒绝、重放拒绝。
- 传输降级顺序和断线同步决策。
- 配对状态机、单次消费和权限能力映射。

视觉样式、静态说明页、普通辅助命令和非关键管理筛选不单独补测试。
