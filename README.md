<p align="center">
  <img src="docs/logo.svg" alt="DeepSeek Harness Remote" width="600">
</p>

<p align="center">
  <strong>English</strong>
  &nbsp;·&nbsp;
  <a href="README.zh.md">中文</a>
  &nbsp;·&nbsp;
  <a href="docs/README.md">Documentation</a>
  &nbsp;·&nbsp;
  <strong>Download:</strong>
  <a href="https://github.com/liguobao/dsh-desktop/releases/latest">Windows</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/liguobao/dsh-desktop/releases/latest">macOS</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/liguobao/dsh-desktop/releases/latest">Linux</a>
  &nbsp;·&nbsp;
  <a href="https://dsh.r2049.cn/app">Web</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/liguobao/deepseek-harness-remote/releases/latest">Android</a>
</p>

## Connect once. Ready whenever you are.

Continue using your DeepSeek Harness instance from a phone, computer, or browser.

Return to the same Harness session from whichever device is with you. Harness keeps running on your work computer, with the same workspaces, tools, and project setup. Remote is simply another window into that environment.

## Features

- Continue active sessions and review their latest progress from another device
- Send new instructions, change direction, and use image prompts with Harness `dsh-v0.1.1-rc.2`
- Answer questions and permission requests from clients with live conversation controls
- Open workspaces from another authorized computer on the same account
- Reuse the native Harness interface instead of maintaining a separate desktop conversation UI
- Preview remote files between two Harness installations with the optional `dsh-file-viewer` plugin
- The Harness Host does not need a public listening port. Connect securely from anywhere with internet access over a bidirectional end-to-end encrypted channel

## Install

### Path A: DSH Desktop

Install [DSH Desktop](https://github.com/liguobao/dsh-desktop) on Windows, macOS, or
Linux. Remote is included and enabled by default, so no separate plugin installation is required.

### Path B: Existing DSH installation

Install the exact npm version for the `web` profile:

```sh
dsh plugin --profile web add ds-harness-remote@0.3.29
```

Package: [npm](https://www.npmjs.com/package/ds-harness-remote) · [GitHub](https://github.com/liguobao/deepseek-harness-remote)

Restart Harness after installation.

## Quick start

1. Open **Remote** from the Harness sidebar.
2. Sign in with a GitHub or Zhihu QR code, or use your account and password. New password accounts can register through [Remote Web](https://dsh.r2049.cn/app/register); the site shows the current invitation requirements.
3. Enable remote control for the current computer.
4. On another device, open DSH Desktop, Remote Web, or the Android client and sign in to the same account.
5. Select the online Host, then choose an existing workspace or browse remote directories to open one.

The public service currently uses the hosted Remote relay. A supported self-hosted relay
option is not available yet.

## Screenshots

### Desktop

Enable **Allow control of this device** in Remote settings to make the current computer
available as a Host.

<p align="center">
  <img src="docs/images/setting.png" alt="Remote settings showing an authorized and online Host" width="520">
</p>

On another computer, select an online Host and open one of its workspaces.

<p align="center">
  <img src="docs/images/host-list.png" alt="Remote workspace picker listing online Hosts" width="900">
</p>

The workspace opens in the native Harness interface, with the active Host and encrypted
connection status shown in the header.

<p align="center">
  <img src="docs/images/remote.png" alt="A Harness conversation running through an encrypted remote connection" width="900">
</p>

### Android

Download the latest Android APK from [GitHub Releases](https://github.com/liguobao/deepseek-harness-remote/releases/latest).

Sign in to the Android client with your existing account, select an available computer,
open a workspace, and continue the conversation with text or image prompts.

<p align="center">
  <img src="docs/images/mobile-list.jpg" alt="Android client listing online and offline computers" width="30%">
  <img src="docs/images/image-msg.jpg" alt="Sending an image prompt from the Android client" width="30%">
  <img src="docs/images/image-result.jpg" alt="Viewing the image response in the Android client" width="30%">
</p>

## How it works

```text
DSH Desktop / Remote Web / Android
  ↔ authenticated, end-to-end encrypted channel
Remote Plugin on the Host
  ↔ allowlisted native Harness API
Harness sessions, tools, and workspaces
```

The Harness Host does not need a public listening port. You can connect from
anywhere with internet access, and Remote communicates over a bidirectional end-to-end encrypted channel.
It switches the client to the selected Host's native Harness API, so the original workspace,
tools, and permission flow remain on that computer. Every settings namespace currently
registered by the Host can also be configured remotely through the official Harness settings
API. Credential values remain write-only, and Host-local document/open actions are never exposed.

## Security

- Session traffic is end-to-end encrypted. The service relays ciphertext without storing session plaintext or device private keys.
- Server membership and the Host's locally pinned peer identity must both authorize a connection.
- Remote does not expose a direct shell, PTY, general tool RPC, or remote desktop. Harness tools may still modify files or run commands on the Host under Harness's normal permission controls.
- The workspace picker lists folders only and returns bounded, read-only directory metadata.
- Optional File Viewer access is limited to authenticated, encrypted range reads and continues to enforce provider root and locator authorization.
- Remote file preview cannot write, delete, upload, execute, or open a path in an external application.
- Removing a device revokes its credentials, membership, and active Remote connections.

## Compatibility

Compatible with DeepSeek Harness `dsh-v0.1.1-rc.2`.

## Documentation

- [Plugin guide](packages/plugin/README.md)
- [Documentation index](docs/README.md)
- [Remote Protocol](docs/protocol.md)
- [Development status and roadmap](TODO.md)

## Links

- Community acknowledgement: this project recognizes and supports the [LINUX DO](https://linux.do/) community.
- Related project by the author: [Cyber Liu Kanshan](https://kanshan.r2049.cn/)

## Project status and trademarks

This is an independent community project and is not an official DeepSeek product.
DeepSeek and related names and marks belong to their respective owners.

## License

[MIT](packages/plugin/LICENSE)
