# Changelog

## 0.3.25

- Adds Android photo-picker image prompts with previews, Host-projected image
  limit checks, and bounded ApiProxy transfer for large encrypted requests.
- Keeps image-only prompts visible in Android chat history and preserves local
  previews while the native user event reconciles.
- Splits the Android adaptive icon into a transparent foreground mark and a
  system-masked background, removing the nested border on launcher icons.

## 0.3.24

- Adapts the Remote ApiProxy bridge to DeepSeek Harness `dsh-v0.1.1-rc.2`
  image prompts and Host-side image preprocessing / Files API reuse.
- Allows the native read-only `session.attachment` lookup so sent and
  historical session images can render on the Remote Client.
- Adds bounded, ordered, per-connection chunk transport for large native
  ApiProxy requests and responses without raising the 4 MiB secure-message
  limit or exposing a separate upload/filesystem API.

## 0.3.23

- Adds progress details while the DSH Client connects to a remote Host and
  opens a remote workspace.
- Verifies installation and plugin loading against DeepSeek Harness
  `dsh-v0.1.1-rc.1`.
- Updates local DSH development peers to `0.1.1-rc.1` while keeping the
  published peer range compatible with older DSH builds.

## 0.3.22

- Adds provider-aware GitHub and Zhihu QR sign-in while keeping password
  sign-in available.
- Uses version tags as GitHub Release titles.

## 0.3.21

- Opens the workspace selected in the Remote picker instead of leaving the
  local workspace active.
- Includes the latest Android connection and chat stability fixes and
  deterministic client RPC termination errors.

## 0.3.19

- Namespaces the plugin's loopback Web RPC route as `/ds-harness-remote` so it can run
  alongside Remote Web UI plugins that own the public `/remote` route.

## 0.3.18

- Restores compatibility with legacy `0.3.15` Hosts: Remote workspaces and
  sessions continue to load, while the unsupported remote command catalog
  degrades to an empty compatibility catalog.
- Enables remote file viewing only when the selected Host version supports
  `fileviewer.read.v1`; legacy and unknown Hosts keep the provider disabled.
- Adds bounded, read-only remote file preview through `dsh-file-viewer` for
  compatible Hosts. Writes, uploads, execution, and `openExternal` remain
  unavailable.
- Adds detailed LAN/P2P/TURN/Relay connection-path diagnostics to the Remote
  header.

`0.3.17` was withdrawn because its Client could forward `commands.list` and
register the remote file provider against older Hosts without a compatibility
fallback.
