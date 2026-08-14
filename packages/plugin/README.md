# @dsh-remote/plugin

Dual-role DeepSeek Harness plugin for DSH Remote.

The package implements the Harness adapter boundary, persistent host identity
and trusted peers, Server registration/token rotation, the outbound WebSocket
control connection, pairing, Relay transport, Noise IK, permission fail-closed
behavior, RPC routing, and event replay. Unencrypted business channels are not
accepted.

With the default `role: both`, the same package also installs a browser client
face. The sidebar target control can pair another machine, approve a local
pairing request, and switch the official Harness UI between Local and a paired
Remote Host. Native Harness calls are tunneled through an explicit allowlist;
credentials, settings writes, arbitrary directory operations, native open
actions, attachments, and downloads remain local/disabled.

```ts
export const inject = ['sessions', 'agents', 'approval']
```

The identity is stored under `$DSH_HOME/remote` (or `~/.dsh/remote`). The
private key is created with mode `0600`; a damaged or overly permissive key is
rejected instead of silently replaced.

Configure the deployed Server with either the Cordis plugin option or the
environment:

```sh
export DSH_REMOTE_SERVER=https://dsh.r2049.cn
```

The package ships `cordis.patch.yml` plus `dsh.bundle` and `dsh.client`
metadata, so the packed `.tgz` is an installable DSH bundle. The default patch
enables `role: both` and uses `https://dsh.r2049.cn`; override either value in
the profile when self-hosting.

For DSH Desktop GitHub installation, install the repository root with
`github:liguobao/deepseek-harness-remote#<tag-or-commit>`. Git dependencies are
installed from the root package, which carries an equivalent root bundle
manifest and committed Host/browser entries. This nested package remains the
npm publication and CI artifact boundary.

After the control connection is online, a local Harness integration can call
`ctx.dshRemote.createPairing()`, inspect `pendingPairings()`, and finish the
local confirmation with `confirmPairing(pairingId, 'approve' | 'deny')`.
