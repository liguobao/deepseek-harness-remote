## English

This release includes changes since `v0.3.36` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.36...v0.4.1)).

- Ships Plugin `0.4.1` and Android `0.4.1` (`versionCode 21`).
- Replaces the withdrawn `v0.4.0`; users of that version should upgrade to `0.4.1`.
- Adds DeepSeek Harness `dsh-v0.1.2-alpha.1` Desktop support through the official Typert Remote Gateway while retaining the `dsh-v0.1.1-rc.2` ApiProxy path.
- Adds encrypted Host capability discovery, alpha unary/stream/event routing, bounded large-envelope transfers, and a fixed fail-closed endpoint allowlist.
- Keeps rc.2 Clients compatible with older rc.2 Hosts through the legacy capability fallback, while rejecting mixed alpha.1/rc.2 Desktop generations before native UI switching or Workspace mutation.
- Fixes the Host `transport.selected` / Noise handshake race that could bind peers to different WebRTC and Relay paths and disconnect an otherwise healthy direct connection.
- Restores native `@roamhq/wrtc` loading from pnpm-linked DSH profiles on Windows, macOS, and Linux.
- Correctly identifies private, address-hidden `host`/`prflx` paths as LAN while retaining public peer-reflexive paths as P2P.
- Keeps alpha.1 `dynamicCordisRunner/*` calls local and refreshes Android route progress, selected-path highlighting, and compiled workspace verification.

## 中文

本版本包含自 `v0.3.36` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.36...v0.4.1)）。

- 发布 Plugin `0.4.1` 和 Android `0.4.1`（`versionCode 21`）。
- 替代已撤回的 `v0.4.0`；正在使用该版本的用户应升级到 `0.4.1`。
- 新增 DeepSeek Harness `dsh-v0.1.2-alpha.1` Desktop 支持，使用官方 Typert Remote Gateway，同时保留 `dsh-v0.1.1-rc.2` ApiProxy 路径。
- 新增加密 Host capability 探测、alpha unary/stream/event 转发、受限大 envelope 分块和固定 fail-closed endpoint allowlist。
- 保持 rc.2 Client 通过 legacy capability 降级连接旧 rc.2 Host，并在切换原生 UI 或修改 Workspace 前拒绝 alpha.1/rc.2 混连。
- 修复 Host `transport.selected` 与 Noise 握手竞态，避免两端分别绑定 WebRTC 和 Relay 后断开正常直连。
- 恢复 Windows、macOS 和 Linux 上 pnpm 链接 DSH profile 中的原生 `@roamhq/wrtc` 加载。
- 正确把私网、地址隐藏的 `host`/`prflx` 路径识别为 LAN，同时保持公网 peer-reflexive 路径为 P2P。
- 保持 alpha.1 `dynamicCordisRunner/*` 调用在本机执行，并更新 Android 路径进度、最终路径高亮和 workspace 编译校验。
