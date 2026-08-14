# DSH Remote Server 设计说明

状态：Draft v0.1
日期：2026-08-15
实现状态：**当前仓库只保留设计与互操作契约；runtime 位于独立 Server 仓库**

## 0. 仓库边界（规范性）

本文必须保留，用于约束 Plugin、Client 与独立 Server 项目的互操作行为；但它不授权在当前仓库实现 Server。

当前仓库禁止新增 Server 源码、FastAPI runtime、数据库模型/迁移、Server tests、Admin 后端、Server Docker image 和部署目录。Server 应在独立仓库或独立交付物中实现，并以本文和 [protocol.md](protocol.md) 为契约。

当前仓库可以实现的 Server 相关内容仅限：

- Client/Plugin 使用的协议类型与校验器
- Mock Host、Mock Transport 或测试 fixture
- 针对外部 Server 的互操作测试客户端
- Server/Protocol 设计文档

## 1. 定位

DSH Remote Server 是一个自部署的**协调与中继服务**。它负责站点账号登录、Host
归属、设备注册、配对、在线状态、连接授权、WebRTC signaling、短期 TURN credential、
加密 Relay 和站点管理；它不执行 Harness 任务，也不保存会话明文。

Server、Remote Web 和 Admin 是一个站点：

- 一个 `REMOTE_PUBLIC_URL`
- 一个 FastAPI 进程/API 入口
- 一个 React 构建
- 一个 SQLite 数据库
- 一个 WebSocket endpoint
- `/app` 为 Remote 用户区
- `/app/admin` 为站点管理区（兼容旧 `/admin`，仅白名单管理员）

独立 Server 项目内部可以按 Python 后端与 React 前端分层，但生产部署不可拆成两个用户站点。这里描述的是外部 Server 项目的目标结构，不是当前仓库目录规划。

## 2. 目标与非目标

### 目标

- Host 在 NAT 后只通过出站 WSS 即可上线。
- 浏览器通过设备码绑定 Host，并由 Host 本机确认。
- 只允许已绑定的 Client 与 Host signaling/relay。
- P2P 失败时无缝回退到 TURN 或加密 Relay。
- Admin 能诊断设备、配对、连接和 TURN 健康。
- 单机 SQLite + Docker Compose 即可自部署。
- Server 被入侵时，攻击者仍不能直接读取会话或控制 Host。

### 非目标

- 不保存 prompt、conversation、workspace 文件、tool output 或 shell history。
- 不提供 Harness RPC 的 HTTP 代理。
- 不提供 terminal、SSH、VNC、远程文件系统或模型代理。
- MVP 不引入 Redis、Kafka、RabbitMQ、Celery、Postgres 或 Kubernetes。
- Admin 不拥有会话解密能力。
- MVP 不做组织、RBAC、SSO、计费和多人协作。

## 3. 系统边界

```text
Host Plugin                         Browser
    |                                  |
    | HTTPS / WSS outbound             | HTTPS / WSS
    v                                  v
             DSH Remote Server
       +---------------------------+
       | Device + Pairing API      |
       | WebSocket Connection Hub  |
       | WebRTC Signaling          |
       | Opaque Encrypted Relay    |
       | TURN Credential Service   |
       | Admin API + React Static  |
       +---------------------------+
                    |
                  SQLite
```

控制面包含设备、membership、连接和 signaling 元数据。数据面中的 Harness RPC/Event 在 Host 和 Client 之间端到端加密；Relay 只转发 ciphertext。

## 4. 技术约束

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- Alembic
- Pydantic v2
- SQLite（WAL）
- uvicorn
- React + Vite + TypeScript（统一站点前端）
- coturn（标准部署可选启用）

## 5. 站点路由

| 路由 | 内容 |
| --- | --- |
| `/` | 项目介绍（Landing Page，公开） |
| `/guide` | 使用指南（公开） |
| `/pair` | 设备配对（需登录） |
| `/app/*` | Remote 用户区（需登录） |
| `/app/admin`（兼容旧 `/admin`） | 站点管理（仅白名单管理员） |
| `/api/v1/*` | Remote REST API（包含站点账号登录） |
| `/api/v1/admin/*` | Admin REST API |
| `/ws/v1/connect` | Host/Client 统一 WebSocket |
| `/health` | liveness |
| `/ready` | readiness，按部署策略限制细节 |

生产环境由 FastAPI 托管 `apps/web/dist`。API/WebSocket route 必须先于 SPA fallback 注册；未知 `/api/*` 返回 JSON 404，不能返回 `index.html`。

