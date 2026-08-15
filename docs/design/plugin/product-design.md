# Harness Remote Plugin 产品设计

状态：Draft v0.2
目标项目：`packages/plugin`

## 1. 产品定位

Remote Plugin 同时承担 Host 和 Desktop Client 两个角色。Host 把官方 Harness
`ApiProxy` 的安全子集接入端到端加密通道；Client 让官方 Harness UI 在 Local 与同账号
Remote Host 之间切换。

Plugin 是受控数据网关，不是独立 Agent、远程 Shell，也不重新实现 Harness 会话协议。

## 2. 核心用户路径

1. 远端 Harness 选择 Host，用网页生成的一次性设备授权码完成设备接入。
2. 本地 Harness 选择 Client，用相同 Server 和相同账号完成设备接入。
3. Server 自动建立同账号 membership，双端从受保护设备详情固定对端公钥。
4. 本地侧边栏选择 Remote Host，官方 Harness UI 通过远端 ApiProxy 工作。
5. 选择 Local 或远端连接断开时，UI 回到本机 ApiProxy。

## 3. MVP 范围

- Cordis 生命周期与 GitHub/npm Bundle 入口。
- 站点账号授权 Host/Client 注册；当前 Host 设置页仅开放一次性设备授权码，账号 token 与 device token 隔离。
- 按 Server origin 与 Host/Client 角色隔离身份和 credential。
- 同账号 membership、双端 pinned peer 与设备撤销。
- Host 主动建立 WSS，Relay 上运行 Noise IK。
- ApiProxy 固定 allowlist、unary call、respond、mux/host stream。
- Desktop Local/Remote switch 和断线回落。
- Settings 插件卡片、侧边栏目标入口和脱敏诊断。

## 4. 非目标

- Android Client 当前不在 MVP 可用链路中。
- 不兼容旧 `sessions.* / session.* / permissions.respond / sync.from` 业务协议。
- 不启动公网监听端口。
- 不提供 PTY、SSH、远程桌面、文件浏览器或任意 Harness tool RPC。
- 不代理 credentials、settings、native path、任意目录、附件或下载 API。
- 不在本仓库实现 Server、Remote Web 或 Admin runtime。

## 5. 权限体验

远端 UI 看到并回答的是 Harness ApiProxy mux 原生 approval/question frame。Plugin 不翻译
permission 数据，也不新增授权范围。最终裁决、过期、重复响应和取消均由 Host Harness
的官方 ApiProxy/approval 实现负责。

## 6. 安全承诺

- Host 私钥始终留在本机。
- Server 不能读取 Remote Harness 业务内容。
- Server membership 与 Host 本地 trusted peer 必须同时成立。
- 每个业务请求绑定 Noise connection、Host、Client 与递增 counter。
- Host 方法白名单禁止敏感本地 API；未知方法 fail closed。
- 撤销设备或断开连接后，旧 stream 和旧回答不能继续使用。

## 7. MVP 验收

1. npm 子包与 GitHub 根包均可由 DSH Desktop 识别加载。
2. Host 不监听公网端口，只建立出站连接。
3. Host 完成账号授权注册后只使用 device credential 常驻。
4. Host/Client 同账号注册后自动获得 membership，并固定对端 identity key。
5. 本地 Harness 可选择同账号 Host，通过官方 UI 创建和继续远端会话。
6. Remote unary、mux/host stream 与 approval response 全部经过 ApiProxy allowlist。
7. 远端连接关闭后 Client 结束旧流并回落 Local。
8. Relay capture 无法解密 payload；篡改、重放和 identity mismatch 被拒绝。
