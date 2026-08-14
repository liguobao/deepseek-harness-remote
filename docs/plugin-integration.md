# Host Plugin 接入指南

状态：最新 Server 契约；当前 Plugin 的账号登录与授权注册适配尚未完成，见 [TODO](../TODO.md)。

本文面向 DeepSeek Harness Host 插件开发者，描述插件如何登录账号、注册本机、保存凭证并连接 Remote Server。

## 1. 接入模型

Host 接入分为两层认证：

- **账号认证**：用户登录 Server，授权当前账号新增或恢复 Host。
- **设备认证**：Host 注册完成后获得独立的设备 access/refresh token，用于后台常驻连接。

账号 token 只用于注册 Host 和账号接口，不用于 WebSocket；设备 token 不可调用账号接口。Server 不保存设备私钥，也不执行 Harness 任务。

## 2. Server 地址

插件默认 Server：

```text
https://dsh.r2049.cn
```

同时允许用户输入自定义部署地址，例如：

```text
https://remote.example.com
```

插件应将地址规范化为不带末尾 `/` 的 HTTPS origin。除显式开发模式外，不接受 HTTP。一次接入中的登录、Host 注册、token refresh 和 WebSocket 必须使用同一个 origin：

```text
REST:      {serverUrl}/api/v1/...
WebSocket: wss://{serverHost}/ws/v1/connect
```

切换 Server 时，不得把旧 Server 的账号 token、设备 token、deviceId 或配对关系发送给新 Server。建议按规范化后的 `serverUrl` 隔离本地凭证和设备身份。

## 3. 账号登录

### 3.1 邮箱密码

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "用户密码"
}
```

成功响应：

```json
{
  "token": "web-account-jwt",
  "expiresAt": 1786000000000,
  "account": "user@example.com",
  "profile": {},
  "isAdmin": false
}
```

插件将 `token` 临时作为 `accountToken`。可以通过以下接口验证登录状态：

```http
GET /api/v1/auth/me
Authorization: Bearer <accountToken>
```

未注册用户需先在网页或插件 UI 中使用邀请码调用 `POST /api/v1/auth/register`。

### 3.2 知乎 OAuth

先检查当前 Server 是否启用 OAuth：

```http
GET /api/v1/auth/oauth/status
```

返回 `{ "configured": true }` 后，在浏览器或受控 WebView 中打开：

```text
{serverUrl}/api/v1/auth/oauth/start?return_to=/app
```

当前 Server 完成授权后会回到同源 `/app?token=<accountToken>`。插件若使用受控 WebView，可以拦截该同源导航、提取 token，然后立刻清理 WebView URL/历史记录。`return_to` 只接受 Server 内部绝对路径，不接受插件自定义 scheme 或外部 URL。

> 当前协议尚未提供适合系统浏览器的 device authorization/PKCE token exchange。插件不能通过自定义回调 URL 接收 OAuth token，也不要要求用户复制 token。需要纯系统浏览器登录时，应先扩展 Server 的一次性授权码接口。

账号 token 当前没有 refresh 接口；过期后需要重新登录。已经注册并持有有效 device refresh token 的 Host 后台运行不依赖账号 token。

## 4. 生成本机设备身份

首次接入某个 Server 时，插件在本机生成并安全保存：

- `deviceId`：UUIDv7 或 ULID；
- X25519 static identity key pair；
- `identityKey`：32 字节 X25519 公钥的无 padding base64url，通常为 43 字符。

私钥只能保存在本机安全存储中，禁止上传 Server、写日志或随诊断包导出。建议本地存储按 `serverUrl` 分区。

## 5. 注册 Host

注册 Host 必须使用账号 token：

```http
POST /api/v1/devices/register
Authorization: Bearer <accountToken>
Content-Type: application/json

{
  "v": 1,
  "device": {
    "deviceId": "0198...",
    "name": "My Workstation",
    "role": "host",
    "platform": "darwin",
    "identityKey": "base64url-x25519-public-key",
    "clientVersion": "0.1.0",
    "harnessVersion": "0.1.0-rc.6"
  }
}
```

成功返回设备凭证：

```json
{
  "accessToken": "device-access-jwt",
  "accessTokenExpiresAt": 1786000000000,
  "refreshToken": "opaque-device-refresh-token",
  "refreshTokenExpiresAt": 1789000000000
}
```

重要行为：

- 缺少账号登录：`401 ACCOUNT_AUTH_REQUIRED`；
- 已有 Host 属于其他账号：`403 DEVICE_OWNERSHIP_REQUIRED`；
- 历史 Host 没有 owner：`409 DEVICE_OWNERSHIP_REQUIRED`，需要轮换 device identity 或由管理员迁移；
- 相同账号、deviceId 和 identityKey 可以重新注册；
- 相同 deviceId 不允许更换 role 或 identityKey。

注册成功后，`accountToken` 不应继续作为后台连接凭证。插件应安全保存设备 token pair。

## 6. 凭证保存和刷新

建议按以下结构保存，字段名仅供参考：

```json
{
  "serverUrl": "https://dsh.r2049.cn",
  "account": "user@example.com",
  "deviceId": "0198...",
  "deviceAccessToken": "...",
  "deviceAccessTokenExpiresAt": 1786000000000,
  "deviceRefreshToken": "...",
  "deviceRefreshTokenExpiresAt": 1789000000000
}
```

刷新设备 token：

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "deviceId": "0198...",
  "refreshToken": "current-refresh-token"
}
```

