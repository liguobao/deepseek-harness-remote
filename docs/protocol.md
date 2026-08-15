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
- 账号授权与 Host/Client membership
- Host 账号密码或一次性主机匹配码接入
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
- **Server**：负责账号授权、presence、signaling 和 opaque Relay 的协调服务。
- **Device**：具有随机 deviceId 和本地 identity key 的 Host 或 Client。
- **Membership**：Server 根据相同账号归属自动派生的 Host/Client 授权边。
- **Connection**：一个已授权 Host/Client pair 的临时通信实例。
- **Control frame**：Server 可读的 WebSocket signaling/routing JSON。
- **Remote message**：安全通道内的 RPC/Event 业务消息，Server 不可读。
- **Secure channel**：Host 与 Client 之间基于 Noise 的端到端加密会话。

## 3. 分层

```text
HTTPS REST
  account login / device registration / token / device metadata / TURN

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

- `deviceId`, `membershipId`, `connectionId`, `message.id`：UUIDv7 或 ULID 字符串。
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
    "code": "HOST_REGISTRATION_CODE_EXPIRED",
    "message": "The host registration code has expired.",
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

面向插件实现的端到端接入步骤、错误处理和本地存储要求另见
[Host 插件接入指南](plugin-integration.md)。

### 8.1 注册

`POST /api/v1/devices/register`

Host 和 Client 的首次账号归属必须携带由同一 Server 签发的站点账号 Bearer token；
同一安装的相反角色可按 §8.1.2 从已有 device credential 继承 owner。插件默认连接
`https://dsh.r2049.cn`，也可以由用户配置自定义 Server；登录、注册、refresh、
WebSocket 不得跨域混用。注册成功后，Server 为同一账号下的 Host 与 Client 自动
建立或恢复 membership。

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

注册是账号授权的 bootstrap。Client 注册完成后可列出并连接同账号的 Host；不同
账号之间不建立 membership，也不能读取设备详情或 presence。

### 8.1.1 主机匹配码注册

除账号 Bearer token 外，Host 插件也可以使用账号网页生成的一次性主机匹配码。
该码只用于授权一个 Host 加入账号，不参与 Host/Client 连接。

账号生成匹配码：

```http
POST /api/v1/account/host-registration-codes
Authorization: Bearer <web-account-token>
```

响应：

```json
{ "registrationId": "01K...", "code": "ABCD-EFGH", "expiresAt": 1786000000000 }
```

插件注册 Host：

```http
POST /api/v1/devices/register-with-code
```

请求包含 `{ "v": 1, "code": "ABCD-EFGH", "device": <Host Device Descriptor> }`，
成功响应与 §8.1 相同。主机匹配码 10 分钟过期、单次消费、只允许 `role=host`，
Server 使用独立用途的 keyed hash 落库。

### 8.1.2 自有设备角色切换

同一 Plugin 安装已持有有效 Host 或 Client device credential 时，可以用该设备 access
token 为本机注册相反角色，无需再次登录账号或输入主机匹配码：

```http
POST /api/v1/devices/register-owned-role
Authorization: Bearer <currentDeviceAccessToken>
```

请求 body 与 §8.1 相同，但 descriptor 必须使用新的 deviceId、独立 identity key 和与
当前设备相反的 role。Server 从当前设备继承 `owner_account`，拒绝无 owner、相同
deviceId 或相同 role，并为新角色签发独立 token pair、同步同账号 membership。
角色切换只复用账号归属，不得复用 Host/Client 私钥或 device token。

### 8.2 Refresh

`POST /api/v1/auth/refresh`

```json
{
  "deviceId": "01K...",
  "refreshToken": "opaque-secret"
}
```

Server 必须轮换 refresh token。旧 token 重用触发 token family revoke。Client 必须原子替换本地 token；不能在日志或 URL 中传 token。

## 9. 账号授权协议

账号归属是访问边界。每次 Host 或 Client 注册时，Server 为该设备与同账号下所有
未撤销的异角色设备建立 membership；后注册的 Host 或 Client 必须得到相同结果。
已撤销授权边在同账号设备重新注册时恢复，因为账号状态是权威来源。

规范要求：

