# DSH Remote for Android

React Native / Expo SDK 57 client for controlling a trusted DeepSeek Harness host over the
[Remote Protocol v1](../../docs/protocol.md) ApiProxy / Typert Remote tunnel, including the optional
CodeX App Server domain advertised by the Host.

## Implemented flow

- Configure and health-check a Remote server (defaults to the official
  `https://dsh.r2049.cn`; override at build time with `EXPO_PUBLIC_DSH_REMOTE_SERVER`); sign in
  with the Server account once to register the Android device and rotate its access/refresh
  tokens in SecureStore.
- Generate a random Android client identity and keep its private key in Keystore-backed
  `expo-secure-store`.
- List same-account Harness hosts, fetch each host's authorized peer descriptor, verify its
  identity key, and pin it locally; a changed key fails closed and is never silently replaced.
- Establish a Noise IK channel over an adaptive transport (WebRTC P2P/TURN with Relay fallback) and
  reject tampered, replayed, or wrong-identity frames.
- Drive the Host through the rc.2 ApiProxy bridge or the v0.1.2 Typert Remote Gateway after
  encrypted capability probing:
  browse sessions (including archived ones), create sessions, stream live mux frames, send
  text/image prompts, cancel generation, page older history, switch the active model and its
  declared reasoning effort from the host's catalog, manage host workspaces (create with a
  read-only directory browser, rename, delete,
  reorder), and answer approval / question requests with the native `client-response` envelope.
- Select PNG/JPEG/WebP/GIF images from Android's system picker, preflight the Host-projected image
  limits, preview them in the composer, and carry large native `session.prompt` envelopes through
  the bounded `harness.api.transfer.*` path. Image processing and provider upload remain on the Host.
- When the Host advertises `codex.appserver.v1`, merge CodeX `project/list` roots into the workspace
  screen without creating local workspaces, show their allowlisted Threads as conversations, page
  `dsh/sessionHistory`, reduce live reasoning/plan/tool frames, send text or system-picker image
  prompts over `codex.app.*`, switch CodeX model/reasoning and fixed permission presets, interrupt
  the active turn, and answer one-time command/file approvals. CodeX workspaces remain read-only in
  Android because the Host's `project/list` is authoritative.
- Reconnect after Android network/app lifecycle changes. The connection transport can be
  pinned in Settings (Auto / TURN first / Relay only) and is applied on reconnect.
- Show the interface in English or Simplified Chinese, follow Android's current locale by default,
  and persist an explicit in-app language choice across launches.
- Show the installed app/build version and the complete open-source repository and latest-release
  addresses in Settings; both addresses open in the system browser.

The app does not run in Expo Go because WebRTC includes native code. Use a development build.

## Development

```bash
pnpm install
pnpm --filter @dsh-remote/android start
```

To generate and install the native Android development build:

```bash
pnpm --filter @dsh-remote/android android
```

The Android `start`, `android`, `ios`, and `build` commands rebuild the shared protocol, crypto,
WebRTC, and client-core packages first, then verify that the compiled client contains the
rc.2 ApiProxy, v0.1.2 Typert Remote, and CodeX Remote capability paths. This prevents Metro or Gradle from
silently packaging stale workspace `dist` files.

Android Emulator reaches a server on the development machine at `http://10.0.2.2:8080`. Cleartext
HTTP is accepted only for `localhost`, `127.0.0.1`, `10.0.2.2`, and private-network addresses
(RFC1918 LAN ranges, link-local, and CGNAT such as Tailscale) by the client; public addresses and
production servers must use HTTPS/WSS.

## Validation

```bash
pnpm --filter @dsh-remote/android check
pnpm --filter @dsh-remote/android test
NODE_ENV=production pnpm --filter @dsh-remote/android build
pnpm dlx expo-doctor@latest

cd apps/android
pnpm exec expo prebuild --platform android
cd android
./gradlew assembleDebug
```

## Structure

```text
src/
  lib/       URL validation and user-facing errors
  screens/   server sign-in, devices, sessions, chat, settings
  services/  REST, secure storage, secure transport, ApiProxy and CodeX clients
  state/     Zustand store plus Harness mux and CodeX frame reducers
  ui/        tokens and reusable mobile components
```

The UI does not expose shell, filesystem, or arbitrary tool RPCs. Every Harness action goes through
the Host's fixed ApiProxy or Typert Remote allowlist, and every CodeX action goes through the separate
fixed App Server method schemas; Host policy remains authoritative.