## 6. 身份模型

### Device

每个 Host/Client 持有随机 `deviceId` 和本地 X25519 identity key。Server 保存 device descriptor 与 public key，不保存 private key。

Server credential 只授权访问 signaling/control plane；Host 对 Remote RPC 的最终信任来自本机 `trusted-peers` 和 E2EE peer identity。Server token 泄露不能单独产生 Harness 控制权。

### Membership

Membership 是一个 Host 与一个 Client 的长期绑定关系。只有 active membership 才能：

- 查看 Host presence。
- 创建 Host/Client connection。
- 交换 signaling。
- 使用 Relay。
- 请求该 connection 的 TURN credential。

### Admin

Admin 没有独立密码入口或会话。只有命中 `DSH_ADMIN_EMAILS` 或
`DSH_ADMIN_ZHIHU_OPEN_IDS` 白名单的站点账号可以访问 Admin API；接口仅接受
`typ=web` 的 web account Bearer token。普通 web 账号和 device Bearer token 都不能
访问 Admin API，管理员也不能解密 E2EE payload。

## 7. 设备注册

Host Plugin 接入要求见 [Host Plugin 接入指南](plugin-integration.md)。Host 必须先在
目标 Server 登录站点账号，再用同一 Server 签发的 web account Bearer token 注册
随机身份；Server 将 Host 归属绑定到该账号。Client 设备仍可在 TLS 连接上匿名注册，
作为 pairing bootstrap。

注册行为按 IP/设备限速；重复 deviceId 不允许覆盖已有 public key、role 或 Host
owner。相同账号和相同 identity 可以幂等重新注册；属于其他账号或历史上没有 owner
的 Host 不得自动认领。

Server credential 使用短 access token + 可旋转 refresh token。数据库仅保存 refresh token hash；检测旧 token 重用时撤销整个 token family。

web account token 只用于 Host 注册和账号接口；注册成功后的 WebSocket、pairing 与
后台 token 轮换使用独立的 device credential，两类 token 不得互换。

Host/Client private key 和 trusted peer 列表始终留在设备本地。

## 8. 配对设计

### 设备码

- 8 位无歧义 Base32，展示为 `XXXX-XXXX`。
- 至少约 40 bit 熵。
- 默认 10 分钟过期。
- 单次 claim、单次 confirm、单次消费。
- IP、Host、Client、code 多维限速和错误次数限制。
- 数据库保存 keyed hash，不长期保存 code 明文。

### 状态机

```text
CREATED -> CLAIMED -> CONFIRMED -> CONSUMED
   |          |            |
   +-------> EXPIRED <-----+
              |
           REJECTED
```

### 安全确认

Client claim 后，Server 将 Client public key/fingerprint 通知 Host。Host 必须在本机 UI/CLI 明确确认。Server 中的 membership 只有在 Host Plugin 同时把该 Client public key 写入本机 trusted peer store 后才有实际控制意义。

Server 即使知道设备码，也不能静默把一个 Client 加入 Host 本地信任列表。二维码可额外携带 Host public-key fingerprint，降低错误 Server/MITM 风险。

## 9. REST API

### Remote API