- Host 与 Client 的 `owner_account` 必须非空且完全一致。
- 不允许匿名 Client 注册，也没有设备码创建、领取、确认或轮询接口。
- `GET /api/v1/devices` 只返回当前 Client 通过同账号授权边可访问的 Host。
- 设备详情、presence、TURN 和连接请求继续校验 membership，防止 IDOR。
- Server 发出 `connect.incoming` 前再次校验双方账号一致，历史跨账号授权边无效。
- Host 只接受 `authorization: "account"` 的连接事件，并使用自己的 device token
  调用 `GET /api/v1/devices/{clientDeviceId}`；只有返回的 membership、role 和
  `identityKey` 与事件完全一致，且不冲突于本机 pinned key，才把该 key 绑定到连接。
- 注销账号会清除 Client 设备 token；重新登录同账号可重新注册设备并恢复访问。

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
    "clientVersion": "0.2.9",
    "capabilities": ["transport.relay", "transport.webrtc"]
  }
}
```

`clientVersion` 是插件/Client 软件的版本，与 Device Descriptor §7 的 `clientVersion` 同源，用于
Server 展示设备版本和诊断；与 `hello.ack` 的 `serverVersion` 对称。插件建立连接时必须上报自己的
版本；对 Server 而言这是 v1 新增的 optional 字段，不能因为缺失或未知版本而拒绝连接。

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

Server 校验 membership、双方账号归属一致且 Host online 后创建 `connectionId`，向 Host 发送：

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
    "authorization": "account",
    "preferredTransports": ["lan", "p2p", "turn", "relay"]
  }
}
```

Host 必须要求 `authorization` 为 `account`，校验 identityKey 格式，并通过受 membership
保护的设备详情接口确认 Client descriptor。本机已有相同 deviceId 但公钥不同则必须拒绝；
验证通过后写入/更新本机 pinned peer，并把该 key 与 `connectionId` 绑定，才可返回
`connect.accepted`。安全握手期间不允许替换远端 key。

同一 Host 必须允许不同 `clientDeviceId` 各自建立并保持独立的 active connection，例如手机
Web 与电脑 Web 可同时连接。RPC pending 数、stream namespace、stream 上限与断开清理均按
`connectionId` 隔离。仅同一个 `clientDeviceId` 的新连接替换该设备的旧连接，不得关闭其他
Client 的 connection 或原生流。

Server 使用现有 `error` control frame 的可选 `payload.connectionId` 通知单条逻辑连接
断开。字段存在时 Host 只关闭该 connection 的 Noise/RTC、RPC router 和 stream，不得把错误
提升为整个 Control WebSocket 的终止状态；字段不存在时保持原有 Control/操作级错误语义。
这是兼容扩展，旧插件可以忽略未知字段。Server 对 `hello.clientVersion < 0.2.13`、缺失或
无效版本保持 last-client-wins，避免把多个 Client fan-in 到旧插件的单例连接状态。

## 12. Secure Channel

### 12.1 算法

账号授权连接使用成熟 Noise 实现：

```text
Noise_IK_25519_ChaChaPoly_SHA256
```

- Initiator：Client。
- Responder：Host。
- 双方 static X25519 key 来自账号授权的设备注册与 `connect.incoming` 事件。
- Prologue 绑定：`DSH-REMOTE`, protocol v1, connectionId, Host deviceId, Client deviceId。
- 禁止自行实现 Noise state machine 或修改算法组合。

Client 从同账号设备详情获取 Host identity key；Host 将账号授权的连接事件与同一设备
详情交叉校验后获取 Client identity key。双方必须把这些 key 固定到本机 trust store，
并绑定到 Noise 握手和 connectionId。

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

Noise transport 单消息最大为 65,535 bytes（包含 AEAD tag）。编码后的 Remote message
超过 48 KiB 时，发送方必须先切成 DSH secure fragments，再逐片 Noise 加密。fragment
使用 binary plaintext：`DSHF` magic、1-byte version、32-bit messageId、16-bit index、
16-bit total、32-bit totalBytes 和最多 48 KiB payload。接收方只在同一 authenticated
channel 内按 messageId 重组，最多接受 4 MiB 的完整消息和 8 个并行重组；重复、乱序、
长度不一致或超限必须关闭 secure channel。小消息继续直接使用 Remote message JSON，
保持兼容和低开销。

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
- `host.describe`、`host.listDirectory`（只读目录元数据，用于远程 Workspace 选择器）
- workspace list/create/rename/delete/reorder/attach/archive
- skill list、agent preset list/select/read
- goal create/edit/pause/resume/complete/clear
- LLM provider/model list

