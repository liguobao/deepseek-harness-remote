# DSH Remote for Android

React Native / Expo SDK 57 client for controlling a trusted DeepSeek Harness host over the
[Remote Protocol v1](../docs/protocol.md) ApiProxy tunnel.

## Implemented flow

- Configure and health-check a self-hosted Remote server; sign in with the Server account once to
  register the Android device and rotate its access/refresh tokens in SecureStore.
- Generate a random Android client identity and keep its private key in Keystore-backed
  `expo-secure-store`.
- List same-account Harness hosts, fetch each host's authorized peer descriptor, verify its
  identity key, and pin it locally; a changed key fails closed and is never silently replaced.
- Establish a Noise IK channel over an adaptive transport (WebRTC P2P/TURN with Relay fallback) and
  reject tampered, replayed, or wrong-identity frames.
- Drive the Host's ApiProxy bridge through `harness.api.call/respond/stream.open/stream.close`:
  browse sessions, stream live mux frames, send prompts, cancel generation, and answer approval /
  question requests with the native `client-response` envelope.
- Reconnect after Android network/app lifecycle changes.

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

Android Emulator reaches a server on the development machine at `http://10.0.2.2:8080`. Cleartext
HTTP is accepted only for `localhost`, `127.0.0.1`, and `10.0.2.2` by the client; production
servers must use HTTPS/WSS.

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
  services/  REST, secure storage, secure transport, ApiProxy tunnel client
  state/     Zustand store and mux-frame reducer
  ui/        tokens and reusable mobile components
```

The UI does not expose shell, filesystem, or arbitrary tool RPCs. Every Harness action goes through
the Host's fixed ApiProxy allowlist; Host policy remains authoritative.