| Method | Path | Auth | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/v1/devices/register` | Host: web account；Client: anonymous；rate limited | 注册随机设备身份 |
| `POST` | `/api/v1/pairings` | Host | 创建 pairing |
| `POST` | `/api/v1/pairings/claim` | Client | claim code |
| `GET` | `/api/v1/pairings/{id}/status` | pairing claimant | 等待 Host 结果 |
| `POST` | `/api/v1/pairings/confirm` | Host | 允许/拒绝 |
| `GET` | `/api/v1/devices` | Client | 返回该 Client 绑定的 Host |
| `GET` | `/api/v1/devices/{id}` | membership | Host 元数据 |
| `DELETE` | `/api/v1/devices/{id}` | membership | 解除当前 Client 与 Host 绑定 |
| `POST` | `/api/v1/auth/refresh` | refresh token | 旋转 token |
| `GET` | `/api/v1/turn/credentials` | active connection | 短期 TURN credential |

具体 request/response 和错误 envelope 见 [protocol.md](protocol.md)。

### 站点账号 API

| Method | Path | Auth | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | invite code；rate limited | 注册邮箱账号 |
| `POST` | `/api/v1/auth/login` | rate limited | 邮箱密码登录并签发 web account token |
| `GET` | `/api/v1/auth/me` | web account | 当前账号、profile 与 `isAdmin` |
| `GET` | `/api/v1/auth/oauth/status` | public | OAuth 是否启用 |
| `GET` | `/api/v1/auth/oauth/start` | public | 开始知乎 OAuth，回调必须留在同源站点 |
| `POST` | `/api/v1/auth/invite-code` | web account | 创建一次性邀请码 |
| `GET` | `/api/v1/auth/invite-codes` | web account | 查询当前账号的邀请码 |
| `GET` | `/api/v1/account/devices` | web account | 查询当前账号拥有的 Host |

web account token 与 device token 必须由依赖类型严格隔离；`/account/devices` 只用于
展示/恢复提示，不授予缺少本机 private key 的调用方冒充 Host。

### Admin API

| Method | Path | 说明 |
| --- | --- | --- |
| `GET` | `/api/v1/admin/health` | Server/DB/WebSocket/TURN 健康 |
| `GET` | `/api/v1/admin/devices` | 全站设备元数据 |
| `POST` | `/api/v1/admin/devices/{id}/revoke` | 撤销设备、token、连接 |
| `GET` | `/api/v1/admin/connections` | 连接元数据 |
| `GET` | `/api/v1/admin/pairings` | pairing 状态 |
| `DELETE` | `/api/v1/admin/pairings/{id}` | 取消 active pairing |
| `GET` | `/api/v1/admin/settings` | 脱敏的生效配置 |

Admin API 不提供 conversation、workspace、session title、prompt 或 tool output 字段。

## 10. WebSocket Gateway

统一入口 `/ws/v1/connect`。连接必须在短超时内发送 hello；未认证连接不能进入 ConnectionHub。

状态：

```text
ACCEPTED -> AUTHENTICATING -> READY -> DRAINING -> CLOSED
    |             |            |
    +----------> CLOSED <-------+
