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
  <a href="https://github.com/liguobao/ds-harness-remote/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ds-harness-remote">npm</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/liguobao/ds-harness-remote">GitHub</a>
  &nbsp;·&nbsp;
  <a href="https://dshfind.com/zh/plugins/liguobao/ds-harness-remote?ref=badge"><img src="https://dshfind.com/api/badge/liguobao/ds-harness-remote?metric=downloads&amp;lang=zh" alt="dshfind downloads" width="137" height="20" align="absmiddle"></a>
</p>

## Connect once. Ready whenever you are.

Continue using your DeepSeek Harness instance from a phone, computer, or browser.

Return to the same Harness session from whichever device is with you. Harness keeps running on your work computer, with the same workspaces, tools, and project setup. Remote is simply another window into that environment.

## Features

- Continue active sessions and review their latest progress from another device
- Send new instructions, change direction, and use image prompts with Harness `dsh-v0.1.1-rc.2` or `dsh-v0.1.2-alpha.1`–`alpha.2`
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
dsh plugin --profile web add ds-harness-remote@0.4.2
```

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

Download the latest Android APK from [GitHub Releases](https://github.com/liguobao/ds-harness-remote/releases/latest).

Sign in to the Android client with your existing account, select an available computer,
open a workspace, and continue the conversation with text or image prompts. The conversation
toolbar also lets you switch the active model and choose any reasoning effort declared by it.

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
  ↔ allowlisted native Harness API or optional CodeX App Server domain
Harness sessions/workspaces or CodeX Threads/projects
```

## Experimental Codex virtual workspaces

Codex is an optional domain inside the same Remote Plugin. After connecting to a Host, the normal
Remote workspace picker can also show CodeX working directories. Selecting one switches the existing
DSH Workspace/Session data plane to an in-memory virtual carrier: CodeX threads appear as Sessions,
and their history and live frames are projected into native DSH Session events. The existing DSH
workspace list, conversation renderer, composer, tool cards, and approval UI remain responsible for
the interface; there is no separate CodeX page. The native Session permission control can switch
between `Workspace write` and explicitly confirmed `Full access`. CodeX accepts text plus PNG, JPEG,
WebP, or GIF image prompts from Desktop clipboard paste or Android's system image picker over the
bounded encrypted transfer path. General file attachments are not exposed.

Android consumes the same authenticated `codex.app.*` carrier directly after capability discovery.
It merges CodeX projects into its existing workspace screen, keeps those project rows read-only,
and reuses the mobile conversation, model, permission, image, tool, interrupt, and approval controls.
The Android state is also an in-memory display projection; it never creates a second CodeX data store.

The live projection covers assistant/reasoning/plan deltas, command and file output, file-change
summaries, MCP progress, thread status, and model reroutes. Web Search, Subagent, Image, Compaction,
and Review Mode items reuse native tool cards. Large live tool output is kept in a bounded in-memory
window, while file patch events expose only paths and change kinds rather than forwarding raw diffs as
Workspace file content.

Native Workspace creation starts a Thread in the selected CodeX project root and keeps an empty Thread
attached until it becomes visible in the App Server listing. The Host pages History on DSH message
boundaries with `beforeSeq` / `maxMessages` before transfer; the Client searches the visible Thread
title, preview, directory, and identifier locally.

This is a presentation adapter, not an import. The virtual Workspace/Session records are never written
to DSH SessionStore, workspace storage, or Harness logs. CodeX App Server remains the source of truth,
and `project/list` is the only source of truth for visible CodeX Workspaces. Create, rename, archive,
prompt, interrupt, and approval actions are routed back to its allowlisted methods. The Host carrier
still uses the existing account membership, pinned Host identity, Noise channel, and adaptive transport.
CodeX is disabled by default. Real encrypted cross-machine turn/approval testing on Desktop and
Android is still pending.

```yaml
ds-harness-remote:
  codex:
    enabled: true
    binary: codex
```

