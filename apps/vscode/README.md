# DS Harness Remote for VS Code

DeepSeek Remote client for VS Code. It connects to a DeepSeek Harness Host through
the DS Harness Remote Server, using same-account device membership, a pinned Host
identity key, Noise IK encryption, and the Host's allowlisted native `ApiProxy` bridge.
For Harness `dsh-v0.1.2-alpha.1`–`alpha.2`, it uses the allowlisted Typert Remote Gateway carrier instead.

VS Code 版 DeepSeek 远程连接客户端。通过 DS Harness Remote Server 安全连接远端
DeepSeek Harness Host，并使用同账号设备授权、Host 身份固定、Noise IK 加密和原生
`ApiProxy` 白名单桥接。连接 Harness `dsh-v0.1.2-alpha.1`–`alpha.2` Host 时会改用 Typert Remote
Gateway carrier。

## Features

- Sign in with Zhihu QR authorization or account and password.
- See Host presence directly and browse `Host → Workspace → Session`.
- Open a conversation preview in an editor beside the Host list.
- Send prompts, switch models and permission presets, and answer approval requests.
- Use adaptive LAN / P2P / TURN / Relay transport with end-to-end encryption.
- Keep credentials and the client private key in VS Code SecretStorage.

> **Developer preview:** live streaming, automatic reconnect, and question response
> UI are still in progress for the VS Code client.

The Server defaults to `https://dsh.r2049.cn`. Open **DS Harness Remote** from the
Activity Bar, sign in, then choose an online Host. Opening a Session shows its
conversation in an editor beside the Host list.

The remote computer must first install and enable the
[`ds-harness-remote`](https://www.npmjs.com/package/ds-harness-remote) plugin in
DeepSeek Harness. The Host plugin and this VS Code client must sign in to the same
account before the Host can appear in the device list.

远端电脑必须先在 DeepSeek Harness 中安装并启用
[`ds-harness-remote`](https://www.npmjs.com/package/ds-harness-remote) 插件；远端 Host
插件与 VS Code 客户端还必须登录同一账号，设备才会出现在列表中。

The current extension version is `0.3.17`. Cross-machine Extension Host testing is still
in progress; use the current `ds-harness-remote` Host plugin while developing and testing it.

## Development

```bash
pnpm install
pnpm --filter deepseek-harness-remote-vscode check
pnpm --filter deepseek-harness-remote-vscode build
```

Press `F5` from this folder with the recommended launch configuration, or run
`pnpm --filter deepseek-harness-remote-vscode package` to create a VSIX.

Override `dshRemote.serverUrl` only for self-hosted development.

Credentials and the client private key are stored only in VS Code SecretStorage.
Host trust pins are retained in extension global state. The extension does not
provide shell, file-content, write, desktop, or general tool RPC access.
