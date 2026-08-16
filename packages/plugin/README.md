# @dsh-remote/plugin

DeepSeek Harness 的 Host + Remote 工作区插件。一次安装同时提供：

- Host runtime：让当前 Harness 接受来自自有设备的加密远程操作。
- Remote workspace：在当前 Harness UI 中选择另一台 Host 及其工作区。

用户不需要启动或切换 Client 模式。选择 Remote 工作区后，本地 Web UI 保持不变，稳定的 `ApiProxySwitch` 将新请求路由到远端 `RemoteHarnessApiProxy`；断线或退出时恢复本地 ApiProxy。

## 用户流程

1. 在插件设置中配置 Server，并用网页生成的一次性设备授权码注册 Host；独立 Remote 身份通过 `owned_device` 自动继承账号归属。
2. 从侧边栏 **Remote** 打开模态框。
3. 选择同账号的在线 Host。当前 Host 会被排除；列表显示 macOS、Windows 或 Linux，以及 Harness 和插件版本。
4. 选择已有 Workspace，或点击 **+** 浏览远端目录并创建 Workspace。
5. 进入远程工作区后，通过顶部 Header 查看主机、LAN/P2P/TURN/Relay 路径和端到端加密状态；点击 **退出** 回到本地。

## 目录浏览

Remote picker 首先调用远端 Harness 的 `host.listDirectory`。若远端 Harness 组合的是桌面 `native` picker，插件 Host bridge 会在已认证、端到端加密的连接内提供只读目录元数据兜底。

目录能力仅返回单层子目录、绝对路径、面包屑、Home 路径和隐藏标志，并限制单次结果数量。它不读取文件内容，不提供文件操作，也不允许创建、修改或删除目录。

## 架构

```text
本地 Harness UI
  -> ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> Adaptive transport (LAN / P2P / TURN / Relay)
  -> Noise IK secure channel
  -> HarnessApiBridge allowlist
  -> 远端 Harness ApiProxy
```

主要模块：

- `service.ts`：Host runtime 与连接生命周期。
- `client-runtime.ts`：设备列表、连接、远程目录和 Workspace 操作。
- `client.ts`：设置卡片、Remote 模态框、侧边栏入口和远程 Header。
- `harness-api-bridge.ts`：固定 ApiProxy allowlist、unary、respond 与 stream bridge。
- `remote-directory-browser.ts`：native picker 场景下的只读目录兜底。
- `server-api.ts` / `server-connection.ts`：账号设备 API 与 Host 控制连接。
- `identity-store.ts` / `server-credentials.ts`：按 Server origin 和角色隔离的身份与凭证。

## 安全模型

- Host 只建立出站 HTTPS/WSS 连接，不监听公网端口。
- Host 与 Client 使用长期 X25519 identity key 和 Noise IK 相互认证。
- Server membership 和本地 pinned peer key 必须同时匹配。
- 每个 Client connection 拥有独立的 secure channel、RPC pending 和 stream registry。
- ApiProxy method 必须命中代码内 allowlist；未知或敏感方法 fail closed。
- 禁止 Shell、PTY、远程桌面、credentials/settings、native open/picker、目录写入、文件内容、attachment、download 和 Cordis service 反射。

身份数据位于 `$DSH_HOME/remote/servers/<origin-hash>/{host,client}`。Unix 私钥必须为 `0600`；损坏或权限过宽的 key 会被拒绝，不会静默替换。

## 配置

插件设置写入 `$DSH_HOME/settings.yaml` 的 `dsh-remote` namespace，重启后应用。也可以设置：

```sh
export DSH_REMOTE_SERVER=https://dsh.r2049.cn
```

生产 Server 必须使用 HTTPS/WSS。Host 和 Remote 身份使用独立 deviceId、identity key 和 token，但可以通过 `register-owned-role` 继承同一账号归属。

## 安装与构建

DSH Desktop GitHub 安装：

```text
github:liguobao/deepseek-harness-remote#v0.2.23
```

本地验证：

```sh
pnpm --filter @dsh-remote/plugin check
pnpm --filter @dsh-remote/plugin test
pnpm --filter @dsh-remote/plugin build
```

根包提供 GitHub Bundle manifest；本包是 npm 发布和 CI artifact 边界。构建会生成 `dist/index.js`、`dist/client.js` 和 GitHub client bundle。

## 兼容边界

Plugin 使用官方 `@deepseek-ai/dsh-host-apiproxy/api`，不维护第二套 Session、Event 或 Permission 协议。Server、Remote Web 和 Admin runtime 不在本仓库实现。协议详情见 [Remote Protocol](../../docs/protocol.md)，Server 接入见 [Plugin integration](../../docs/plugin-integration.md)。
