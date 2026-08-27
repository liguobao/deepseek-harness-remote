## English

This release includes changes since `v0.3.33` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.33...v0.3.35)).

- Ships Plugin `0.3.35` and Android `0.3.35` (`versionCode 18`).
- Fixes desktop Remote connection progress so it only shows the first active probe group. Automatic connections now show `LAN -> P2P` while probing direct paths and finish with the actual selected transport, such as `Using P2P`, instead of advancing to TURN on a timer.
- Applies the same progress-route fix to the Android connection screen while keeping the full transport preference order for real negotiation and Host control-plane metadata.
- Fixes DSH Desktop startup after upgrading from legacy `dsh-remote` installs by moving the browser locale namespace to the canonical `ds-harness-remote` id.
- Adds startup migration for legacy loader entries named `dsh-remote` or `@dsh-remote/plugin`, disabling them once the canonical plugin is running.
- Adds a browser client singleton guard so duplicate loader entries cannot register duplicate locale, slot, or style contributions in one window.
- Clarifies the naming boundary: `@dsh-remote/protocol`, `@dsh-remote/crypto`, `@dsh-remote/webrtc`, and `@dsh-remote/client-core` remain internal workspace packages, not DSH loader/plugin ids. The user-visible package, Cordis instance, settings namespace, client module id, and locale namespace are all `ds-harness-remote`.
- Includes recent Android updates such as GitHub OAuth return handling, the chat stop action, and dark-mode support.
- Tolerates invalid native ICE `sdpMLineIndex` values during WebRTC signaling.

## 中文

本版本包含自 `v0.3.33` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.33...v0.3.35)）。

- 发布 Plugin `0.3.35` 和 Android `0.3.35`（`versionCode 18`）。
- 修正桌面 Remote 连接进度：只显示第一组正在真实探测的路径。自动连接现在会在直连探测时显示 `LAN -> P2P`，完成后显示实际选中的传输方式，例如 `已连接 P2P`，不再靠计时器提前跳到 TURN。
- Android 连接页应用同样的进度路径修正，同时真实协商和 Host 控制面元数据仍保留完整 transport 偏好顺序。
- 修复从旧版 `dsh-remote` 升级后 DSH Desktop 启动失败的问题：浏览器 locale namespace 已迁移到 canonical 的 `ds-harness-remote`。
- 启动时会自动迁移旧 loader entry：当发现 `dsh-remote` 或 `@dsh-remote/plugin` entry 时，在 canonical 插件启动后将其禁用。
- 增加浏览器 Client 单例保护，避免重复 loader entry 在同一个窗口里重复注册 locale、slot 或样式。
- 明确命名边界：`@dsh-remote/protocol`、`@dsh-remote/crypto`、`@dsh-remote/webrtc`、`@dsh-remote/client-core` 仍是内部 workspace 包，不是 DSH loader/plugin id。用户可见包名、Cordis instance、settings namespace、client module id 和 locale namespace 均为 `ds-harness-remote`。
- 包含近期 Android 更新，例如 GitHub OAuth 返回处理、聊天停止按钮和深色模式支持。
- WebRTC signaling 会容忍 native ICE 中异常的 `sdpMLineIndex` 值。
