# @dsh-remote/plugin

Host-side DeepSeek Harness plugin for DSH Remote.

The package implements the Harness adapter boundary, persistent host identity
and trusted peers, Server registration/token rotation, the outbound WebSocket
control connection, pairing, Relay transport, Noise IK, permission fail-closed
behavior, RPC routing, and event replay. Unencrypted business channels are not
accepted.

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

After the control connection is online, a local Harness integration can call
`ctx.dshRemote.createPairing()`, inspect `pendingPairings()`, and finish the
local confirmation with `confirmPairing(pairingId, 'approve' | 'deny')`.
