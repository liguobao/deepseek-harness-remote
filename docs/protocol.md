# DSH Remote Protocol v1

状态：Draft v0.2（首版发布前，不保留旧业务 RPC 兼容）
日期：2026-08-15
协议版本：`1`
实现状态：**当前仓库必须实现 Client/Plugin 侧协议；Server 侧由独立项目实现**

## 0. 文档地位与仓库边界（规范性）

本文必须保留，是 Host Plugin、所有 Remote Client、共享协议包和外部 Server 的唯一线协议契约。

当前仓库负责：

- `packages/protocol` 的类型、schema、编解码和版本校验
- Plugin 的 ApiProxy tunnel、加密、重连和 capability 行为
- Mock Host/Client 与协议 conformance fixtures

当前仓库不负责实现 Server REST API、WebSocket Hub、数据库、Admin 或部署。本文出现的 Server endpoint 和行为用于约束独立 Server 项目，不表示应在当前仓库创建 Server 代码。

任何与本文不一致的示例代码都视为未完成实现，不能反向修改协议语义。当前尚未发布，
旧 Android 业务 RPC 明确不兼容；首版发布后破坏兼容性的变更必须提升协议版本。

## 1. 范围

DSH Remote Protocol 定义 Host Plugin、DSH Remote Server 和 Remote Client 之间的互操作边界，包括：

- 设备注册和 Server credential
- 设备码配对和 Host 确认
- WebSocket authentication
- WebRTC signaling 与 Relay routing
- Host/Client 端到端安全通道
- ApiProxy tunnel 的 unary、respond 与 mux/host streaming
- reconnect 与原生 stream 重建
- capability 与版本协商
- 错误码、限制和安全不变量

Admin API 不属于 E2EE Remote Protocol。它是同站点的独立 HTTPS API，定义在 [server.md](server.md)。

## 2. 规范术语

本文的“必须”“禁止”“应该”“可以”是规范性要求。

- **Host**：运行 DeepSeek Harness 与 `@dsh-remote/plugin` 的设备。
- **Client**：当前指安装同一 Plugin 发布物的 Desktop Harness；Android 旧原型不符合当前业务协议。
- **Server**：负责配对、presence、signaling 和 opaque Relay 的协调服务。
- **Device**：具有随机 deviceId 和本地 identity key 的 Host 或 Client。
- **Membership**：一个 Host 与一个 Client 的已确认信任关系。
- **Connection**：一个已授权 Host/Client pair 的临时通信实例。
- **Control frame**：Server 可读的 WebSocket signaling/routing JSON。
- **Remote message**：安全通道内的 RPC/Event 业务消息，Server 不可读。
- **Secure channel**：Host 与 Client 之间基于 Noise 的端到端加密会话。

## 3. 分层

```text
HTTPS REST
  device registration / pairing / token / device metadata / TURN

WSS Control Channel
  hello / connect / signaling / secure handshake relay / opaque relay

Secure Channel
  Noise transport ciphertext

Remote Protocol
  RPC request / response / error / event

Harness ApiProxy Tunnel
  call / respond / mux stream / host stream
```

业务层禁止直接调用 WebSocket、RTCPeerConnection 或 Server REST；必须通过 `RemoteTransport` 与 client/plugin core。

## 4. 编码与基础类型

### 4.1 JSON

REST、Control frame 和解密后的 Remote message 使用 UTF-8 JSON。发送端禁止输出 `NaN`、`Infinity`、负零、稀疏数组或非 JSON 类型。

接收端必须：

- 拒绝无效 UTF-8/JSON。
- 拒绝重复安全关键字段的非规范解析结果。
- 对未识别的必需 enum 值 fail closed。
- 不把原始 parser 错误直接展示给用户。

### 4.2 标识符

- `deviceId`, `pairingId`, `membershipId`, `connectionId`, `message.id`：UUIDv7 或 ULID 字符串。
- `sessionId`：Harness 原生 SessionId，不由 Server 改写。
- `requestId`：引用发起 RPC 的 Remote message `id`。
- 内层 `rpcId`：Harness ApiProxy 原生 request/response correlation id，Plugin 不改写。

ID 只能用于定位，不能单独作为授权凭据。

### 4.3 时间

所有 JSON 时间使用 Unix epoch milliseconds，字段名以 `At` 结尾。TTL 同时返回绝对 `expiresAt`；Client 不应仅依赖本机倒计时做安全判断。

### 4.4 Binary/Base64URL

REST/Control JSON 中的 key、nonce、handshake 和 ciphertext 使用无 padding Base64URL。WebRTC DataChannel 可直接发送 binary Noise transport frame，不再 Base64 编码。

## 5. 版本规则

顶层协议版本字段为：

```json
{ "v": 1 }
```

规则：

