# DSH Remote

[中文](README.md) | English

DSH Remote is a dual-role Desktop Plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It lets a local Harness securely connect to Harness on another machine through the official `ApiProxy`.

> [!WARNING]
> This project is in developer preview. It requires an external Server compatible with [Remote Protocol v1](docs/protocol.md), and production interoperability and an independent security review are not complete. Do not use it in production.

## Install and use

In DSH Desktop, open **Extensions → Manage plugins…** and install a pinned version:

```text
github:liguobao/deepseek-harness-remote#<tag-or-commit>
```

Restart Harness, then open **Settings → Plugins → Plugin configuration → DSH Remote**:

1. On the remote machine, select **Host**, enter the Server and site account credentials, and save. The password is used only for this HTTPS authorization and is not stored.
2. Restart the remote Harness and create a one-time authorization code in the sidebar.
3. On the local machine, select **Client**, enter the same Server and authorization code, and save.
4. Verify and approve the Client fingerprint on the Host. Restart the local Harness after pairing succeeds.
5. Select the Remote Host in the local sidebar. Select `This machine (Local)` to switch back.

Configuration is stored in the `dsh-remote` namespace of `$DSH_HOME/settings.yaml` and takes effect after restart. If the settings service is unavailable, use `DSH_REMOTE_SERVER` to override the default Server. Production deployments must use HTTPS/WSS.

## Security boundaries

- The Host makes outbound connections only and does not listen on a public port.
- Noise IK authenticates and encrypts business messages; the Server handles only accounts, pairing, presence, and Relay.
- The Client can access only explicitly allowed `ApiProxy` capabilities. It does not expose Shell, arbitrary files, remote desktop, or general Harness tool RPCs.
- Both Server membership and a local trusted peer on the Host are required.

The frozen Android prototype is not compatible with the current ApiProxy-only data plane.

## Documentation

- [Plugin guide](packages/plugin/README.md)
- [Protocol](docs/protocol.md) · [Server design](docs/server.md) · [Host integration](docs/plugin-integration.md)
- [Design documents](docs/design/README.md) · [Development tasks](TODO.md) · [Contribution guide](AGENTS.md)

## License

[MIT](packages/plugin/LICENSE)
