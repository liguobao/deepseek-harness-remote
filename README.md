# DeepSeek Harness Remote

English | [中文](README.zh.md)

## Connect once. Ready whenever you are.

Continue a DeepSeek Harness session from your phone, tablet, or any browser.

Return to the same Harness session from whichever device is with you. Harness keeps running on your work computer, with the same workspaces, tools, and project setup. Remote is simply another window into that environment.

> **Developer preview** — pin an explicit version when installing.

## What you can do

- Follow an active session and review its latest progress
- Send new instructions or change direction
- Answer questions and respond to permission requests
- Open workspaces from any connected computer
- Preview files from a remote workspace with the optional `dsh-file-viewer` plugin
- Move between devices without moving your work

Remote is available in a browser and through the **Remote** workspace entry in Harness on another computer.

A developer-preview VS Code client also lives in [`apps/vscode`](apps/vscode). It can sign in,
pin and connect to an authorized Host, browse Host workspaces/sessions, and open conversations beside the Activity Bar.
Build it with `pnpm --filter deepseek-harness-remote-vscode build`; see its [README](apps/vscode/README.md).

## Install the Host plugin

Install the plugin on the computer where Harness and your projects run.

In DSH Desktop, open **Extensions → Manage plugins…** and install:

```text
ds-harness-remote
```

Or install it for the `web` profile:

```sh
dsh plugin --profile web add ds-harness-remote
```

Package: [npm](https://www.npmjs.com/package/ds-harness-remote) · [GitHub](https://github.com/liguobao/deepseek-harness-remote)

To pin a GitHub release instead, install `github:liguobao/deepseek-harness-remote#v0.3.18`.

Restart Harness after installation.

The `0.3.18` Client remains compatible with `0.3.15` Hosts for Remote
workspaces and sessions. Features introduced later, such as the remote command
catalog and file viewing, are enabled only when the selected Host supports
them.

## Sign in and connect

1. Open **Remote** from the Harness sidebar.
2. Sign in with Zhihu authorization, or use your account and password. New password accounts can register with invitation code [NRAE-NUUM-C9UY](https://dsh.r2049.cn/app/register?invite_code=NRAE-NUUM-C9UY).
3. Enable remote control for the current computer to make it available from your other devices, or select another online computer to control it directly.
4. Choose an existing workspace or browse remote directories to open one.

> **Note:** A self-hosted relay node option will be provided later.

### A quick tour

Enable **Allow control of this device** in Remote settings to make the current computer available as a Host.

<p align="center">
  <img src="docs/images/setting.png" alt="Remote settings showing an authorized and online Host" width="520">
</p>

Open **Remote** on another computer, select an online Host, then choose or browse for a workspace.

<p align="center">
  <img src="docs/images/host-list.png" alt="Remote workspace picker listing online Hosts" width="900">
</p>

The workspace opens in the native Harness interface, with the active Host and encrypted connection status shown in the header.

<p align="center">
  <img src="docs/images/remote.png" alt="A Harness conversation running through an encrypted remote connection" width="900">
</p>

## Secure by design

- The Host makes outbound connections only. No public port is opened.
- Session traffic is end-to-end encrypted. The service relays ciphertext without storing session plaintext or device private keys.
- Remote exposes only the Harness capabilities required by the interface. It does not provide a shell or remote desktop.
- The workspace picker lists folders only. When `dsh-file-viewer` is installed on both devices, its existing read-only viewer can additionally preview files through bounded, encrypted range reads.
- Remote file preview cannot write, delete, upload, execute, or open a path in an external application. File Viewer providers continue to enforce their own allowed roots and locator authorization.
- Removing a device immediately revokes its Remote access.

For implementation details, see the [Plugin guide](packages/plugin/README.md), [documentation index](docs/README.md), and [Remote Protocol](docs/protocol.md).

## License

[MIT](packages/plugin/LICENSE)