- Major protocol 只有整数版本。
- 接收端不支持 `v` 时返回 `UNSUPPORTED_VERSION` 并关闭连接。
- v1 可以新增 optional 字段和 capability；不能改变现有字段语义或 enum 含义。
- 新增 RPC/Event 必须由 capability 宣告。
- 未协商的 method/event 不能发送。

## 6. REST 通用格式

成功响应直接返回 endpoint schema。失败响应统一为：

```json
{
  "error": {
    "code": "PAIRING_EXPIRED",
    "message": "The pairing code has expired.",
    "requestId": "01K...",
    "retryable": false,
    "details": {}
  }
}
```

`details` 可省略，只能包含不泄露 secret/内部栈的结构化信息。

分页响应：

```json
{
  "items": [],
  "nextCursor": null
}
```

## 7. Device Descriptor

```json
{
  "deviceId": "01K...",
  "name": "Workstation",
  "role": "host",
  "platform": "linux",
  "identityKey": "base64url-x25519-public-key",
  "clientVersion": "0.1.0",
  "harnessVersion": "0.1.0-rc.6"
}
```

规则：

- `role` 仅为 `host` 或 `client`。
- `identityKey` 是 Noise static X25519 public key。
- Host 才可携带 `harnessVersion`。
- `name` 是不可信显示字符串，限制长度并转义。
- Server 禁止接受同一 deviceId 替换为不同 identityKey。

## 8. 设备注册与 Token

面向 Plugin 实现的端到端接入步骤、错误处理和本地存储要求另见
[Host Plugin 接入指南](plugin-integration.md)。

### 8.1 注册

`POST /api/v1/devices/register`

Host 注册必须携带由同一 Server 签发的站点账号 Bearer token。官方服务默认使用
`https://dsh.r2049.cn`，自部署时使用对应的 `REMOTE_PUBLIC_URL`；账号登录、Host
注册、device token refresh 与 WebSocket 连接不得跨 Server origin 混用。Client
设备可以匿名注册，随后通过 pairing 获得访问具体 Host 的 membership。

请求：

```json
{
  "v": 1,
  "device": {
    "deviceId": "01K...",
    "name": "Chrome on Pixel",
    "role": "client",
    "platform": "web",
    "identityKey": "...",
    "clientVersion": "0.1.0"
  }
}
```

响应：

```json
{
  "accessToken": "opaque-or-jwt",
  "accessTokenExpiresAt": 1786000000000,
  "refreshToken": "opaque-secret",
  "refreshTokenExpiresAt": 1789000000000
}
```

Client 注册是匿名 bootstrap；Host 注册是账号授权的 bootstrap。注册只授权该
device 进入控制面，不建立 membership，也不授予访问任何其他 Host 的权限。

Host 重复注册时，Server 必须同时校验 `deviceId`、`identityKey`、`role` 和账号归属：

- 缺少有效站点账号 token：`401 ACCOUNT_AUTH_REQUIRED`；
- Host 已属于其他账号：`403 DEVICE_OWNERSHIP_REQUIRED`；
- 历史 Host 没有 owner：`409 DEVICE_OWNERSHIP_REQUIRED`，不得仅凭公开的
  `deviceId` / `identityKey` 自动认领；
- 同一账号、`deviceId` 和 `identityKey` 可以幂等重新注册；role 或 identity key
  变化必须拒绝。

### 8.2 Refresh

`POST /api/v1/auth/refresh`

```json
{
  "deviceId": "01K...",
  "refreshToken": "opaque-secret"
}
```

Server 必须轮换 refresh token。旧 token 重用触发 token family revoke。Client 必须原子替换本地 token；不能在日志或 URL 中传 token。

站点账号 token 只用于 Host 注册和账号接口，不得用于 WebSocket；Host 注册后使用
独立 device access/refresh token。账号 token 当前没有 refresh 接口，过期后需要
重新登录；有效的 device refresh token 不依赖账号 token。

### 8.3 账号拥有的 Host

`GET /api/v1/account/devices`，使用站点账号 Bearer token，返回该账号拥有的 Host。
该接口只用于登录后的设备恢复或展示，不能替代本机 X25519 私钥；本机没有对应
private key 时不得冒充、恢复或自动认领 Server 返回的 Host。

## 9. 配对协议

### 9.1 Host 创建 pairing

`POST /api/v1/pairings`，Host access token。

请求：

```json
{
  "v": 1,
  "hostDeviceId": "01KHOST..."
}
```

响应：

```json
{
  "pairingId": "01KPAIR...",
  "code": "82KF-7QMP",
  "expiresAt": 1786000000000,
  "pairUri": "dshremote://pair?v=1&server=https%3A%2F%2Fremote.example.com&code=82KF7QMP&hostFp=F4A2992C13AB"
}
```

Host 必须只在本机显示明文 code。Server 数据库保存 keyed hash，不将 code 写日志。

