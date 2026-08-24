# Changelog

## 0.3.30

- Lets authenticated Remote clients configure every settings namespace
  currently registered by the Host through the official Harness ApiProxy,
  including plugin settings and global credential references.
- Keeps configuration writes bounded and fail-closed: unknown namespaces are
  rejected, credential values remain write-only, and Host-local
  `settings.openDocument` stays unavailable remotely.
- Adds remote model-provider configuration and draft endpoint discovery while
  sanitizing discovery failures so submitted keys and endpoints cannot be
  echoed back through adapter errors.
- Adds a lightweight Chrome/Edge MV3 launcher that exchanges existing Web
  authorization for isolated Browser credentials, lists online Hosts, and
  opens the selected Host in Remote Web.
- Hardens VS Code disconnect and sign-out state, including serialized auth
  transitions and revocation with the latest rotated device credentials.
- Makes pull-request file inspection fail closed and limits Android APK builds
  to relevant changes.
- Advances the Plugin and Android app to `0.3.30` (`versionCode 14`).

## 0.3.29

- Keeps the Android conversation smooth while a reply streams: scrolling now
  follows streaming text at a throttled, non-animated cadence, and memoized
  chat rows stop unchanged messages from re-rendering on every delta, so back
  navigation and the keyboard stay responsive during long replies.
- Makes the Android workspace folder picker scrollable so deep project
  directories can be browsed, and removes the workspace subtitle for a
  cleaner header.
- Shows the Harness and plugin versions next to each Android device row
  (platform + DSH version + plugin version) and shortens the Windows label to
  `Win`.
- Advances the Android app to `0.3.29` (`versionCode 13`).

## 0.3.28

- Redesigns the Android device flow with a dedicated connection-progress page,
  clearer device/workspace navigation, a refreshed startup screen, and separate
  More, Settings, and About destinations.
- Adds in-app update checks with APK download/install handoff and progress
  feedback from the Android More screen.
- Renders reasoning as a compact, collapsed disclosure while it streams and
  after completion, tightens tool activity spacing, and fixes composer sizing
  when the Android keyboard opens or closes.
- Adds an offline refresh action to the conversation header. It reconnects the
  secure channel, reloads the current session baseline, and resumes in place
  without leaving the conversation.
- Aligns the Android app version with the GitHub Release at `0.3.28` while
  advancing its Android install sequence to `versionCode 12`, so in-app update
  comparisons remain accurate.

## 0.3.27

- Adds English and Simplified Chinese Android interfaces with a persistent
  in-app language selector and an option to follow Android's current locale.
- Localizes Android screens, status labels, dates, validation, and client-side
  connection errors, and declares both locales to Android's native app settings.
- Adds current Android device-list and image-prompt screenshots.
- Updates the Android app to `0.3.11` (`versionCode 11`).

`v0.3.27` supersedes `v0.3.26`; the previous Release and tag were withdrawn so
the Android localization and preceding fixes ship in one consolidated release.

## 0.3.26

- Adds an Android About & Updates section with the installed app/build version,
  the full open-source repository URL, and the latest GitHub Release URL.
- Keeps plugin-injected instructions and other model-facing context out of the
  Android transcript by requiring the authoritative human `source.kind = user`
  marker for both historical and live `user/message` events.
- Updates the Android app to `0.3.10` (`versionCode 10`).

`0.3.25` was withdrawn before `0.3.26` because
Android could display plugin-injected model context as user conversation rows.

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
