# @dsh-remote/plugin

Host-side DeepSeek Harness plugin for DSH Remote.

The current package implements the Harness adapter boundary, persistent host
identity and trusted peers, permission fail-closed behavior, RPC routing, and
event replay. An authenticated Noise IK connection provider can attach through
the exported `dshRemote` runtime service; unencrypted business channels are not
accepted.

```ts
export const inject = ['sessions', 'agents', 'approval']
```

The identity is stored under `$DSH_HOME/remote` (or `~/.dsh/remote`). The
private key is created with mode `0600`; a damaged or overly permissive key is
rejected instead of silently replaced.