### 9.2 Client claim

`POST /api/v1/pairings/claim`，Client access token。

```json
{
  "v": 1,
  "code": "82KF7QMP",
  "clientDeviceId": "01KCLIENT..."
}
```

响应：

```json
{
  "pairingId": "01KPAIR...",
  "status": "waiting_host",
  "host": {
    "deviceId": "01KHOST...",
    "name": "Workstation",
    "platform": "linux",
    "identityKey": "...",
    "fingerprint": "F4A2 992C 13AB"
  },
  "expiresAt": 1786000000000
}
```

Server 同时向 Host Control Channel 发送 `pairing.claimed`，包含 Client descriptor/fingerprint。Client identityKey 在 claim 后不可更换。

```json
{
  "v": 1,
  "id": "01K...",
  "type": "pairing.claimed",
  "timestamp": 1786000000000,
  "payload": {
    "pairingId": "01KPAIR...",
    "client": {
      "deviceId": "01KCLIENT...",
      "name": "Pixel",
      "role": "client",
      "platform": "android",
      "identityKey": "...",
      "clientVersion": "0.1.0"
    },
    "clientFingerprint": "3C91 A812 D0EF"
  }
}
```

Host 必须自行从 `client.identityKey` 计算 fingerprint 并与 `clientFingerprint` 比较，不能信任 Server 提供的显示值。

### 9.3 Host confirmation

Host 本机 UI/CLI 展示 Client fingerprint。用户确认后 Plugin 先将 Client key 写入 pending local trust transaction，再调用：

`POST /api/v1/pairings/confirm`

```json
{
  "v": 1,
  "pairingId": "01KPAIR...",
  "decision": "approve",
  "clientDeviceId": "01KCLIENT...",
  "clientFingerprint": "3C91A812D0EF"
}
```

`decision` 仅为 `approve` 或 `deny`。Server 必须校验 Host 身份、pairing owner、claim Client 与 fingerprint。

approve 响应：

```json
{
  "status": "paired",
  "membershipId": "01KMEMBER..."
}
```

Server membership 不足以授权 Remote RPC。Host Plugin 必须同时持有匹配 Client identityKey 的本机 trusted peer 记录。

### 9.4 Client status

`GET /api/v1/pairings/{pairingId}/status`

```json
{
  "status": "paired",
  "membershipId": "01KMEMBER...",
  "hostDeviceId": "01KHOST..."
}
```

状态 enum：`waiting_host`, `paired`, `rejected`, `expired`。MVP 可以短轮询此 endpoint；Host/Client 已有 WSS 时应该通过 control event 即时通知。

### 9.5 配对安全说明

- 设备码是短期发现 secret，不是长期认证凭据。
- Host 本机确认是必要步骤。
- QR 中的 `hostFp` 或人工 fingerprint 比对用于检测错误 Server/MITM。
- 在未确认 peer identity 前禁止发送 Harness 业务数据。
- Server 在 pairing 期间被完全控制且用户跳过 fingerprint 核对时，不能保证首次信任不被 MITM；完成 fingerprint/SAS 核对后，后续连接由 Noise static identity 保护。

## 10. Control Channel

### 10.1 WebSocket

URL：`wss://<REMOTE_PUBLIC_URL>/ws/v1/connect`

连接后 5 秒内必须发送 `hello`。在 `hello.ack` 前，除 hello 外的 frame 均拒绝。

### 10.2 Control frame envelope

```json
{
  "v": 1,
  "id": "01K...",
  "type": "hello",
  "timestamp": 1786000000000,
  "payload": {}
}
```

Control frame 是 Server 可读 JSON，不得放置 Remote 业务明文。

### 10.3 Hello

```json
{
  "v": 1,
  "id": "01KMSG...",
  "type": "hello",
  "timestamp": 1786000000000,
  "payload": {
    "role": "client",
    "deviceId": "01KCLIENT...",
    "accessToken": "...",
    "protocols": [1],
    "capabilities": ["transport.relay", "transport.webrtc"]
  }
}
```

ack：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "hello.ack",
  "timestamp": 1786000000000,
  "payload": {
    "protocol": 1,
    "serverVersion": "0.1.0",
    "connectionSessionId": "01KWS...",
    "heartbeatIntervalMs": 25000,
    "maxControlFrameBytes": 65536,
    "maxRelayFrameBytes": 1048576
  }
}
```

WebSocket 关闭后 access token 不能通过 URL/query 泄露。Server 日志必须过滤 hello payload 中的 token。

## 11. 建立 Host/Client Connection

Client control frame：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "connect.request",
  "timestamp": 1786000000000,
  "payload": {
    "hostDeviceId": "01KHOST...",
    "preferredTransports": ["lan", "p2p", "turn", "relay"]
  }
}
```

