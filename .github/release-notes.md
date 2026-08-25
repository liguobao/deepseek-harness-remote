## English

This release includes changes since `v0.3.30` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.30...v0.3.31)).

### Connection visibility

- Remote Client connection progress now shows the LAN, P2P, TURN, and Relay probe sequence while opening a Host.
- Desktop connection details display the preferred transport order with localized labels.
- Android connection progress and device details show the same probe order before the secure channel is ready.

### File Viewer

- Remote File Viewer Save As is now offered only on LAN, P2P, and TURN routes; Relay and disconnected routes keep Save As disabled while preview reads remain bounded and read-only.

### Compatibility and artifacts

- Ships Plugin `0.3.31` and Android `0.3.31` (`versionCode 15`).
- Remote workspaces and sessions remain compatible with `0.3.15` Hosts; newer settings, file-viewer, command-catalog, and transfer capabilities remain gated by Host support.

## 中文

本版本包含自 `v0.3.30` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.30...v0.3.31)）。

### 连接可见性

- Remote Client 连接 Host 时会在进度中展示 LAN、P2P、TURN 与 Relay 的探测顺序。
- 桌面连接详情会用本地化标签展示首选传输顺序。
- Android 连接进度和设备详情也会显示同一组探测顺序。

### File Viewer

- 远端 File Viewer 的另存为只在 LAN、P2P 和 TURN 线路上启用；Relay 与断开状态会禁用另存为，同时预览读取仍保持有界只读。

### 兼容性与产物

- 发布 Plugin `0.3.31` 与 Android `0.3.31`（`versionCode 15`）。
- 远端 Workspace 与会话继续兼容 `0.3.15` Host；较新的设置、文件查看、命令目录和分块传输能力仍按 Host 支持情况启用。
