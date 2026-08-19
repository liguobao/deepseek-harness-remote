# ds-harness-remote

English | 中文

## Overview / 概览

DeepSeek Remote plugin for DSH Host + Remote workspaces. One install provides encrypted remote access from your own devices and remote workspace switching inside the existing Harness UI.

DeepSeek Remote 是 DSH Host + Remote 工作区插件。一次安装可提供本地设备到远端的加密远程访问能力，以及在现有 Harness UI 内切换远端工作区。

No Client mode switch is required. Choosing a remote workspace keeps the local UI unchanged, routes requests through `RemoteHarnessApiProxy`, and falls back to local ApiProxy on disconnect or exit.

无需启动或切换 Client 模式。选择远端工作区后，本地 UI 不变，请求通过 `RemoteHarnessApiProxy` 路由，断线或退出时恢复本地 ApiProxy。

## User flow / 用户流程

1. Open **Remote** from the sidebar and log in first (preferred entry).
2. After login, you can enable remote control for the current device.
3. Select an online Host, then enter an existing workspace or create/browse one remotely.
4. Use **Exit** to return local and stop forwarding.

1. 从侧边栏优先打开 **Remote** 入口并登录。  
2. 登录后可开启当前设备的远程控制。
3. 选择同账号在线 Host 后，进入已有 Workspace，或浏览远端目录创建/选择 Workspace。
4. 使用 **退出** 回到本地并停止转发。

## Directory browsing / 目录浏览

- Calls remote `host.listDirectory` first.
- Returns read-only metadata only: one-level children, absolute path, breadcrumbs, Home, hidden flag.
- No file contents, no file writes, no directory create/rename/delete.

- 默认先调用远端 `host.listDirectory`。
- 仅返回只读元数据：单层子目录、绝对路径、面包屑、Home、隐藏标记。
- 不读文件内容，不改文件系统，不建/改/删目录。

## Architecture / 架构

```text
Local Harness UI
  -> ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> Adaptive transport (LAN / P2P / TURN / Relay)
  -> Noise IK secure channel
  -> HarnessApiBridge allowlist
  -> Remote Harness ApiProxy
```

```text
本地 Harness UI
  -> ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> 自适应传输（LAN / P2P / TURN / Relay）
  -> Noise IK 安全通道
  -> HarnessApiBridge allowlist
  -> 远端 Harness ApiProxy
```

## Key modules / 核心模块

- `service.ts`: Host lifecycle / Host 生命周期
- `client-runtime.ts`: device list, connection, workspace actions / 设备列表、连接、工作区操作
- `client.ts`: settings UI, remote modal, sidebar, remote header / 设置卡片、Remote 弹窗、侧边栏、远端 Header
- `harness-api-bridge.ts`: ApiProxy allowlist and stream bridge / ApiProxy 白名单与 stream 桥接
- `identity-store.ts` / `server-credentials.ts`: account-scoped identity and credentials / 账号隔离的身份与凭证

## Security model / 安全模型

- Host only makes outbound HTTPS/WSS connections.
- Host/Client authenticate with long-lived X25519 keys using Noise IK.
- ApiProxy methods are allowlist-driven (fail-closed).
- Directory browsing is metadata-only.
- Sensitive capabilities are disabled, including shell, PTY, remote desktop, and file operations.
- Data is stored under `$DSH_HOME/remote/servers/<origin-hash>/{host,client}`. Unix private keys must be `0600`.

- Host 仅发起外连 HTTPS/WSS，不开放公网监听。
- Host/Client 使用长期 X25519 key + Noise IK 进行相互认证。
- ApiProxy 仅允许白名单方法（未命中即拒绝）。
- 目录浏览仅返回元数据，不涉及文件读写。
- Shell、PTY、远程桌面、文件操作等高风险能力已禁用。
- 数据位于 `$DSH_HOME/remote/servers/<origin-hash>/{host,client}`，私钥权限需 `0600`。

## Configuration and install / 配置与安装

Settings are written to `$DSH_HOME/settings.yaml` under `dsh-remote` (restart required).

配置写入 `$DSH_HOME/settings.yaml` 的 `dsh-remote`（重启后生效）。

```sh
export DSH_REMOTE_SERVER=https://dsh.r2049.cn
```

Install the npm package for the `web` profile:

通过 npm 包安装到 `web` profile：

```sh
dsh plugin --profile web add ds-harness-remote
```

Alternatively, install the pinned GitHub release in DSH Desktop or with the CLI:

也可以在 DSH Desktop 中安装固定版本的 GitHub Release，或使用命令行安装：

```text
github:liguobao/deepseek-harness-remote#v0.3.14
```

```sh
dsh plugin --profile web add "github:liguobao/deepseek-harness-remote#v0.3.14"
```

GitHub / 项目地址：<https://github.com/liguobao/deepseek-harness-remote>