Server 校验 membership 与 Host online 后创建 `connectionId`，向 Host 发送：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "connect.incoming",
  "timestamp": 1786000000000,
  "payload": {
    "connectionId": "01KCONN...",
    "clientDeviceId": "01KCLIENT...",
    "clientIdentityKey": "...",
    "preferredTransports": ["lan", "p2p", "turn", "relay"]
  }
}
```

Host 必须在本机 trusted peer store 中找到完全匹配的 identityKey，才返回 `connect.accepted`。Server membership 与本机 trust 任一缺失都必须拒绝。

Host 接受后发送：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "connect.accepted",
  "timestamp": 1786000000000,
  "payload": {
    "connectionId": "01KCONN...",
    "targetDeviceId": "01KCLIENT...",
    "transport": "relay"
  }
}
```

`transport` 仅为 `lan`、`p2p`、`turn` 或 `relay`。拒绝时发送 `connect.rejected`，payload 至少包含 `connectionId`、`targetDeviceId`、稳定 `code` 和安全 `message`。Server 只可将结果转发给该 connection 的 Client。

## 12. Secure Channel

### 12.1 算法

已配对连接使用成熟 Noise 实现：

```text
Noise_IK_25519_ChaChaPoly_SHA256
```

- Initiator：Client。
- Responder：Host。
- 双方 static X25519 key 在配对后已知并受信。
- Prologue 绑定：`DSH-REMOTE`, protocol v1, connectionId, Host deviceId, Client deviceId。v1 的规范 UTF-8 编码为
  `DSH-REMOTE\0v=1\0connection=<connectionId>\0host=<hostDeviceId>\0client=<clientDeviceId>`。
- 禁止自行实现 Noise state machine 或修改算法组合。

首次 pairing 可增加 Noise XX/SAS 流程；在该流程标准化前，MVP 必须要求 Host 本机确认和 Client 校验 Host fingerprint。

### 12.2 Handshake relay

