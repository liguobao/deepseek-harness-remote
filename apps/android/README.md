# DSH Remote for Android

React Native / Expo SDK 57 client for controlling a trusted DeepSeek Harness host.

## Implemented MVP flow

- Configure and health-check a self-hosted Remote server, register the Android device, and rotate its access/refresh tokens in SecureStore.
- Generate a random Android client identity and keep its private key in Keystore-backed `expo-secure-store`.
- Claim an 8-character pairing code through the protocol v1 API, verify the Host fingerprint, wait for Host confirmation, and persist trusted Host public identities.
- Reconcile Server memberships with locally pinned Host keys, show trusted device presence, Host/Workspace metadata, sessions, and connection state.
- Send messages, consume streaming message/tool events, stop generation, and answer permission requests.
- Reconnect after Android network/app lifecycle changes.
- Establish a Noise IK channel over the Server relay and reject tampered, replayed, or wrong-identity frames.
- Register `react-native-webrtc` globals for native DataChannel support in a development build.

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

Android Emulator reaches a server on the development machine at `http://10.0.2.2:8080`. Cleartext HTTP is accepted only for `localhost`, `127.0.0.1`, and `10.0.2.2` by the client; production servers must use HTTPS/WSS.

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
  screens/   setup, pairing, devices, sessions, chat, settings
  services/  REST, secure storage, secure transport, RPC connection
  state/     Zustand store and event reducer
  ui/        tokens and reusable mobile components
```

The UI does not expose shell, filesystem, or arbitrary tool RPCs. Remote permission choices are sent back through `permissions.respond`; Host policy remains authoritative.
