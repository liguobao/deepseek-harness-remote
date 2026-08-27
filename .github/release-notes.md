## English

This release replaces `v0.3.35` and includes changes since `v0.3.32` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.32...v0.3.36)).

- Ships Plugin `0.3.36` and Android `0.3.36` (`versionCode 19`).
- Fixes legacy desktop plugin startup, QR login completion, and duplicate client registration.
- Improves desktop and Android connection progress so direct probing shows the real LAN/P2P path and finishes with the selected transport.
- Adds desktop Remote Host refresh and clearer Android transport labels.
- Raises remote File Viewer Save As to 1 GiB on LAN/P2P; TURN, Relay, disconnected, and unknown routes stay at 100 MiB.

## 中文

本版本取代 `v0.3.35`，包含自 `v0.3.32` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.32...v0.3.36)）。

- 发布 Plugin `0.3.36` 和 Android `0.3.36`（`versionCode 19`）。
- 修复旧版桌面插件升级启动、扫码登录完成竞态和重复 Client 注册问题。
- 改进桌面与 Android 连接进度：直连探测显示真实 LAN/P2P 路径，完成后显示实际选中的传输方式。
- 增加桌面 Remote Host 刷新，并优化 Android 传输路径文案。
- 远端 File Viewer 在 LAN/P2P 下 Save As 上限提升到 1 GiB；TURN、Relay、断开和未知路径仍保持 100 MiB。