```

hello 校验：

- protocol version
- role (`host` / `client`)
- deviceId 与 access token subject 一致
- device 未撤销
- token 未过期
- Origin 合法（浏览器 Client）
- capabilities 格式与 frame 大小

同一 device 新连接的处理策略必须明确：MVP 采用新连接替换旧连接，旧连接收到 `CONNECTION_REPLACED` 后关闭。

## 11. Signaling

Server 转发 `signal.offer`、`signal.answer` 和 `signal.ice`，但必须校验：

- connectionId 属于发送方。
- targetDeviceId 与 active membership 匹配。
- 发送方/目标角色正确。
- SDP/candidate 大小、频率和总数在限制内。
- connection 已进入允许 signaling 的状态。

Server 不修改 SDP，不参与 DataChannel 业务协议。

## 12. Relay

Relay 是 P2P/TURN 不可用时的数据面 fallback。

外层 envelope 可见字段仅用于路由：protocol、connectionId、sender、target、counter、ciphertext 长度。ciphertext 内是完整 Remote Protocol message。

Server 必须：

- 将 payload 视为 opaque bytes。
- 不记录 payload、nonce、完整 message size 序列或解密失败细节。
- 校验 active membership 和 connection ownership。
- 限制单 frame、每秒 frame、每连接队列和总带宽。
- 使用有界发送队列；慢消费者触发 `SLOW_CONSUMER` 断开。
- device revoke 后立即关闭相关 channel。

## 13. TURN

TURN credential 由 `TURN_SECRET` 动态生成，TTL 与 connection 建立窗口匹配。只有 active membership 且处于连接建立阶段的设备可获取。

Server 不向前端返回 `TURN_SECRET`。Admin 只能看到 TURN URL、是否配置、credential 生成是否正常和可选探测结果。

## 14. 数据模型

### `devices`

`id`, `name`, `role`, `platform`, `public_key`, `owner_account`（Host 对应账号，Client
为空）, `version`, `created_at`, `last_seen_at`, `revoked_at`

### `device_pairings`

`id`, `code_hash`, `host_device_id`, `claimed_client_id`, `status`, `attempts`, `created_at`, `expires_at`, `confirmed_at`, `consumed_at`

### `device_memberships`

`id`, `host_device_id`, `client_device_id`, `created_at`, `last_connected_at`, `revoked_at`

### `refresh_tokens`

`id`, `device_id`, `membership_id`, `token_hash`, `family_id`, `issued_at`, `expires_at`, `rotated_at`, `revoked_at`

### `connections`

`id`, `host_device_id`, `client_device_id`, `transport`, `connected_at`, `disconnected_at`, `disconnect_code`, `bytes_relayed`, `p2p_established_ms`

### `user_accounts`

站点账号（邮箱或知乎衍生账号 id）：`account`, `password_hash`（argon2id，可空）、
`created_at`, `updated_at`, `archived_at`

### `oauth_identities`

知乎 open_id 与账号绑定：`id`, `account`, `zhihu_open_id`, OAuth credential 及过期时间、
`created_at`, `updated_at`

### `user_profiles`

展示资料：`account`, `open_id`, `name`, `headline`, `avatar_url`, `source`, `updated_at`

### `invite_codes`

一次性邀请码：`invite_code`, `inviter_account`, `invitee_account`, `generation_month`,
`created_at`, `used_at`

旧 `admin_sessions`（Admin 密码会话）表已随白名单 Admin 移除。

数据库 schema 明确禁止加入 conversation payload、workspace、session message、tool output 或密钥字段。

## 15. 配置

| 环境变量 | 生产要求 |
| --- | --- |
| `REMOTE_PUBLIC_URL` | 必填，HTTPS URL |
| `REMOTE_SECRET_KEY` | 必填，高熵，不允许默认值 |
| `DATABASE_URL` | 默认 `sqlite:////data/remote.db` |
| `DSH_ADMIN_EMAILS` | Admin 白名单邮箱（逗号分隔）；可选 |
| `DSH_ADMIN_ZHIHU_OPEN_IDS` | Admin 白名单知乎 open_id（逗号分隔）；可选 |
| `STUN_URLS` | 可选 |
| `TURN_URL` | TURN 启用时必填 |
| `TURN_SECRET` | TURN 启用时必填 |
| `PAIRING_TTL_SECONDS` | 默认 600 |
| `ACCESS_TOKEN_TTL_SECONDS` | 短 TTL |
| `REFRESH_TOKEN_TTL_SECONDS` | 可配置并支持轮换 |
| `DSH_ZHIHU_OAUTH_APP_ID` | 可选；配置后启用知乎授权登录 |
| `DSH_ZHIHU_OAUTH_APP_KEY` | 可选；同上 |
| `DSH_WEB_LOGIN_TTL_SECONDS` | web account 会话有效期，默认 28 天 |
| `DSH_INVITE_CODE_MONTHLY_LIMIT` | 每账号每月邀请码上限，默认 10 |
| `DSH_INVITE_CODE` | 可选；站点通用邀请码，可重复使用且不占账号月度配额 |
| `LOG_LEVEL` | 默认 `INFO` |

启动时校验配置、数据库迁移、可写性和 secret 强度。生产安全配置缺失时拒绝启动。

## 15a. 站点账号登录与 Host 归属

- `/pair`、`/app/*` 需要登录；`/guide`、`/` 公开；`/app/admin`（兼容旧
  `/admin`）仅白名单管理员。
- 登录方式一：知乎 OAuth（`/api/v1/auth/oauth/start` → 知乎授权 →
  `/api/v1/auth/oauth/callback` → 同源路径 `?token=`）。`return_to` 只接受站点内部
  绝对路径，不能回调插件自定义 scheme 或外部 URL。
- 登录方式二：邮箱密码，使用邀请码调用 `POST /api/v1/auth/register` 注册，再调用
  `POST /api/v1/auth/login` 登录。
- web account token 为 `typ=web` 的 HS256 JWT，与 device credential 隔离；当前没有
  account refresh 接口，过期后重新登录。已经注册 Host 的后台连接只依赖 device
  refresh token。
- 已注册账号可创建有月度限额的一次性邀请码，且不能使用自己创建的邀请码；可选
  `DSH_INVITE_CODE` 是可重复使用、无 inviter 且不占月度配额的站点通用邀请码。
- Host 注册必须记录 `account -> Host device` 归属。`ACCOUNT_AUTH_REQUIRED` 表示需要
  登录；`DEVICE_OWNERSHIP_REQUIRED` 表示当前账号无权认领该 Host。历史无 owner 的
  Host 只能轮换 identity 或由管理员显式迁移。

## 15b. Admin（账号白名单，无独立入口）

- 账号邮箱命中 `DSH_ADMIN_EMAILS`，或其知乎 open_id 命中
  `DSH_ADMIN_ZHIHU_OPEN_IDS`，即为管理员。
