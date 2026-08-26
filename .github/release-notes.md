## English

This release includes changes since `v0.3.32` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.32...v0.3.33)).

- Ships Plugin `0.3.33`; Android remains at `0.3.32` (`versionCode 16`).
- Uses an isolated native WebRTC helper under Electron so DSH Desktop can choose direct P2P routes more reliably.
- Prefers direct ICE before TURN/Relay and reports the selected candidate path in connection details.
- Fixes desktop Remote progress so the final route shows the actual transport, such as `P2P`, instead of always ending on Relay.

## 中文

本版本包含自 `v0.3.32` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.32...v0.3.33)）。

- 发布 Plugin `0.3.33`；Android 保持 `0.3.32`（`versionCode 16`）。
- Electron 下使用隔离的 native WebRTC helper，让 DSH Desktop 更稳定地选择直连 P2P 路径。
- 优先尝试 direct ICE，再回落 TURN/Relay，并在连接详情中展示实际选中的 candidate path。
- 修正桌面 Remote 连接进度：最终显示真实 transport，例如 `P2P`，不再总是停在 Relay。
