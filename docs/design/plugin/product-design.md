# Harness Remote Plugin 产品设计

状态：Draft v0.1
目标项目：`packages/plugin`
包名：npm 子包为 `@dsh-remote/plugin`；DSH Desktop GitHub 安装边界为仓库根包 `deepseek-harness-remote`

## 1. 产品定位

Remote Plugin 同时承担两个角色：在远端机器上作为可信 Host，把 Harness 会话与权限系统映射到 Remote Protocol；在本地机器上作为 Client，把官方 Harness UI 的目标在 Local 与已配对 Remote Host 之间切换。代码、会话明文和执行权限始终留在被选中的 Host。

它不是独立 Agent、远程 shell 或 Harness 的替代服务。

## 2. 用户

主要用户是在多台机器运行 DeepSeek Harness，希望从本机原生 Harness UI 或 Android 继续远端任务的开发者。

用户期望：

- 一次安装后即可随 Harness 启动。
- 不配置端口转发，不暴露本机公网端口。
- 能明确看到配对码、当前连接和远端设备。
- 新设备绑定必须由 Host 确认。
- 远端权限决定与本机 Harness 权限语义一致。
- 网络断开后自动恢复，不影响本地 Harness 继续运行。
- Local/Remote 切换不迁移、合并或覆盖任一侧会话。

## 3. 核心任务

### 3.1 启用 Remote

用户安装插件并通过 Cordis patch 或 profile 配置加载。Harness 启动后终端显示：设备名称、设备 ID、Server、配对码、过期时间和连接状态。

### 3.2 配对新设备

Host 生成临时设备码。Client claim 后，Host 显示 Client 名称与公钥 fingerprint。用户允许后才建立长期信任；拒绝或超时不留下 membership。

### 3.3 继续 Harness 会话

可信 Client 可以读取 Host/工作区状态、查看和创建会话、发送消息、停止当前生成，并订阅会话、工具和 Agent 状态事件。

### 3.4 从本地 Harness 切换目标

Plugin Client face 在侧边栏提供目标入口。选择 Remote Host 后页面刷新，官方 Harness Runtime 仍使用同一个本地 HTTP/WebSocket carrier，但 Node 侧 `apiProxy` 将 allowlisted 调用转发到远端。选择 Local 恢复本机 API；两边 SessionId 空间不合并，切换不触发复制。

### 3.5 处理权限请求

Harness 发起 approval 时，Plugin 将请求上下文发送给可信 Client。MVP 只暴露 Harness 已确认支持的 `Allow once` 和 `Deny`。没有可信 Client、请求超时、Client 断开或适配器异常时必须 fail closed。

### 3.6 诊断连接

Host 提供清晰日志和 doctor 信息：插件是否加载、身份是否有效、Server 是否可达、signaling 是否连接、STUN/TURN 是否配置、当前传输与最近错误码。

## 4. MVP 范围

- Cordis 生命周期加载与卸载。
- 持久设备身份和可信设备列表。
- Host 主动建立 WSS 出站连接。
- 创建配对、Host 确认和撤销设备。
- System、workspace、session 和 permission RPC 适配。
- Harness 会话事件到 Remote Event 的实时映射。
- 心跳、指数退避重连和连接状态输出。
- Relay 安全通道；P2P/TURN 通过统一传输接口后续启用。
- 不包含敏感正文的本地日志。
- DSH bundle/client metadata、侧边栏目标入口和可逆 `apiProxy` switch。
- 原生 Harness API allowlist、mux/host 流转发和断线回落 Local。

## 5. 非目标

- 不启动监听 `0.0.0.0` 的 HTTP/WebSocket 服务。
- 不提供 PTY、SSH、VNC、文件浏览器或任意 shell API。
- 不修改 DeepSeek Harness 源码或用户现有 `cordis.patch.yml`。
- 不自动接受权限，不设置比 Harness 更宽松的策略。
- 不在 Plugin 中实现账户、组织、计费或多人协作。
- 不代理 credentials、settings 写入、任意目录/文件、native open、附件或下载 API。

## 6. 主机侧体验

终端输出应短、稳定、可复制：

```text
DSH Remote
Device: Workstation (01K...)
Server: https://remote.example.com
Status: Online · Relay ready
Pair: 82KF-7QMP (expires in 10m)
```

待确认设备：

```text
DSH Remote on Pixel wants to connect
Fingerprint: F4A2 992C 13AB
Allow from the local Harness UI or CLI prompt
```

不输出 token、私钥、完整 prompt、源文件内容和 TURN 密码。

## 7. 安全与信任承诺

- Host 私钥始终留在本机。
- Server 知道设备在线状态，但不能读取 Remote 会话业务内容。
- Client 权限不高于 Harness 本机权限。
- 每个 RPC 都绑定已配对 Client、目标 Host 和连接上下文。
- 设备撤销后，新旧连接都不能继续发送业务请求。

## 8. 成功指标

- 首次启动到显示可用配对码不超过 5 秒（Server 可达时）。
- 已配对设备在普通断网恢复后 10 秒内重新连通。
- 会话事件在 Relay 模式下 P95 端到端延迟低于 500 ms（不含模型生成耗时）。
- 所有远端允许操作都能追溯到一个 Harness approval request。
- Server 被替换为不可信实现时，仍无法伪造已配对 Client 或解密会话载荷。

## 9. MVP 验收

1. npm 子包或 GitHub 根包均通过各自的 bundle patch 和同名 client metadata 加载，不修改 Harness 核心。
2. Host 不监听公网端口，只建立出站连接。
3. Host 可生成设备码并确认/拒绝 Client。
4. 本地 Harness 可选择已配对 Host，刷新后通过原生会话 UI 创建/继续远端会话。
5. Android Client 发送消息后，真实 Harness Agent 收到并执行。
6. `assistant/chunk`、工具和状态事件实时转发。
7. Harness approval 可由 Remote Client `Allow once` 或 `Deny`，且断线/超时 fail closed。
8. 插件卸载时网络、定时器、原生流和 pending approval 全部清理。
