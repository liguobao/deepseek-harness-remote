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
  pairing-controller.ts       配对确认
  connection-controller.ts    单一认证 peer 与业务通道
  rpc-router.ts               仅接受 ApiProxy tunnel RPC
  harness-api-bridge.ts       Host ApiProxy allowlist 与原生流
  remote-api-proxy.ts         Client 侧 ApiProxy 实现
  api-proxy-switch.ts         Local/Remote 目标切换
  client-runtime.ts           Desktop Client runtime
  control-runtime.ts          loopback-only 设置与配对控制面
  client-secure-transport.ts  Client Noise IK
  client.ts                   Desktop Web client face
  logging.ts                  脱敏日志
```

不再存在 session/agent/workspace/permission adapters、Remote event sequencer、
replay buffer 或自定义 pending approval 状态机。

## 3. 插件生命周期

```ts
export const name = 'dsh-remote'
export const inject = ['apiProxy']
```

`apply(ctx, config)`：

1. 校验配置并按规范化 Server origin 选择隔离的身份目录。
2. 读取必需的 Host `apiProxy`，创建 allowlist bridge。
3. 创建 Host runtime；按角色选择是否创建 Desktop Client runtime。
4. 在 `ctx.effect()` 中启动出站 Server 连接，退出时关闭原生流、secure channel 和控制连接。
5. 通过可选的 `settings` 与 `connection` 服务提供插件设置和 loopback 控制面。

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

明确禁止：

- credentials 和 settings 读写；
- native path open/picker；
- 任意目录枚举或创建；
- attachment、download；
- 任意 Cordis service、Harness tool 或反射调用。

每条连接最多打开两个原生流。连接替换、撤销、断开或 Plugin 卸载时，必须 abort
全部 mux/host iterator。

## 5. Client ApiProxy

`RemoteHarnessApiProxy` 实现与本机相同形状的 `ApiProxy`：

- unary method 转成 `harness.api.call`；
- `respond()` 转成 `harness.api.respond`；
- `events.mux()` / `events.host()` 转成远端 stream open/close；
- 原生 `rpcId` 保持不变，Remote envelope id 只负责隧道层关联。

`ApiProxySwitch` 向官方 Web UI 暴露稳定对象。选择 Remote 后所有新调用解析到远端
proxy；连接意外关闭时立即回落 Local 并结束旧流。

## 6. 安全连接

业务桥只在以下条件全部成立后可见：

- Server active membership 与目标连接一致；
- Client deviceId/public key 与 Host 本地 trusted peer 完全一致；
- Noise IK transcript 成功绑定 connectionId、Host 和 Client；
- relay counter 连续且密文认证成功。

Server 只看到控制元数据和 ciphertext。Host 不监听公网端口。

## 7. 权限语义

Approval 和 Question 使用 ApiProxy 原生 mux `ServerRequest`，Client 通过原生
`ClientResponse` 回答。Plugin 不创造第二套 permission id、decision enum 或超时状态机。

Host ApiProxy/Harness 仍是唯一权限裁决者。Plugin 只允许回答当前原生流实际发出的
rpcId；晚到、重复或格式错误的回答由 Host ApiProxy 拒绝。连接断开会关闭原生流，
不能继续提交旧回答。

## 8. 核心测试

- ApiProxy allowlist 允许预期方法并拒绝敏感方法。
- unary response 保留内层 rpcId。
- mux/host frame 转发与 close reason 正确。
- 未认证、错误 identity/membership、篡改和重放 fail closed。
- peer 替换或断开时关闭全部原生流。
- Local/Remote switch 可逆，远端断开回落 Local。
- Host account token 与 device token 隔离，refresh single-flight。

Android 目前不在这条实现线上；其旧自定义 Remote RPC 代码不构成 Plugin 兼容要求。