Server 每次刷新都会轮换 refresh token。插件必须将整组新凭证原子落盘后再废弃旧值；旧 token 重用会撤销整个 token family。不要并发刷新，同一设备应使用 single-flight/互斥锁。

建议在 access token 到期前 60 秒刷新。收到 `TOKEN_EXPIRED` 可刷新后重试一次；收到 `AUTH_INVALID` 或 `DEVICE_REVOKED` 应停止自动重试，清理设备凭证并提示用户重新登录/接入。

## 7. 建立 WebSocket

连接：

```text
wss://dsh.r2049.cn/ws/v1/connect
```

自定义 Server 则从 HTTPS origin 派生 `wss` URL。access token 必须放在首个 `hello` frame 中，禁止放在 URL query：

```json
{
  "v": 1,
  "id": "0198...",
  "type": "hello",
  "timestamp": 1786000000000,
  "payload": {
    "role": "host",
    "deviceId": "0198...",
    "accessToken": "device-access-jwt",
    "protocols": [1],
    "capabilities": ["transport.relay", "transport.webrtc"]
  }
}
```

连接建立后 5 秒内未发送合法 `hello` 会被关闭。成功响应 `hello.ack`：

```json
{
  "v": 1,
  "id": "0198...",
  "type": "hello.ack",
  "timestamp": 1786000000000,
  "payload": {
    "protocol": 1,
    "serverVersion": "0.1.0",
    "connectionSessionId": "0198...",
    "heartbeatIntervalMs": 25000,
    "maxControlFrameBytes": 65536,
    "maxRelayFrameBytes": 1048576
  }
}
```

Server 会发送 `ping`，插件必须及时返回相同 nonce 的 `pong`。同一 deviceId 建立新 WebSocket 时，旧连接会以 `4003 CONNECTION_REPLACED` 关闭，因此插件内部也应保证只有一个连接管理器。

断线重连建议使用带 jitter 的指数退避。认证失败时先刷新设备 access token；设备被撤销时停止重连。

## 8. 配对与连接事件

Host 在线后可使用设备 access token 创建 pairing：

```http
POST /api/v1/pairings
Authorization: Bearer <deviceAccessToken>

{ "v": 1, "hostDeviceId": "0198..." }
```

Client claim 后，Host WebSocket 收到 `pairing.claimed`。插件必须在本机展示 Client fingerprint，由用户确认后调用 `/api/v1/pairings/confirm`。批准前应先把 Client identity key 写入 pending local trust transaction。

后续收到 `connect.incoming` 时，插件必须同时验证：

1. Server 已建立 membership；
2. `clientDeviceId + clientIdentityKey` 与本机 trusted peer 完全一致。

只有两项都满足才能发送 `connect.accepted`。Server membership 不能替代本机 trust store。

## 9. 账号设备查询

使用账号 token 查询当前账号拥有的 Host：

```http
GET /api/v1/account/devices
Authorization: Bearer <accountToken>
```

该接口用于插件登录后的设备恢复/展示，不替代本机私钥。若 Server 返回某个 Host，但本机没有对应私钥，插件不能冒充或自动认领该设备，应创建新的 device identity。

## 10. 最小状态机

```text
NO_SERVER
  → ACCOUNT_LOGIN_REQUIRED
  → ACCOUNT_AUTHENTICATED
  → DEVICE_REGISTERED
  → DEVICE_TOKEN_READY
  → WS_CONNECTING
  → ONLINE

access token expired → REFRESHING → WS_CONNECTING
AUTH_INVALID         → ACCOUNT_LOGIN_REQUIRED
DEVICE_REVOKED       → REVOKED（停止重连）
server changed       → NO_SERVER（切换到该 Server 独立的本地状态）
```

## 11. 日志与安全要求

插件日志不得包含：

- 账号密码、账号 token；
- device access/refresh token；
- X25519 private key；
- pairing code；
- Noise handshake secret 或解密后的业务 payload。

可以记录经过截断或哈希处理的 deviceId、connectionId、错误码和连接阶段。生产环境必须校验证书，不允许“忽略 TLS 错误”。