Noise handshake bytes 通过 Control frame 转发：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "secure.handshake",
  "timestamp": 1786000000000,
  "payload": {
    "connectionId": "01KCONN...",
    "targetDeviceId": "01KHOST...",
    "step": 1,
    "data": "base64url-noise-handshake"
  }
}
```

Server 只校验 connection ownership、step 上限和 frame size，不解析 Noise payload。

### 12.3 Transport frames

Noise handshake 完成后，Remote message JSON 作为 Noise transport plaintext。Relay 时 Noise ciphertext 放入 `relay` control frame；WebRTC 时直接发送 binary ciphertext。

每方向维护独立 nonce/counter。重复、过旧、认证失败、超限或连接不匹配 frame 必须关闭 secure channel。达到 Noise 实现建议的消息/字节阈值时 rekey 或重建 connection。

TLS/WSS 保护到 Server 的链路，但不能替代本节 E2EE。

## 13. Relay frame

```json
{
  "v": 1,
  "id": "01K...",
  "type": "relay",
  "timestamp": 1786000000000,
  "payload": {
    "connectionId": "01KCONN...",
    "targetDeviceId": "01KHOST...",
    "counter": 42,
    "ciphertext": "base64url-noise-transport-message"
  }
}
```

`counter` 用于 Server 基础限速/排序诊断，不作为解密 nonce 的权威来源。Noise frame 内部状态才是认证依据。

Server 禁止解密、解析、缓存到数据库或记录 `ciphertext`。

## 14. WebRTC Signaling

### Offer

```json
{
  "v": 1,
  "id": "01K...",
  "type": "signal.offer",
  "timestamp": 1786000000000,
  "payload": {
    "connectionId": "01KCONN...",
    "targetDeviceId": "01KHOST...",
    "sdp": "..."
  }
}
```

### Answer

`type: signal.answer`，payload 同上并携带 answer SDP。

### ICE

```json
{
  "v": 1,
  "id": "01K...",
  "type": "signal.ice",
  "timestamp": 1786000000000,
  "payload": {
    "connectionId": "01KCONN...",
    "targetDeviceId": "01KHOST...",
    "candidate": {
      "candidate": "...",
      "sdpMid": "0",
      "sdpMLineIndex": 0
    }
  }
}
```

DataChannel 名称：`dsh`，`ordered: true`。即使 WebRTC 已加密，Remote message 仍通过 Noise secure channel，保持 Relay/P2P 相同的应用安全边界。

连接降级顺序：LAN（后续）-> P2P -> TURN -> Relay。切换 transport 不改变 secure channel peer identity；必要时重建 Noise connection 并执行 event resync。

## 15. Remote Message Envelope

以下消息仅存在于 secure channel plaintext 中：

```json
{
  "v": 1,
  "id": "01KMSG...",
  "type": "rpc.request",
  "timestamp": 1786000000000,
  "payload": {}
}
```

`type` v1 枚举：

- `rpc.request`
- `rpc.response`
- `rpc.error`
- `event`
- `ping`
- `pong`

Control-only 类型（hello, signaling, relay）禁止出现在 secure channel 业务层。

## 16. RPC

Plugin Host 的业务路由只接受 ApiProxy tunnel：`harness.api.call`、
`harness.api.respond`、`harness.api.stream.open` 和 `harness.api.stream.close`。
旧 `system.info`、`workspace.get`、`sessions.*`、`session.*`、
`permissions.respond`、`connection.ping` 与 `sync.from` 已退出 Plugin 协议，Host 必须返回
`METHOD_NOT_FOUND`。Android 旧原型不是兼容目标。

### 16.1 Request

```json
{
  "v": 1,
  "id": "01KREQUEST...",
  "type": "rpc.request",
  "timestamp": 1786000000000,
  "payload": {
    "method": "harness.api.call",
    "params": {
      "method": "session.list",
      "rpcId": "native-rpc-id",
      "payload": {}
    }
  }
}
```

### 16.2 Response

```json
{
  "v": 1,
  "id": "01KRESPONSE...",
  "type": "rpc.response",
  "timestamp": 1786000000100,
  "payload": {
    "requestId": "01KREQUEST...",
    "result": {}
  }
}
```

### 16.3 Error

```json
{
  "v": 1,
  "id": "01KERROR...",
  "type": "rpc.error",
  "timestamp": 1786000000100,
  "payload": {
    "requestId": "01KREQUEST...",
    "code": "SESSION_NOT_FOUND",
    "message": "The session is no longer available.",
    "retryable": false,
    "details": {}
  }
}
```

每个 request 必须恰好产生一个 response 或 error。事件不是 RPC 完成信号。调用端必须按 requestId 关联并在超时后丢弃晚到 response。

调用端在结果未知时不得盲目重发原生 ApiProxy mutation。内层 `rpcId` 保持 Harness 的
原生关联语义；外层 request id 只关联隧道 response/error。

## 17. Capability

Host handshake 的 capability 例子：

```json
[
  "transport.relay",
  "harness.api.v1"
]
```

ApiProxy contract 随同一 Desktop Plugin 发布物升级，不维护旧业务 RPC 兼容矩阵。

## 18. 数据结构

本节 18.1–18.6 是冻结 Android 原型的旧投影，仅作历史记录，不是 Plugin Host 可接受或
发出的结构。Desktop Plugin 的业务结构以对应版本官方 ApiProxy contract 为准。

### 18.1 SystemInfo

```json
{
  "deviceId": "01KHOST...",
  "deviceName": "Workstation",
  "hostname": "devbox",
  "os": "linux",
  "harnessVersion": "0.1.0-rc.6",
  "pluginVersion": "0.1.0",
  "protocol": 1,
  "capabilities": [],
  "connectionMode": "Relay"
}
```

`connectionMode`：`LAN`, `P2P`, `TURN`, `Relay`。

### 18.2 WorkspaceInfo

```json
{
  "id": "workspace-id-or-null",
  "name": "deepseek-harness-remote",
  "cwd": "/home/user/project"
}
```

cwd 是敏感业务数据，只存在 E2EE payload，不进入 Server DB/Admin。

### 18.3 SessionSummary

```json
{
  "id": "session-1",
  "title": "Fix OAuth issue",
  "cwd": "/home/user/project",
  "status": "idle",
  "createdAt": 1786000000000,
  "updatedAt": 1786000000000,
  "lastSeq": 8271
}
```

`status`：`idle`, `running`, `stopping`, `unavailable`。

### 18.4 Message

```json
{
  "id": "message-id",
  "sessionId": "session-1",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "I will inspect the file." }
  ],
  "status": "complete",
  "createdAt": 1786000000000
}
```

Client 必须安全渲染 Markdown/code，禁止把模型内容作为 HTML 直接注入。

### 18.5 ToolCall

```json
{
  "callId": "call-1",
  "sessionId": "session-1",
  "toolName": "bash",
  "title": "Run tests",
  "status": "running",
  "input": { "command": "npm test" },
  "output": null,
  "isError": false
}
```

Tool input/output 是 E2EE 业务内容。Plugin 只转发 Harness 已产生、可展示的结构，不增加通用 tool execution RPC。

### 18.6 PermissionRequest

```json
{
  "requestId": "permission-1",
  "sessionId": "session-1",
  "toolName": "bash",
  "callId": "call-1",
  "reason": "The command needs to run outside the sandbox.",
  "permission": {
    "kind": "command",
    "command": "npm test",
    "cwd": "/home/user/project"
  },
  "status": "pending",
  "expiresAt": 1786000120000
}
```

## 19. Core RPC Methods

本节中 Native Harness API bridge 是当前规范；其前面的旧 Core RPC 小节均已退出
Plugin 协议，Host 必须拒绝。

### `system.info`

Params：`{}`
Result：`SystemInfo`

### `workspace.get`

Params：`{ "sessionId": "session-1" }`，`sessionId` 可省略表示当前/root workspace。
Result：`WorkspaceInfo | null`

### `sessions.list`

Params：

```json
{ "cursor": null, "limit": 50 }
```

Result：

```json
{ "items": [], "nextCursor": null }
```

### `sessions.get`

Params：

```json
{ "sessionId": "session-1" }
```

Result：

```json
{
  "session": {},
  "workspace": {},
  "messages": [],
  "tools": [],
  "pendingPermissions": [],
  "snapshotSeq": 8271
}
```

snapshot 是该 `snapshotSeq` 的一致投影。Client 应先安装 snapshot，再接收 seq 更大的 event。

### `sessions.create`

Params：

```json
{
  "clientRequestId": "01KIDEMPOTENCY...",
  "cwd": "/home/user/project",
  "title": null
}
```

Result：`SessionSummary`。Plugin 必须通过 Harness Agent factory 创建可运行 Agent，不可只创建无 driver 的 Session。

### `session.send`

Params：

```json
{
  "sessionId": "session-1",
  "clientMessageId": "01KCLIENTMSG...",
  "text": "Continue investigating the OAuth issue."
}
```

Result：

```json
{ "accepted": true, "clientMessageId": "01KCLIENTMSG..." }
```

Plugin 根据 Agent 状态选择 followup/steer，不允许 Client 直接指定 Harness 内部方法。`clientMessageId` 用于去重。

### `session.stop`

Params：

```json
{ "sessionId": "session-1" }
```

Result：`{ "accepted": true }`。最终停止状态以后续 Agent/Event 为准。

### `permissions.respond`

Params：

```json
{
  "sessionId": "session-1",
  "requestId": "permission-1",
  "decision": "allow_once"
}
```

`decision` v1 仅：`allow_once`, `deny`。

Result：

```json
{ "accepted": true, "requestId": "permission-1" }
```

若请求已取消、已处理或过期，返回 `PERMISSION_NOT_PENDING`。RPC timeout 表示结果未知，Client 必须等待 `permission.resolved` 或 resync，不能自动重试相反决定。

### `connection.ping`

Params：`{ "sentAt": 1786000000000 }`
Result：`{ "sentAt": 1786000000000, "hostAt": 1786000000020 }`

### `sync.from`

Params：`{ "afterSeq": 8271, "limit": 1000 }`。
Result：见“Event Replay 与重连”。这是 v1 核心恢复 RPC；Host 不具备 replay window 时必须返回 `FULL_RESYNC_REQUIRED`，不能返回不连续事件。

### Native Harness API bridge

`harness.api.v1` 用于让安装了 Plugin Client face 的本地 Harness 继续使用官方 UI 操作远端 Host。它不是通用反射 RPC；Host 必须以代码内固定 allowlist 校验每个 `method`，未知或禁止方法返回 `METHOD_NOT_ALLOWED`。

#### `harness.api.call`

Params：

```json
{
  "method": "session.list",
  "rpcId": "native-harness-rpc-id",
  "payload": {}
}
```

Result 是 Harness `ApiProxy` 的原生 `RpcResponse`，必须回显内层 `rpcId`。v1 allowlist 仅包括：

- session list/search/create/history/models/selectModel/rename/fork/prompt/updateQueue/cancel
- subagent list/history/prompt/interrupt
- `host.describe`
- workspace list/create/rename/delete/reorder/attach/archive
- skill list、agent preset list/select/read
- goal create/edit/pause/resume/complete/clear
- LLM provider/model list

明确禁止 credentials、settings 写入、model endpoint discovery、native path open/picker、目录枚举/创建、attachment、download 以及任何未列出方法。外层 Remote request id 负责安全通道去重，内层 `rpcId` 保持 Harness UI 的原生关联语义。

#### `harness.api.respond`

Params：`{ "message": ClientResponse }`。只用于回答由 Harness 原生事件流发出的 approval/question ServerRequest；`rpcId` 必须来自该请求，Client 不能自行创造可回答的 Host request。

#### `harness.api.stream.open` / `harness.api.stream.close`

Open Params：

```json
{
  "streamId": "client-stream-id",
  "stream": "mux",
  "rpcId": "native-open-rpc-id",
  "payload": {}
}
```

`stream` 仅允许 `mux | host`，每条 peer connection 最多同时打开两个原生流。Close Params：`{ "streamId": "client-stream-id" }`。连接替换、撤销或断开时 Host 必须取消全部流。

## 20. Events

Plugin 当前只发送 `harness.api.frame` 与 `harness.api.stream.closed`。本节其余 Remote
Event 名称属于冻结 Android 原型，不得据此恢复 Host 事件投影层。

Event envelope：

```json
{
  "v": 1,
  "id": "01KEVENT...",
  "type": "event",
  "timestamp": 1786000000000,
  "payload": {
    "seq": 8272,
    "event": "message.delta",
    "sessionId": "session-1",
    "data": {}
  }
}
```

`seq` 在同一 Host identity 上严格递增。重放必须保留原始 seq/id/timestamp。

### `session.created`

data：`SessionSummary`

### `session.updated`

data：完整 `SessionSummary`。v1 不发送隐式 merge patch，避免不同客户端产生不同状态。

### `message.created`

data：`Message`。Streaming assistant message 首次创建时 `status: streaming`。

### `message.delta`

```json
{
  "messageId": "message-1",
  "deltaIndex": 3,
  "delta": "next chunk",
  "final": false,
  "finishReason": null
}
```

`deltaIndex` 对同一 message 从 0 连续递增。最后一帧 `final: true`，可携带 `finishReason`。Client 检测 gap 时必须 resync，不能静默拼接。

### `tool.started`, `tool.updated`, `tool.finished`

data：`ToolCall` 的当前完整值。`tool.finished` 的 status 为 `success`, `error` 或 `cancelled`。

### `permission.requested`

data：`PermissionRequest`。

### `permission.resolved`

```json
{
  "requestId": "permission-1",
  "outcome": "allowed-once",
  "resolvedAt": 1786000000000
}
```

Harness outcome enum：`allowed-once`, `rejected`, `cancelled`, `unavailable`。Client decision 与 Host outcome 不完全相同。

### `agent.status`

```json
{ "status": "running" }
```

status：`idle`, `running`, `stopping`, `disposed`, `error`。

### `connection.stats`

```json
{
  "mode": "Relay",
  "connected": true,
  "rttMs": 86,
  "bytesSent": 1024,
  "bytesReceived": 2048
}
```

### `harness.api.frame`

data：`{ "streamId": "...", "frame": RpcRequest<MuxFrame | HostFrame> }`。该 event 不进入 Host 的通用 seq replay buffer；Harness Client Runtime 负责按原生流语义重连并重新取得 history baseline。

### `harness.api.stream.closed`

data：`{ "streamId": "...", "reason": "cancelled|completed|failed|peer-disconnected" }`。Client 收到后必须结束对应 iterator；transport 意外关闭时本地模式切换器必须 fail closed，不得继续向旧 Host 提交请求。

## 21. Event Replay 与重连

本节旧 `sync.from` 机制已退出 Plugin。Desktop Client 重连后重新打开官方 mux/host
stream，并由 Harness UI 重新读取原生 history baseline；Plugin 不维护第二套 replay buffer。

Client 为每台 Host 持久化 `lastSeq`，但不必持久化解密后的 conversation。

Secure channel 恢复后调用扩展 RPC：

```text
sync.from
```

Params：

```json
{ "afterSeq": 8271 }
```

Result：

```json
{
  "events": [],
  "lastSeq": 8290,
  "hasMore": false
}
```

如果 Host replay buffer 不再包含所需 seq，返回：

```json
{
  "code": "FULL_RESYNC_REQUIRED",
  "details": { "currentSeq": 9000 }
}
```

Client 随后调用 `sessions.get` 获取当前会话 snapshot。恢复期间 Send/permission 按钮必须禁用，避免在未知状态上产生副作用。

Event 去重 key 为 `(hostDeviceId, seq)`。收到 `seq <= lastSeq` 的重放事件忽略；收到 `seq > lastSeq + 1` 立即暂停 reducer 并同步。

## 22. Ping/Pong

应用层 `connection.ping` 已退出 Plugin；只保留 Control Channel heartbeat。

Control Channel heartbeat 默认 25 秒，75 秒未收到有效 pong 视为断开。应用层可通过 `connection.ping` 估计 Host RTT。

Control ping：

```json
{
  "v": 1,
  "id": "01K...",
  "type": "ping",
  "timestamp": 1786000000000,
  "payload": { "nonce": "01K..." }
}
```

pong 回显 nonce。Heartbeat 不能携带业务数据。

## 23. 错误码

### Protocol / Version

- `INVALID_MESSAGE`
- `UNSUPPORTED_VERSION`
- `CAPABILITY_NOT_SUPPORTED`
- `METHOD_NOT_FOUND`
- `METHOD_NOT_ALLOWED`
- `REQUEST_CONFLICT`
- `FRAME_TOO_LARGE`
- `RATE_LIMITED`

### Auth / Device

- `AUTH_REQUIRED`
- `AUTH_INVALID`
- `ACCOUNT_AUTH_REQUIRED`
- `TOKEN_EXPIRED`
- `DEVICE_NOT_FOUND`
- `DEVICE_REVOKED`
- `DEVICE_OWNERSHIP_REQUIRED`
- `MEMBERSHIP_REQUIRED`
- `PEER_IDENTITY_MISMATCH`

### Pairing

- `PAIRING_NOT_FOUND`
- `PAIRING_EXPIRED`
- `PAIRING_ALREADY_CLAIMED`
- `PAIRING_ALREADY_CONSUMED`
- `PAIRING_REJECTED`
- `PAIRING_FINGERPRINT_MISMATCH`

### Connection / Transport

- `HOST_OFFLINE`
- `CONNECTION_NOT_FOUND`
- `CONNECTION_FAILED`
- `CONNECTION_REPLACED`
- `P2P_FAILED`
- `TURN_UNAVAILABLE`
- `RELAY_UNAVAILABLE`
- `SLOW_CONSUMER`
- `SECURE_CHANNEL_FAILED`

### Harness

- `HARNESS_UNAVAILABLE`
- `SESSION_NOT_FOUND`
- `SESSION_NOT_READY`
- `AGENT_BUSY`
- `PERMISSION_DENIED`
- `PERMISSION_NOT_PENDING`
- `RPC_TIMEOUT`
- `FULL_RESYNC_REQUIRED`
- `INTERNAL_ERROR`

错误 message 面向用户但不包含内部路径、stack、secret 或原始异常。`retryable` 只表示同一操作稍后重试可能成功，不代表 Client 应自动重放非幂等请求。

## 24. 默认限制

| 项 | 默认限制 |
| --- | --- |
| Hello timeout | 5 s |
| Pairing TTL | 10 min |
| Control JSON frame | 64 KiB |
| Relay ciphertext frame | 1 MiB |
| RPC text input | 64 KiB |
| 同连接 pending RPC | 128 |
| 同 session pending permission | 16 |
| ICE candidates / connection | 256 |
| Heartbeat interval | 25 s |
| Heartbeat disconnect | 75 s |
| Event replay window | 至少 10,000 events 或 15 min，取先达到者 |

Server/Host 可协商更小限制，但必须在 hello/system.info 中公布。超限必须返回稳定错误或关闭违规连接，不能无限缓存。

## 25. 安全不变量

所有 conforming 实现必须满足：

1. Server credential 不等于 Host Remote authority。
2. Membership 与 Host 本机 trusted peer 必须同时成立。
3. Remote RPC/Event 不以明文经过或落盘到 Server。
4. TLS/WSS 不能替代 Noise secure channel。
5. Client 不能请求通用 shell/filesystem RPC 绕过 Harness。
6. Permission 只能映射 Harness 当前 request，默认 fail closed。
7. `harness.api.call.method` 必须命中编译期固定 allowlist；禁止通过对象反射、Cordis service 名或任意 endpoint 扩权。
8. 当前 Harness v1 只允许 Remote `allow_once`/`deny`，不得伪造 session grant。
9. Device revoke 使 token、membership 和现有 connection 失效。
10. 重放/乱序/身份不匹配的 secure frame 必须拒绝。
11. Host 注册必须由同一 Server 的 web account token 授权；account token 与 device
    token 不可互换，切换 Server 不得复用旧 origin 的身份、凭证或配对状态。
12. 日志禁止记录 token、code 明文、key、prompt、source、workspace 和 tool output。
13. Admin 无法从数据库或 API 获取 E2EE conversation。
14. 未协商 capability 的功能不得调用或展示为可用。

## 26. Conformance 测试

协议实现至少通过：

- JSON/envelope/schema/version vectors
- RPC correlation、timeout、late response 和 idempotency
- event seq、duplicate、gap、replay 和 full resync
- Host account authorization、owner mismatch、legacy owner 缺失与 Client 匿名注册
- pairing expire/single-use/fingerprint mismatch
- Noise IK handshake、peer mismatch、tamper、replay 和 rekey
- signaling/relay membership authorization
- Relay capture 无法解密业务 payload
- permission allow/deny/cancel/timeout/disconnect fail-closed
- transport 从 P2P/TURN 降级 Relay 后保持 session continuity

UI 排版、静态说明和 Admin 普通筛选不属于协议 conformance。

## 27. 实现差距管理

当前 `packages/protocol`、`packages/crypto`、`packages/webrtc` 和 Server scaffold 是早期代码，不得仅因类型存在就声明符合本规范。

实现阶段应维护 checklist：

- 每个本文 frame/type 都有 schema。
- 每个 schema 都有正反测试 vector。
- Noise library 和握手 transcript 已固定。
- Server 只解析 control envelope，不解析 relay plaintext。
- Host adapter capability 与真实 Harness API 一致。
- Web/Host/Mock Host 至少两两互操作。
