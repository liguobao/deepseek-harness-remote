# ds-harness-remote

English | 中文

## Overview / 概览

DeepSeek Remote plugin for DSH Host + Remote workspaces. One install provides encrypted remote access from your own devices and remote workspace switching inside the existing Harness UI.

DeepSeek Remote 是 DSH Host + Remote 工作区插件。一次安装可提供本地设备到远端的加密远程访问能力，以及在现有 Harness UI 内切换远端工作区。

No Client mode switch is required. Choosing a remote workspace keeps the local UI unchanged, routes requests through `RemoteHarnessApiProxy`, and falls back to local ApiProxy on disconnect or exit.

无需启动或切换 Client 模式。选择远端工作区后，本地 UI 不变，请求通过 `RemoteHarnessApiProxy` 路由，断线或退出时恢复本地 ApiProxy。

## User flow / 用户流程

1. Open **Remote** from the sidebar.
2. Sign in with GitHub or Zhihu QR authorization, or with your account and password. New password accounts can register through [Remote Web](https://dsh.r2049.cn/app/register); the site shows the current invitation requirements.
3. Enable remote control for the current computer, or select another online device to control it directly.
4. Enter an existing workspace or browse remote directories to open one. Use **Exit** to return local and stop forwarding.

1. 从侧边栏打开 **Remote** 入口。
2. 使用 GitHub/知乎扫码授权登录，或使用账号密码登录。新的账号密码用户可从 [Remote Web](https://dsh.r2049.cn/app/register) 注册，当前邀请要求以站点页面为准。
3. 为当前机器启用远端控制，或直接选择另一台在线设备并控制它。
4. 进入已有 Workspace，或浏览远端目录后打开 Workspace；使用 **退出** 回到本地并停止转发。

## Harness rc.2 images / Harness rc.2 图片

With DSH `dsh-v0.1.1-rc.2`, the native conversation UI can send images through
`session.prompt` and render them through the read-only `session.attachment`
lookup. Large native ApiProxy envelopes use bounded 512 KiB transfer chunks;
image preprocessing, DeepSeek Files API upload, and file-id reuse stay on the
Host in the official adapter.

使用 DSH `dsh-v0.1.1-rc.2` 时，原生会话 UI 可通过 `session.prompt` 发送图片，并通过只读
`session.attachment` 回读显示。较大的原生 ApiProxy envelope 使用受限的 512 KiB 分块；
图片预处理、DeepSeek Files API 上传与 file-id 复用仍由 Host 官方 adapter 完成。

## Directory browsing / 目录浏览

- Calls remote `host.listDirectory` first.
- Returns read-only metadata only: one-level children, absolute path, breadcrumbs, Home, hidden flag.
- The picker does not read file contents and never writes or mutates directories.

- 默认先调用远端 `host.listDirectory`。
- 仅返回只读元数据：单层子目录、绝对路径、面包屑、Home、隐藏标记。
- Workspace 选择器不读取文件内容，也不改文件系统、不建/改/删目录。

## Remote File Viewer / 远端文件查看

Install `dsh-file-viewer` on the Host and Client profiles to reuse its in-app
renderers for remote workspace files. Remote exposes only `stat`, bounded
`readRange`, and directory `list` over the authenticated encrypted channel.
Each transport read is capped at 512 KiB and larger viewer reads are assembled
from multiple chunks. Provider root/locator authorization remains in File Viewer.

在 Host 与 Client profile 中安装 `dsh-file-viewer` 后，可复用其内置渲染器查看远端
Workspace 文件。Remote 仅在认证加密通道中开放 `stat`、受限 `readRange` 与目录 `list`；
每个传输分块最多 512 KiB，更大的读取由客户端自动拼接。根目录与 locator 权限继续由
File Viewer provider 校验。

Remote preview never exposes write/delete/upload/execute, `openExternal`, or a
general filesystem RPC.

远端预览不开放写入、删除、上传、执行、`openExternal` 或通用文件系统 RPC。

## Architecture / 架构

```text
Local Harness UI
  -> ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> Adaptive transport (LAN / P2P / TURN / Relay)
  -> Noise IK secure channel
  -> HarnessApiBridge allowlist
  -> Remote Harness ApiProxy / FileViewerHost read-only bridge
```

```text
本地 Harness UI
  -> ApiProxySwitch
  -> RemoteHarnessApiProxy
  -> 自适应传输（LAN / P2P / TURN / Relay）
  -> Noise IK 安全通道
  -> HarnessApiBridge allowlist
  -> 远端 Harness ApiProxy / FileViewerHost 只读桥
```

## Key modules / 核心模块

- `service.ts`: Host lifecycle / Host 生命周期
- `client-runtime.ts`: device list, connection, workspace actions / 设备列表、连接、工作区操作
- `client.ts`: settings UI, remote modal, sidebar, remote header / 设置卡片、Remote 弹窗、侧边栏、远端 Header
- `harness-api-bridge.ts`: ApiProxy allowlist and stream bridge / ApiProxy 白名单与 stream 桥接
- `file-viewer-bridge.ts`: bounded File Viewer read bridge / 受限 File Viewer 读取桥
- `identity-store.ts` / `server-credentials.ts`: account-scoped identity and credentials / 账号隔离的身份与凭证

## Security model / 安全模型

- The Harness Host does not require a public listening port. Clients can connect from anywhere with internet access over a bidirectional end-to-end encrypted channel.
- Host/Client authenticate with long-lived X25519 keys using Noise IK.
- ApiProxy methods are allowlist-driven (fail-closed).
- Workspace-picker browsing is metadata-only. Optional File Viewer preview is read-only, bounded, and provider-authorized.
- Remote does not expose a direct shell, PTY, general tool RPC, remote desktop, or direct file-mutation API. Harness tools may still modify files or run commands under the Host's normal permission controls.
- Data is stored under `$DSH_HOME/remote/servers/<origin-hash>/{host,client}`. Unix private keys must be `0600`.

- Harness 主机无需开放公网监听端口；Client 可以从任意可上网的地方通过双向端到端加密链路连接。
- Host/Client 使用长期 X25519 key + Noise IK 进行相互认证。
- ApiProxy 仅允许白名单方法（未命中即拒绝）。
- Workspace 选择器目录浏览仅返回元数据；可选的 File Viewer 预览只读、分块且继续执行 provider 授权。
- Remote 不开放直接 Shell、PTY、通用工具 RPC、远程桌面或直接文件修改 API。Harness 工具仍可以在 Host 原有权限控制下修改文件或运行命令。
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
dsh plugin --profile web add ds-harness-remote@0.3.31
```

npm / npm 包地址：<https://www.npmjs.com/package/ds-harness-remote>

Alternatively, install the pinned GitHub release in DSH Desktop or with the CLI:

也可以在 DSH Desktop 中安装固定版本的 GitHub Release，或使用命令行安装：

```text
github:liguobao/deepseek-harness-remote#v0.3.31
```

```sh
dsh plugin --profile web add "github:liguobao/deepseek-harness-remote#v0.3.31"
```

GitHub / 项目地址：<https://github.com/liguobao/deepseek-harness-remote>
