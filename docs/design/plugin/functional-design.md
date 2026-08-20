# Harness Remote Plugin 功能设计

状态：Draft v0.2
目标项目：`packages/plugin`

## 1. 唯一业务接入面

Plugin 只使用官方 `@deepseek-ai/dsh-host-apiproxy/api`。它不读取或解释
`SessionStore`、`AgentRegistry`、Workspace 或 Approval 内部对象，也不把 Harness
事件重新投影成另一套 Remote Session/Message/Tool/Permission 模型。

```text
本地 Harness UI
  -> ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> authenticated Remote channel
  -> HarnessApiBridge allowlist
  -> Host ApiProxy
  -> 远端 Harness
```

远端调用仍使用 Harness 原生 `RpcRequest`、`RpcResponse`、`MuxFrame`、`HostFrame`
和 `ClientResponse`。Plugin 只负责传输、关联、流生命周期与安全检查。

## 2. 模块结构

```text
packages/plugin/src/
  index.ts                    Cordis 生命周期与服务装配
  config.ts                   配置解析
  service.ts                  Host runtime
  identity-store.ts           设备身份和本地 trusted peer
  server-credentials.ts       device credential
  server-api.ts               Server REST client
  server-connection.ts        Host control/relay/Noise 连接
  connection-controller.ts    单一认证 peer 与业务通道
  rpc-router.ts               仅接受 ApiProxy tunnel RPC
  harness-api-bridge.ts       Host ApiProxy allowlist 与原生流
  remote-directory-browser.ts native picker 场景的只读目录元数据兜底
  remote-api-proxy.ts         Client 侧 ApiProxy 实现
  api-proxy-switch.ts         Local/Remote 目标切换
  client-runtime.ts           Desktop Client runtime
  control-runtime.ts          loopback-only 设置与账号授权控制面
  client-secure-transport.ts  Client Noise IK
  client.ts                   Desktop Web client face
  logging.ts                  脱敏日志
```

不再存在 session/agent/workspace/permission adapters、Remote event sequencer、
replay buffer 或自定义 pending approval 状态机。

## 3. 插件生命周期

```ts
export const name = 'dsh-remote'

export function apply(ctx, config) {
  ctx.inject(['settings', 'apiProxy', 'connection'], runtimeCtx => activate(runtimeCtx, config))
}
```

`apply(ctx, config)`：

1. 顶层 Bundle entry 立即完成激活，不把远端插件依赖变成 Harness 主服务的启动条件。
2. 在隔离的依赖 scope 中等待 `settings`、`apiProxy` 和 `connection`；缺失时仅停用远端功能。
3. 校验配置并按规范化 Server origin 选择隔离的身份目录。
4. 读取 Host `apiProxy`，为每条认证 Client connection 创建隔离的 allowlist bridge。
5. 创建常驻 Host runtime；Server、ApiProxy 和 Web connection 可用时同时创建后台 Remote runtime。
6. 在 `ctx.effect()` 中启动出站 Server 连接，退出时关闭原生流、secure channel 和控制连接。

Plugin 不订阅 `session/created`、`session/event`、`agent/status` 或
`approval/request`。这些语义由 ApiProxy 的 mux/host stream 和 `respond()` 原样承担。

## 4. Host ApiProxy bridge

Remote 业务 RPC 只有：

- `harness.api.call`
- `harness.api.respond`
- `harness.api.stream.open`
- `harness.api.stream.close`

`harness.api.call` 的 `method` 必须命中代码内固定 allowlist。当前允许会话、子 Agent、
Workspace、Skill、Agent Preset、Goal、Host 描述和只读 LLM 目录等原生 UI 所需操作。
`commands.list` 与 `commands.execute` 经官方 Typert gateway 分发，以覆盖原生 UI 的
"+" 命令菜单。Remote 使用 Host 对当前 Agent 解析出的有效命令目录和 handler，因而与
本地 Harness UI 保持一致；它只能执行 Host 已注册的命令，不构成任意方法调用入口。

`host.listDirectory` 是 Workspace picker 的唯一文件系统相关能力。优先转发 Harness browse
capability；若桌面 Harness 只提供 native picker，则 bridge 以只读实现返回同形状的单层目录
元数据。结果有数量上限，不包含文件内容，也不允许目录写入。

明确禁止：

- credentials 和 settings 读写；
- native path open/picker；
- 文件内容访问、目录创建/修改/删除或通用文件系统 RPC；
- attachment、download；
- 任意 Cordis service、Harness tool 或反射调用。

Host 可同时服务来自不同 `clientDeviceId` 的连接；RPC pending、stream namespace 和 stream
上限均按 `connectionId` 隔离。每条连接最多打开三个原生流（host、当前 mux、mux 切换缓冲）。同一 Client 设备重连只替换
它自己的旧连接；连接替换、撤销或断开时，只 abort 该连接的 mux/host iterator。Plugin
卸载时才关闭全部连接和流。

## 5. Client ApiProxy

`RemoteHarnessApiProxy` 实现与本机相同形状的 `ApiProxy`：

- unary method 转成 `harness.api.call`；
- `respond()` 转成 `harness.api.respond`；
- `events.mux()` / `events.host()` 转成远端 stream open/close；
- 原生 `rpcId` 保持不变，Remote envelope id 只负责隧道层关联。

`ApiProxySwitch` 向官方 Web UI 暴露稳定对象。选择 Remote 后所有新调用解析到远端
proxy；连接意外关闭时立即回落 Local 并结束旧流。

Desktop UI 不提供 Client 模式切换。侧边栏始终只有一个 Remote 工作区入口：

- 设备列表过滤本机 Host deviceId；
- 展示规范化系统名称、Harness 版本、Plugin 版本与在线状态；
- 选择已有 Workspace，或浏览远端目录后调用 `workspace.create`；
- Remote 激活后显示独立顶部 Header、连接链路、端到端加密说明和退出链接。

## 6. 安全连接

业务桥只在以下条件全部成立后可见：

- Server active membership 与目标连接一致；
- 双方账号授权的 peer descriptor 与本地 pinned key 完全一致；
- Noise IK transcript 成功绑定 connectionId、Host 和 Client；
- relay counter 连续且密文认证成功。

Server 只看到控制元数据和 ciphertext。Host 不监听公网端口。

## 7. 权限语义

Approval 和 Question 使用 ApiProxy 原生 mux `ServerRequest`，Client 通过原生
`ClientResponse` 回答。Plugin 不创造第二套 permission id、decision enum 或超时状态机。

Host ApiProxy/Harness 仍是唯一权限裁决者。Plugin 只允许回答当前原生流实际发出的
rpcId，并按 `connectionId` 分别记录可回答集合；晚到、重复或格式错误的回答由 Host
ApiProxy 拒绝。连接断开会关闭原生流，
不能继续提交旧回答。

## 8. 核心测试

- ApiProxy allowlist 允许预期方法并拒绝敏感方法。
- unary response 保留内层 rpcId。
- mux/host frame 转发与 close reason 正确。
- 未认证、错误 identity/membership、篡改和重放 fail closed。
- peer 替换或断开时关闭全部原生流。
- Local/Remote switch 可逆，远端断开回落 Local。
- Host/Client account token 与 device token 隔离，主机匹配码单次消费，refresh single-flight。

Android 使用相同 ApiProxy-only 数据面；其 UI 和生命周期独立，不构成 Desktop Plugin 的组件兼容要求。
