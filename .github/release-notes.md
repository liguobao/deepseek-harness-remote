## English

This release includes changes since `v0.4.0` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.4.0...v0.4.1)).

- Ships Plugin `0.4.1` and Android `0.4.1` (`versionCode 21`).
- Fixes the Host `transport.selected` / Noise handshake race that could bind peers to different WebRTC and Relay paths and disconnect an otherwise healthy direct connection.
- Restores native `@roamhq/wrtc` loading from pnpm-linked DSH profiles on Windows, macOS, and Linux.
- Correctly identifies private, address-hidden `host`/`prflx` paths as LAN while retaining public peer-reflexive paths as P2P.
- Keeps alpha.1 `dynamicCordisRunner/*` calls local and refreshes Android route progress, selected-path highlighting, and compiled workspace verification.

## 中文

本版本包含自 `v0.4.0` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.4.0...v0.4.1)）。

- 发布 Plugin `0.4.1` 和 Android `0.4.1`（`versionCode 21`）。
- 修复 Host `transport.selected` 与 Noise 握手竞态，避免两端分别绑定 WebRTC 和 Relay 后断开正常直连。
- 恢复 Windows、macOS 和 Linux 上 pnpm 链接 DSH profile 中的原生 `@roamhq/wrtc` 加载。
- 正确把私网、地址隐藏的 `host`/`prflx` 路径识别为 LAN，同时保持公网 peer-reflexive 路径为 P2P。
- 保持 alpha.1 `dynamicCordisRunner/*` 调用在本机执行，并更新 Android 路径进度、最终路径高亮和 workspace 编译校验。