明确禁止 credentials、settings 写入、model endpoint discovery、native path open/picker、目录创建、文件内容读取、attachment、download 以及任何未列出方法。`host.listDirectory` 只允许通过官方 ApiProxy browse capability 返回单层目录元数据，不得扩展为文件内容读取或通用文件系统 RPC。外层 Remote request id 负责安全通道去重，内层 `rpcId` 保持 Harness UI 的原生关联语义。

#### `harness.api.respond`

Params：`{ "message": ClientResponse }`。只用于回答由 Harness 原生事件流发出的 approval/question ServerRequest；`rpcId` 必须由同一 `connectionId` 的 mux stream 实际发出，Client 不能自行创造可回答的 Host request，也不能回答只发送给其他 connection 的请求。

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

`stream` 仅允许 `mux | host`，每条 peer connection 最多同时打开两个原生流。Close Params：`{ "streamId": "client-stream-id" }`。`streamId` namespace、上限和生命周期都属于发起它的 `connectionId`；不同 Client 可使用相同 `streamId`，不得互相关闭或接收对方的 tunnel event。连接替换、撤销或断开时 Host 只取消该 connection 的全部流。

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
- `HOST_REGISTRATION_CODE_NOT_FOUND`
- `HOST_REGISTRATION_CODE_EXPIRED`
- `HOST_REGISTRATION_CODE_CONSUMED`

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

错误 message 面向用户但不包含内部路径、stack、secret 或原始异常。`retryable` 只表示同一操作稍后重试可能成功，不代表 Client 应自动重放非幂等请求。`error.payload.connectionId` 为可选字段；存在时错误作用域仅限该逻辑连接。

## 24. 默认限制

| 项 | 默认限制 |
| --- | --- |
| Hello timeout | 5 s |
| Host registration code TTL | 10 min |
| Control JSON frame | 64 KiB |
| Relay ciphertext frame | 1 MiB |
| Reassembled secure message | 4 MiB |
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

1. 账号归属是 Host/Client 访问边界，device token 只能代表其所属账号内的设备。
2. Membership、双方账号一致性、Host/Client 本机 pinned peer 和 connection identity key 绑定必须同时成立。
3. Remote RPC/Event 不以明文经过或落盘到 Server。
4. TLS/WSS 不能替代 Noise secure channel。
5. Client 不能请求通用 shell/filesystem RPC 绕过 Harness。
6. Permission 只能映射 Harness 当前 request，默认 fail closed。
7. `harness.api.call.method` 必须命中编译期固定 allowlist；禁止通过对象反射、Cordis service 名或任意 endpoint 扩权。
8. 当前 Harness v1 只允许 Remote `allow_once`/`deny`，不得伪造 session grant。
9. Device revoke 使 token、membership 和现有 connection 失效。
10. 重放/乱序/身份不匹配的 secure frame 必须拒绝。
11. Host/Client 首次账号归属必须由同一 Server 的账号授权；Host 也可使用该账号生成的
    一次性主机匹配码。同一安装仅可用 device token 注册独立的相反角色；device token
    仍不可调用账号接口，切换 Server 不得复用旧 origin 的身份、凭证或授权状态。
12. 日志禁止记录 token、code 明文、key、prompt、source、workspace 和 tool output。
13. Admin 无法从数据库或 API 获取 E2EE conversation。
14. 未协商 capability 的功能不得调用或展示为可用。

## 26. Conformance 测试

协议实现至少通过：

- JSON/envelope/schema/version vectors
- RPC correlation、timeout、late response 和 idempotency
- event seq、duplicate、gap、replay 和 full resync
- Host/Client account authorization、owner mismatch 与跨账号访问拒绝
- Host registration code expire/single-use
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
- Host ApiProxy bridge allowlist 与真实 Harness API 一致。
- Web/Host/Mock Host 至少两两互操作。