`binary` must resolve to a Codex CLI that provides `codex app-server`. With the default `codex` value
on macOS, the Plugin first tries the current ChatGPT app's bundled Codex and then falls back to
`PATH`; an explicitly configured binary is always used as-is. Existing installs using the former
`dsh-remote` settings namespace are copied once into `ds-harness-remote` without deleting the legacy
section.

The Harness Host does not need a public listening port. You can connect from
anywhere with internet access, and Remote communicates over a bidirectional end-to-end encrypted channel.
It switches the client to the selected Host's native Harness API, so the original workspace,
tools, and permission flow remain on that computer. Every settings namespace currently
registered by the Host can also be configured remotely through the official Harness settings
API. Credential values remain write-only, and Host-local document/open actions are never exposed.

## End-to-end encryption

Harness business traffic is encrypted on the Client and decrypted only by the selected Host using
the fixed `Noise_IK_25519_ChaChaPoly_SHA256` suite. Account membership and locally pinned device
identity keys must both authorize a connection. The service can route connections and observe
network metadata, but it cannot read session messages, prompts, tool output, workspace paths, or
File Viewer content. See [End-to-end encryption](docs/end-to-end-encryption.md) for the handshake,
key lifecycle, visible metadata, replay protection, and security limits.

## Network and transport

The Host opens outbound connections only; it does not listen on a public port or require router
port forwarding. Remote negotiates `LAN -> P2P -> TURN -> Relay`, falling back to the encrypted
WebSocket Relay when WebRTC is unavailable or cannot connect. Every path carries the same Noise
ciphertext and keeps the same Host/Client identity boundary. See [Network and transport](docs/network.md)
for the topology, control and data planes, NAT behavior, fallback, reconnect semantics, and current
validation status.

## Security

- Session traffic is end-to-end encrypted. The service relays ciphertext without storing session plaintext or device private keys.
- Server membership and the Host's locally pinned peer identity must both authorize a connection.
- Remote does not expose a direct shell, PTY, general tool RPC, or remote desktop. Harness tools may still modify files or run commands on the Host under Harness's normal permission controls.
- The workspace picker lists folders only and returns bounded, read-only directory metadata.
- Optional File Viewer access is limited to authenticated, encrypted range reads and continues to enforce provider root and locator authorization.
- Remote file preview cannot write, delete, upload, execute, or open a path in an external application.
- Codex Remote is opt-in, exposes only CodeX `project/list` Workspaces, and rejects raw shell/process/config App Server methods.
- Removing a device revokes its credentials, membership, and active Remote connections.

## Compatibility

**Breaking change notice:** Plugin `0.4.1` removes the earlier experimental
Remote business RPC surface (`sessions.*`, `session.*`, `permissions.respond`,
`sync.from`). Harness session traffic now only uses the official rc.2
`ApiProxy` or the alpha Typert Remote Gateway, and this plugin does not provide
an adapter or wire-format translation for the old RPC surface.

Plugin `0.4.2` supports DeepSeek Harness `dsh-v0.1.1-rc.2` through the legacy
official `ApiProxy`, and `dsh-v0.1.2-alpha.1`–`alpha.2` through the
official Typert Remote Gateway. A `0.4.2` Client running rc.2 remains compatible
with older rc.2 Hosts through the legacy capability fallback.

Both Desktop endpoints must use the same Harness transport generation. Plugin
`0.4.x` does not translate rc.2 and alpha business models: an alpha Client
cannot open an rc.2 Host, and an rc.2 Client cannot open an alpha Host. Mixed
connections are rejected before switching the native UI or mutating a Workspace.

## Documentation

- [Plugin guide](packages/plugin/README.md)
- [Documentation index](docs/README.md)
- [End-to-end encryption](docs/end-to-end-encryption.md)
- [Network and transport](docs/network.md)
- [Remote Protocol](docs/protocol.md)
- [Development status and roadmap](TODO.md)

## Links

- Friendly link: [LINUX DO](https://linux.do/)
- Friendly link: [Cyber Liu Kanshan](https://kanshan.r2049.cn/)

## Project status and trademarks

This is an independent community project and is not an official DeepSeek product.
DeepSeek and related names and marks belong to their respective owners.

## License

[MIT](packages/plugin/LICENSE)
