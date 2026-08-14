# DSH Remote

[中文](README.md) | English

DSH Remote is a Desktop remote-access solution built on the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin system. The native Harness UI can switch between `Local` and a paired `Remote Host`; the Plugin forwards an allowlisted subset of the official `ApiProxy` instead of reimplementing the Harness session protocol.

It is not a remote desktop, Web Shell, SSH replacement, or general-purpose file manager. Clients cannot access arbitrary Shell, filesystem, or Harness tool RPCs.

> [!WARNING]
> This project is in developer preview and requires an external Server compatible with [Remote Protocol v1](docs/protocol.md). Cross-platform Noise IK conformance, an independent security review, and complete production interoperability are not finished. Do not use it in production.

## Features

- Switch between local and remote Hosts in the native Harness session UI
- Pair with a one-time device code and confirm the client fingerprint on the Host
- View, create, and control remote sessions through the official Harness UI and native mux/host streams
- Preserve native Harness `ApiProxy` approval and question request/response semantics
- Authenticate and encrypt business messages with Noise IK while the Server handles accounts, pairing, presence, and Relay
- Use the dual-role Desktop Plugin in Host or local Client mode

The Host only makes outbound connections and does not listen on a public port. Harness sessions, workspaces, prompts, and tool output remain on the Host. Both Server membership and a local trusted peer are required.

## Install and use

In DSH Desktop, open **Extensions → Manage plugins…** and install a pinned tag or commit:

```text
github:liguobao/deepseek-harness-remote#<tag-or-commit>
```

The installed plugin name is `dsh-remote`. Restart Harness, then open
**Settings → Plugins → Plugin configuration** and expand the **DSH Remote**
plugin options. A single Host/Client switch selects the role, and the device
name is read directly from the machine hostname.

Then:

1. On the remote machine, choose **Host**, enter the Server and site account credentials, then select **Save**. The password is used only for this HTTPS authorization and is never stored.
2. Restart the remote Harness and create a one-time authorization code in the sidebar.
3. On the local machine, choose **Client**, enter the same Server and authorization code, then select **Save**.
4. Verify and approve the Client fingerprint on the Host. After the local setup reports success, select **Exit** and restart Harness.
5. Select the paired Remote Host in the local sidebar. Select `This machine (Local)` to switch back.

Configuration is stored in the `dsh-remote` namespace in `$DSH_HOME/settings.yaml`
and takes effect after Harness restarts.

If the settings service is unavailable, override the default Server with an environment variable:

```bash
export DSH_REMOTE_SERVER=https://your-server.example.com
```

Production deployments must use HTTPS/WSS. Server, Remote Web, and Admin are implemented in a separate Server project; see the [Server design](docs/server.md) and [Host Plugin integration guide](docs/plugin-integration.md).

## Android

The Android prototype remains in the repository, but it has not migrated to the
ApiProxy-only data plane and is not a current supported or compatibility target.
The current priority is real Desktop Plugin installation and cross-machine E2E.

## Build from source

Node.js 22 and pnpm 9.15.4 are required:

```bash
pnpm install
pnpm --filter './packages/**' -r build
pnpm -r check
pnpm -r test
NODE_ENV=production pnpm -r build
```

## Documentation

- [Plugin guide](packages/plugin/README.md)
- [Remote Protocol v1](docs/protocol.md)
- [Design documents](docs/design/README.md)
- [Development tasks](TODO.md)
- [Contribution and repository guide](AGENTS.md)

## License

[MIT](packages/plugin/LICENSE)
