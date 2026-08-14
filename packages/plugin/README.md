# @dsh-remote/plugin

Dual-role DeepSeek Harness plugin for DSH Remote.

The package implements a controlled native `ApiProxy` tunnel, persistent host
identity and trusted peers, account-authorized Host registration/token rotation,
the outbound WebSocket control connection, pairing, Relay transport, and Noise
IK. It does not maintain a second Session/Event/Permission protocol. Unencrypted
business channels are not accepted.

The latest Server contract requires a site account token to authorize Host
registration. The DSH Remote card inside Settings → Plugins → Plugin configuration signs in over the local loopback control channel,
uses the temporary web token only for Host registration, then persists only the
device credential. Identities, credentials, and trusted peers are isolated by
normalized Server origin and Host/Client role. Anonymous Client bootstrap
remains supported by the Server contract.

The same package installs Host and Client browser capabilities. A single
Host/Client switch in the plugin options card selects the active role, while the
device display name is read from the machine hostname. The sidebar target
control can pair another machine, approve a local
pairing request, and switch the official Harness UI between Local and a paired
Remote Host. Native Harness calls and mux/host streams are tunneled through an explicit allowlist;
credentials, settings writes, arbitrary directory operations, native open
actions, attachments, and downloads remain local/disabled.

The bundle entry activates without blocking Harness startup. Its remote runtime
starts in an isolated Cordis dependency scope after `settings`, `apiProxy`, and
`connection` are available; profiles without those Web services keep running
with remote functionality inactive.

Identity state is stored under
`$DSH_HOME/remote/servers/<origin-hash>/{host,client}`. The private key is
created with mode `0600`; a damaged or overly permissive key is rejected
instead of silently replaced. Legacy single-Server state is not migrated
implicitly across origins.

Configure the deployed Server with either the Cordis plugin option or the
environment:

```sh
export DSH_REMOTE_SERVER=https://dsh.r2049.cn
```

The package ships `cordis.patch.yml` plus `dsh.bundle` and `dsh.client`
metadata, so the packed `.tgz` is an installable DSH bundle. The default patch
starts in the Host role and uses `https://dsh.r2049.cn`; the plugin options card
persists the selected role and Server in `$DSH_HOME/settings.yaml` and applies
them after restart.

For DSH Desktop GitHub installation, install the repository root with
`github:liguobao/deepseek-harness-remote#<tag-or-commit>`. Git dependencies are
installed as the root package `dsh-remote`, which carries an equivalent root bundle
manifest and committed Host/browser entries. This nested package remains the
npm publication and CI artifact boundary.

Android's earlier custom Remote RPC prototype is not a compatibility target for
this ApiProxy-only Plugin path.

After the control connection is online, a local Harness integration can call
`ctx.dshRemote.createPairing()`, inspect `pendingPairings()`, and finish the
local confirmation with `confirmPairing(pairingId, 'approve' | 'deny')`.