- Admin API 统一要求 web account Bearer token + 白名单判定，普通账号返回 403，
  device token 返回 401；不再使用 Admin 密码、cookie session 或 CSRF 双提交。
- 站点管理并入 `/app` 用户区。`/api/v1/auth/me` 的 `isAdmin` 只用于前端显示；后端
  仍必须对每个 `/api/v1/admin/*` 请求重新鉴权。

## 16. SQLite 与迁移

- SQLAlchemy 2 typed models。
- Alembic 管理所有 schema 变更。
- 开启 foreign keys、WAL 和 busy timeout。
- 事务完成 pairing confirm、membership 创建和 token 签发。
- 清理任务只删除过期临时 pairing/token，不删除审计所需的 revoke 事实。
- 单进程/少量 worker 是 SQLite MVP 的部署边界；扩展到多实例前迁移 Postgres 和外部 presence store。

## 17. 日志与指标

允许记录：requestId、connectionId、截断 deviceId、route、status、transport、duration、bytes、error code、状态迁移。

禁止记录：Authorization、Cookie、refresh token、pairing code 明文、private/shared key、TURN secret、E2EE payload、prompt、source code、workspace、tool output。

MVP 指标：

- active Host/Client connections
- pairing 成功/失败/过期/限速
- P2P/TURN/Relay 比例
- connection establishment time
- reconnect/disconnect count
- relay bytes 和 slow consumer
- DB/TURN readiness

## 18. 安全控制

- REST 使用严格 Pydantic schema；未知字段按 endpoint 风险决定拒绝。
- Pairing、login、refresh、register、WebSocket hello 独立限速。
- 所有设备查询从 token subject 的 membership 反查，防止 IDOR。
- Host 注册校验 web account 与既有 `owner_account`；公开的 deviceId/public key 不能
  用于跨账号认领 Host。
- Admin 仅接受白名单账号的 web account Bearer token；普通 web token 与 device
  token 一律拒绝。
- WebSocket 浏览器 Origin 只允许 `REMOTE_PUBLIC_URL`。
- Static 站点启用严格 CSP、HSTS、`X-Content-Type-Options` 和 frame 限制。
- Token hash 存储、refresh rotation 和 reuse detection。
- Device revoke 同时撤销 token、membership 和现有连接。
- Server 不具有 E2EE identity private key，无法伪造可信 Client。

## 19. Admin 功能

Admin 页面并入同一 React 站点的 `/app` 用户区（`/app/admin`，兼容旧 `/admin`）。
导航栏没有独立 Admin 入口；白名单管理员在用户区看到「站点管理」标签页，
`/api/v1/admin/*` 统一依赖 web account Bearer token 和 Admin 白名单。

MVP 页面：Health、Devices、Connections、Pairings、Settings。Settings 对环境变量驱动字段只读并脱敏。Admin 能撤销设备和取消 active pairing，但不能查看 Remote 会话内容。

## 20. 核心测试策略

只覆盖 Server 核心安全和状态行为：

- pairing create/claim/confirm/reject/expire/single-use/rate-limit
- membership 授权与 IDOR
- token rotation/reuse/revoke
- Host account authorization、owner 归属与跨账号/legacy Host 拒绝
- WebSocket hello auth、origin、replacement
- signaling target authorization
- relay membership、frame limit、backpressure
- device revoke 后实时断连
- Admin/web account/device auth 隔离
- 数据模型和日志不接收业务明文

静态页面托管、Admin 普通筛选、视觉样式、状态标签和非关键 doctor 展示不单独写测试。

## 21. 部署

标准 Compose：

```text
remote-server
  - FastAPI
  - React dist
  - /data/remote.db

coturn
  - shared TURN secret

caddy/nginx（可选）
  - TLS
  - HTTPS/WSS reverse proxy
```

对外只有一个站点 URL；TURN 另开放其协议所需端口。备份 `/data/remote.db` 与 Server secret，绝不备份客户端/Host private key（它们不应存在于 Server）。

## 22. 实现顺序

1. 配置、数据库、迁移和统一站点静态路由。
2. 设备注册、token 和 pairing 状态机。
3. membership 与设备查询授权。
4. WebSocket hello 和 ConnectionHub。
5. signaling 与 opaque Relay。
6. Admin health/devices/connections/pairings。
7. rate limit、revoke、backpressure 和日志脱敏。
8. TURN credential 和 Docker Compose。
9. 根据 [protocol.md](protocol.md) 完成互操作验收。
